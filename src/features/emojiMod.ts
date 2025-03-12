import {
  MessageReaction,
  Message,
  GuildMember,
  Guild,
  EmbedType,
  ChannelType,
  ThreadChannel,
} from "discord.js";
import cooldown from "./cooldown.js";
import type { ChannelHandlers } from "../types/index.d.ts";
import {
  ReportReasons,
  reportUser,
  truncateMessage,
} from "../helpers/modLog.js";
import {
  createPrivateThreadFromMessage,
  fetchReactionMembers,
  isStaff,
  isStaffOrHelpful,
} from "../helpers/discord.js";
import { partition } from "../helpers/array.js";
import { EMBED_COLOR } from "./commands.js";

const config = {
   // This is how many ️️warning reactions a post must get until it's considered an official warning
  warningThreshold: 1,
  thumbsDownThreshold: 2,
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

async function waitForThreadActivity(
  thread: ThreadChannel,
  maxAttempts = 5,
  delayMs = 5000,
): Promise<boolean> {
  for (let attempts = 0; attempts < maxAttempts; attempts++) {
    try {
      const messages = await thread.messages.fetch({ limit: 1 });
      if (messages.size > 0) return true;
    } catch (error) {
      console.warn(`Failed to fetch thread messages: ${error}`);
    }
    await new Promise((res) => setTimeout(res, delayMs));
  }
  return false;
}

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
    const [staff, members] = partition(isStaff, usersWhoReacted);
    const meetsDeletion = staffReactionCount >= config.deletionThreshold;

    if (meetsDeletion) {
      try {
        await message.delete();
      } catch (error) {
        console.error(`Failed to delete message: ${error}`);
      }
    }

    reportUser({ reason, message, staff, members });
  },
  "🔍": async ({ message, usersWhoReacted }) => {
    const STAFF_OR_HELPFUL_REACTOR_THRESHOLD = 2;
    const staffOrHelpfulReactors = usersWhoReacted.filter(isStaffOrHelpful);
    const { channel } = message;

    if (
      staffOrHelpfulReactors.length < STAFF_OR_HELPFUL_REACTOR_THRESHOLD ||
      channel.type === ChannelType.PublicThread
    ) {
      return;
    }

    try {
      const thread = await createPrivateThreadFromMessage(message, {
        name: `Sorry ${message.author.username}, your question needs some work`,
        autoArchiveDuration: 60,
      });

      const isThreadActive = await waitForThreadActivity(thread);
      if (!isThreadActive) {
        await thread.send(
          `Hey ${message.author.username}, please send a message here first so I can continue assisting you.`,
        );
        return;
      }

      await thread.send({
        embeds: [
          {
            title: "Please improve your question",
            type: EmbedType.Rich,
            description: `
Sorry, our most active helpers have flagged this as a question that needs more work before a good answer can be given. This may be because it's ambiguous, too broad, or otherwise challenging to answer.

Zell Liew [wrote a great resource](https://zellwk.com/blog/asking-questions/) about asking good programming questions.

- The onus is on the asker to craft a question that is easy to answer.
- A good question is specific, clear, concise, and shows effort on the part of the asker.
- Share just the relevant parts of the code, using tools like Codepen, CodeSandbox, or GitHub for better clarity.
- Making a question specific and to the point is a sign of respecting the responder’s time, which increases the likelihood of getting a good answer.

(this was triggered by crossing a threshold of "🔍" reactions on the original message)
            `,
            color: EMBED_COLOR,
          },
        ],
      });

      await thread.send("Your message:");
      await thread.send(truncateMessage(message.content));

      await message.delete();
      reportUser({
        reason: ReportReasons.lowEffortQuestionRemoved,
        message,
        staff: staffOrHelpfulReactors,
      });
    } catch (error) {
      console.error(`Failed to create private thread: ${error}`);
    }
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

    try {
      const [fullReaction, fullMessage] = await Promise.all([
        reaction.partial ? reaction.fetch() : reaction,
        message.partial ? message.fetch() : message,
      ]);

      const reactor = await guild.members.fetch(user.id).catch(() => null);
      if (!reactor) {
        console.warn(`Reactor member ${user.id} not found in guild.`);
        return;
      }

      const authorMember = await guild.members
        .fetch(fullMessage.author.id)
        .catch(() => null);
      if (!authorMember || authorMember.id === bot.user?.id) {
        return;
      }

      const usersWhoReacted = await fetchReactionMembers(guild, fullReaction);
      reactionHandlers[emoji]({
        guild,
        author: authorMember,
        reactor,
        message: fullMessage,
        reaction: fullReaction,
        usersWhoReacted: usersWhoReacted.filter(
          (x): x is GuildMember => Boolean(x) && authorMember.id !== reactor.id,
        ),
      });
    } catch (error) {
      console.error(`Error handling reaction: ${error}`);
    }
  },
};

export default emojiMod;
