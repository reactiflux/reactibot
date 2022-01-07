import {
  MessageReaction,
  Message,
  GuildMember,
  TextChannel,
  Guild,
} from "discord.js";
import cooldown from "./cooldown";
import { ChannelHandlers } from "../types";
import { CHANNELS, ReportReasons } from "../constants";
import { constructLog, simplifyString } from "../helpers/modLog";
import { isStaff } from "../helpers/discord";
import { partition } from "../helpers/array";

const AUTOBAN_SPAM_THRESHOLD = 5;
const config = {
  // This is how many ️️warning reactions a post must get until it's considered an official warning
  warningThreshold: 1,
  // This is how many ️️warning reactions a post must get until mods are alerted
  thumbsDownThreshold: 2,
  // This is how many ️️warning reactions a post must get the message is deleted
  deletionThreshold: Infinity,
};

const warningMessages = new Map<
  string,
  { warnings: number; message: Message }
>();

const thumbsDownEmojis = ["👎", "👎🏻", "👎🏼", "👎🏽", "👎🏾", "👎🏿"];

type ReactionHandlers = {
  [emoji: string]: (args: {
    guild: Guild;
    logChannel: TextChannel;
    reaction: MessageReaction;
    message: Message;
    reactor: GuildMember;
    author: GuildMember;
    usersWhoReacted: GuildMember[];
  }) => void;
};

const handleReport = (
  reason: ReportReasons,
  channelInstance: TextChannel,
  reportedMessage: Message,
  logBody: string,
) => {
  const simplifiedContent = `${reportedMessage.author.id}${simplifyString(
    reportedMessage.content,
  )}`;
  const cached = warningMessages.get(simplifiedContent);

  if (cached) {
    // If we already logged for ~ this message, edit the log
    const { message, warnings: oldWarnings } = cached;
    const warnings = oldWarnings + 1;

    let finalLog = logBody;
    // If this was a mod report, increment the warning count
    if (reason === ReportReasons.mod) {
      finalLog = logBody.replace(/warned \d times/, `warned ${warnings} times`);
    }

    message.edit(finalLog);
    warningMessages.set(simplifiedContent, { warnings, message });

    if (warnings >= AUTOBAN_SPAM_THRESHOLD) {
      reportedMessage.guild?.members
        .fetch(reportedMessage.author.id)
        .then((member) => {
          member.ban({ reason: "Autobanned for spamming" });
          channelInstance.send(
            `Automatically banned <@${reportedMessage.author.id}> for spam`,
          );
        });
    }
  } else {
    // If this is new, send a new message
    channelInstance.send(logBody).then((warningMessage) => {
      warningMessages.set(simplifiedContent, {
        warnings: 1,
        message: warningMessage,
      });
    });
  }
};

const reactionHandlers: ReactionHandlers = {
  "⚠️": async ({
    reaction,
    message,
    reactor,
    author,
    logChannel,
    usersWhoReacted,
  }) => {
    // Skip if the post is from someone from the staff
    const { guild } = message;
    if (!guild || !author || isStaff(author)) {
      return;
    }
    // If the user that reacted isn't in the staff, remove the reaction, send a
    if (!isStaff(reactor)) {
      reaction.users.remove(reactor.id);
      reactor.send(`Hey there! 👋
The ⚠️ reaction is reserved for staff usage as part of our moderation system.  If you would like to mark a message as needing moderator attention, you can use react with 👎 instead.
Thanks!
`);
      return;
    }

    const reactionCount = usersWhoReacted.length;
    const staff = usersWhoReacted
      .filter(isStaff)
      .map((member) => member?.user.username || "X");

    if (reactionCount < config.warningThreshold) {
      return;
    }

    handleReport(
      ReportReasons.mod,
      logChannel,
      message,
      constructLog(ReportReasons.mod, [], staff, message),
    );
  },
  "💩": async ({ usersWhoReacted, message, reactor, logChannel, author }) => {
    // Skip if the post is from someone from the staff or reactor is not staff
    if (isStaff(author) || !isStaff(reactor)) {
      return;
    }

    const [members, staff] = partition(isStaff, usersWhoReacted);

    message.delete();
    handleReport(
      ReportReasons.spam,
      logChannel,
      message,
      constructLog(
        ReportReasons.spam,
        members.map(({ user }) => user.username),
        staff.map(({ user }) => user.username),
        message,
      ),
    );
  },
  "👎": async ({ usersWhoReacted, message, reactor, logChannel }) => {
    if (!message.guild || cooldown.hasCooldown(reactor.id, "thumbsdown")) {
      return;
    }

    cooldown.addCooldown(reactor.id, "thumbsdown", 60); // 1 minute

    const totalReacts = usersWhoReacted.length;

    if (totalReacts < config.thumbsDownThreshold) {
      return;
    }
    let trigger = ReportReasons.userWarn;
    if (totalReacts >= config.deletionThreshold) {
      trigger = ReportReasons.userDelete;
    }

    const staffReactionCount = usersWhoReacted.filter(isStaff).length;
    const [members, staff] = partition(isStaff, usersWhoReacted);
    const meetsDeletion = staffReactionCount >= config.deletionThreshold;

    if (meetsDeletion) {
      message.delete();
    }

    handleReport(
      meetsDeletion ? ReportReasons.userDelete : ReportReasons.userWarn,
      logChannel,
      message,
      constructLog(
        trigger,
        members.map(({ user }) => user.username),
        staff.map(({ user }) => user.username),
        message,
      ),
    );
  },
};

const emojiMod: ChannelHandlers = {
  handleReaction: async ({ reaction, user, bot }) => {
    const { message, users } = reaction;
    const { author, guild } = message;

    if (!guild || !author || author?.id === bot.user?.id) {
      return;
    }

    let emoji = reaction.emoji.toString();

    if (thumbsDownEmojis.includes(emoji)) {
      emoji = "👎";
    }

    if (!reactionHandlers[emoji]) {
      return;
    }

    const [fullReaction, fullMessage, reactor, authorMember, usersWhoReacted] =
      await Promise.all([
        reaction.partial ? reaction.fetch() : reaction,
        message.partial ? message.fetch() : message,
        guild.members.fetch(user.id),
        guild.members.fetch(author.id),
        Promise.all(users.cache.map((user) => guild.members.fetch(user.id))),
      ]);

    reactionHandlers[emoji]?.({
      guild,
      logChannel: guild.channels.cache.find(
        (channel) =>
          channel.name === "mod-log" || channel.id === CHANNELS.modLog,
      ) as TextChannel,
      reaction: fullReaction,
      message: fullMessage,
      reactor,
      author: authorMember,
      usersWhoReacted: usersWhoReacted.filter((x): x is GuildMember =>
        Boolean(x),
      ),
    });
  },
};

export default emojiMod;
