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
import { fetchReactionMembers, isStaff } from "../helpers/discord";
import { partition } from "../helpers/array";

const AUTO_SPAM_THRESHOLD = 5;
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
    if (reason === ReportReasons.mod || reason === ReportReasons.spam) {
      finalLog = logBody.replace(/warned \d times/, `warned ${warnings} times`);
    }

    message.edit(finalLog);
    warningMessages.set(simplifiedContent, { warnings, message });
    return warnings;
  } else {
    // If this is new, send a new message
    channelInstance.send(logBody).then((warningMessage) => {
      warningMessages.set(simplifiedContent, {
        warnings: 1,
        message: warningMessage,
      });
    });
    return 1;
  }
};

const reactionHandlers: ReactionHandlers = {
  "⚠️": async ({
    author,
    reactor,
    message,
    reaction,
    usersWhoReacted,
    logChannel,
  }) => {
    // Skip if the post is from someone from the staff
    if (isStaff(author)) {
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
  "💩": async ({
    guild,
    author,
    reactor,
    message,
    usersWhoReacted,
    logChannel,
  }) => {
    // Skip if the post is from someone from the staff or reactor is not staff
    if (isStaff(author) || !isStaff(reactor)) {
      return;
    }

    const [members, staff] = partition(isStaff, usersWhoReacted);

    message.delete();
    const warnings = handleReport(
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

    if (warnings >= AUTO_SPAM_THRESHOLD) {
      guild.members.fetch(message.author.id).then((member) => {
        member.kick("Autokicked for spamming");
        logChannel.send(
          `Automatically kicked <@${message.author.id}> for spam`,
        );
      });
    }
  },
  "👎": async ({ message, reactor, usersWhoReacted, logChannel }) => {
    if (cooldown.hasCooldown(reactor.id, "thumbsdown")) {
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

    const [fullReaction, fullMessage, reactor, authorMember] =
      await Promise.all([
        reaction.partial ? reaction.fetch() : reaction,
        message.partial ? message.fetch() : message,
        guild.members.fetch(user.id),
        guild.members.fetch(author.id),
      ]);
    const usersWhoReacted = await fetchReactionMembers(guild, fullReaction);

    reactionHandlers[emoji]?.({
      guild,
      author: authorMember,
      reactor,
      message: fullMessage,
      reaction: fullReaction,
      usersWhoReacted: usersWhoReacted.filter((x): x is GuildMember =>
        Boolean(x),
      ),
      logChannel: guild.channels.cache.find(
        (channel) =>
          channel.name === "mod-log" || channel.id === CHANNELS.modLog,
      ) as TextChannel,
    });
  },
};

export default emojiMod;
