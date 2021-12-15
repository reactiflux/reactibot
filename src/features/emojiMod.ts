import { MessageReaction, Message, GuildMember, TextChannel } from "discord.js";
import cooldown from "./cooldown";
import { ChannelHandlers } from "../types";
import { ReportReasons } from "../constants";
import { constructLog, simplifyString } from "../helpers/modLog";
import { isStaff } from "../helpers/discord";

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
  [emoji: string]: (
    reaction: MessageReaction,
    message: Message,
    member: GuildMember,
  ) => void;
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
  "⚠️": (reaction, message, member) => {
    // Skip if the post is from someone from the staff
    if (
      !message.guild ||
      !message.author ||
      isStaff(message.guild.member(message.author.id))
    ) {
      return;
    }
    // If the user that reacted isn't in the staff, remove the reaction, send a
    if (!isStaff(member)) {
      reaction.users.remove(member.id);
      member.send([
        "Hey there! 👋",
        "The ⚠️ reaction is reserved for staff usage as part of our moderation system.  If you would like to mark a message as needing moderator attention, you can use react with 👎 instead.",
        "Thanks!",
      ]);
      return;
    }

    const usersWhoReacted = reaction.users.cache.map((user) =>
      message.guild?.member(user.id),
    );
    const reactionCount = usersWhoReacted.length;

    const modLogChannel = message.guild?.channels.cache.find(
      (channel) =>
        channel.name === "mod-log" || channel.id === "257930126145224704",
    ) as TextChannel;

    const staff = usersWhoReacted
      .filter(isStaff)
      .map((member) => member?.user.username || "X");

    if (reactionCount < config.warningThreshold) {
      return;
    }

    handleReport(
      ReportReasons.mod,
      modLogChannel,
      message,
      constructLog(ReportReasons.mod, [], staff, message),
    );
  },
  "👎": (reaction, message, member) => {
    if (!message.guild || cooldown.hasCooldown(member.id, "thumbsdown")) {
      return;
    }

    cooldown.addCooldown(member.id, "thumbsdown", 60); // 1 minute

    const reactions = thumbsDownEmojis.reduce(
      (acc, emoji) => {
        if (message.reactions.cache.get(emoji)) {
          acc.count += message.reactions.cache.get(emoji)?.count || 0;

          // todo: figure out how to do this
          // acc.users.push(Object.values(message.reactions.get(emoji).users));
        }

        return acc;
      },
      {
        count: 0,
        users: [],
      },
    );

    const totalReacts = reactions.count;

    if (totalReacts < config.thumbsDownThreshold) {
      return;
    }
    let trigger = ReportReasons.userWarn;
    if (totalReacts >= config.deletionThreshold) {
      trigger = ReportReasons.userDelete;
    }

    const usersWhoReacted = reaction.users.cache.map((user) =>
      message.guild?.member(user.id),
    );
    const staffReactionCount = usersWhoReacted.filter(isStaff).length;

    const members = usersWhoReacted
      .filter((user) => !isStaff(user))
      .map((member) => member?.user.username || "X");

    const staff = usersWhoReacted
      .filter(isStaff)
      .map((member) => member?.user.username || "X");

    const modLogChannel = message.guild.channels.cache.find(
      (channel) =>
        channel.name === "mod-log" || channel.id === "257930126145224704",
    ) as TextChannel;

    const meetsDeletion = staffReactionCount >= config.deletionThreshold;

    if (meetsDeletion) {
      message.delete();
    }
    handleReport(
      meetsDeletion ? ReportReasons.userDelete : ReportReasons.userWarn,
      modLogChannel,
      message,
      constructLog(trigger, members, staff, message),
    );
  },
};

const emojiMod: ChannelHandlers = {
  handleReaction: ({ reaction, user, bot }) => {
    const { message } = reaction;

    if (!message.guild || message.author.id === bot.user?.id) {
      return;
    }

    let emoji = reaction.emoji.toString();

    if (thumbsDownEmojis.includes(emoji)) {
      emoji = "👎";
    }

    const member = message.guild.member(user.id);
    if (!member) return;

    const reactionHandler = reactionHandlers[emoji];
    if (reactionHandler) {
      reactionHandler(reaction, message, member);
    }
  },
};

export default emojiMod;
