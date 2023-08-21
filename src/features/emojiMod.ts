import {
  MessageReaction,
  Message,
  GuildMember,
  Guild,
  EmbedType,
} from "discord.js";
import cooldown from "./cooldown";
import { ChannelHandlers } from "../types";
import { ReportReasons, reportUser } from "../helpers/modLog";
import {
  fetchReactionMembers,
  isStaff,
  isStaffOrHelpful,
} from "../helpers/discord";
import { partition } from "../helpers/array";
import { EMBED_COLOR } from "./commands";

const config = {
  // This is how many ️️warning reactions a post must get until it's considered an official warning
  warningThreshold: 1,
  // This is how many ️️warning reactions a post must get until mods are alerted
  thumbsDownThreshold: 2,
  // This is how many ️️warning reactions a post must get the message is deleted
  deletionThreshold: Infinity,
};

const thumbsDownEmojis = ["👎", "👎🏻", "👎🏼", "👎🏽", "👎🏾", "👎🏿"];

type ReactionHandlers = {
  [emoji: string]: (args: {
    guild: Guild;
    reaction: MessageReaction;
    message: Message;
    reactor: GuildMember;
    author: GuildMember;
    usersWhoReacted: GuildMember[];
  }) => void;
};

export const reactionHandlers: ReactionHandlers = {
  "👎": async ({ message, reactor, usersWhoReacted }) => {
    if (cooldown.hasCooldown(reactor.id, "thumbsdown")) {
      return;
    }

    if (message.mentions.everyone || message.mentions.roles.size > 0) {
      return;
    }

    cooldown.addCooldown(reactor.id, "thumbsdown", 60); // 1 minute

    const totalReacts = usersWhoReacted.length;

    if (totalReacts < config.thumbsDownThreshold) {
      return;
    }
    let reason = ReportReasons.userWarn;
    if (totalReacts >= config.deletionThreshold) {
      reason = ReportReasons.userDelete;
    }

    const staffReactionCount = usersWhoReacted.filter(isStaff).length;
    const [members, staff] = partition(isStaff, usersWhoReacted);
    const meetsDeletion = staffReactionCount >= config.deletionThreshold;

    if (meetsDeletion) {
      message.delete();
    }

    reportUser({ reason, message, staff, members });
  },
  "🔍": async ({ message, usersWhoReacted }) => {
    const STAFF_OR_HELPFUL_REACTOR_THRESHOLD = 2;

    const staffOrHelpfulReactors = usersWhoReacted.filter(isStaffOrHelpful);

    if (
      staffOrHelpfulReactors.length < STAFF_OR_HELPFUL_REACTOR_THRESHOLD ||
      message.channel.isThread()
    ) {
      return;
    }

    const newThreadName = `Sorry ${message.author.username}, your question needs some work`;

    const thread = message.hasThread
      ? // This is safe because we're checking if it has a thread
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        message.thread!
      : await message.startThread({
          name: newThreadName,
        });

    await thread.send({
      embeds: [
        {
          title: "Please improve your question",
          type: EmbedType.Rich,
          description: `
Sorry, our most active helpers have flagged this as a question that needs more work before a good answer can be given. This may be because it's ambiguous, too broad, or otherwise challenging to answer. 

This is a good resource about asking good programming questions: 

https://zellwk.com/blog/asking-questions/

(this was triggered by crossing a threshold of "🔍" reactions on the original message)
          `,
          color: EMBED_COLOR,
        },
      ],
    });

    await message.delete();

    reportUser({
      reason: ReportReasons.lowEffortQuestionRemoved,
      message,
      staff: staffOrHelpfulReactors,
    });
  },
};

const emojiMod: ChannelHandlers = {
  handleReaction: async ({ reaction, user, bot }) => {
    const { message } = reaction;
    const { guild } = message;

    if (!guild) {
      return;
    }

    let emoji = reaction.emoji.toString();

    if (thumbsDownEmojis.includes(emoji)) {
      emoji = "👎";
    }

    if (!reactionHandlers[emoji]) {
      return;
    }

    const [fullReaction, fullMessage, reactor] = await Promise.all([
      reaction.partial ? reaction.fetch() : reaction,
      message.partial ? message.fetch() : message,
      guild.members.fetch(user.id),
    ]);
    const [usersWhoReacted, authorMember] = await Promise.all([
      fetchReactionMembers(guild, fullReaction),
      guild.members.fetch(fullMessage.author.id),
    ]);

    if (authorMember.id === bot.user?.id) return;

    if (authorMember.id === bot.user?.id) return;

    reactionHandlers[emoji]?.({
      guild,
      author: authorMember,
      reactor,
      message: fullMessage,
      reaction: fullReaction,
      usersWhoReacted: usersWhoReacted.filter((x): x is GuildMember =>
        Boolean(x),
      ),
    });
  },
};

export default emojiMod;
