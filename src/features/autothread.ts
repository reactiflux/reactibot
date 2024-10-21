import { differenceInHours } from "date-fns";
import { ChannelType, Client, MessageType } from "discord.js";
import { CHANNELS } from "../constants/channels";
import {
  constructDiscordLink,
  fetchReactionMembers,
  isHelpful,
  isStaff,
} from "../helpers/discord";
import { sleep } from "../helpers/misc";
import { ChannelHandlers } from "../types";
import { threadStats } from "../features/stats";
import { createNewThreadName } from "../helpers/threads";

const CHECKS = ["☑️", "✔️", "✅"];
const IDLE_TIMEOUT = 72;
const STAFF_ACCEPT_THRESHOLD = 2;

const autoThread: ChannelHandlers = {
  handleMessage: async ({ msg }) => {
    if (
      msg.channel.type === ChannelType.PublicThread ||
      msg.channel.type === ChannelType.PrivateThread
    ) {
      return;
    }

    // Delete top-level replies
    if (msg.type === MessageType.Reply) {
      const repliedTo = await msg.fetchReference();
      // Allow members to reply to their own messages, as "followup" threads
      // If they replied to someone else, delete it and let them know why
      if (msg.author.id !== repliedTo.author.id) {
        msg.author.send(msg.content);
        const reply = await msg.reply(
          "This is a thread-only channel! Please reply in that message’s thread. Your message has been DM’d to you.",
        );
        msg.delete();
        threadStats.threadReplyRemoved(msg.channelId);
        sleep(5).then(() => reply.delete());
        return;
      }
    }
    // Create threads
    const newThread = await msg.startThread({
      name: createNewThreadName({ username: msg.author.username }),
    });
    threadStats.threadCreated(msg.channelId);
    // Send short-lived instructions
    const message = await newThread.send(
      `React to someone with ✅ to mark their response as the accepted answer. If someone has been really helpful, give them a shoutout in <#${CHANNELS.thanks}>!`,
    );
    await sleep(30);
    message.delete();
  },
  handleReaction: async ({ reaction }) => {
    if (!CHECKS.includes(reaction.emoji.toString())) {
      return;
    }

    const { channel: thread, author, guild } = await reaction.message.fetch();
    const starter = thread.isThread()
      ? await thread.fetchStarterMessage()
      : undefined;

    if (!thread.isThread() || !starter || !guild) {
      return;
    }
    // Bail out early if the thread is already resolved
    if (CHECKS.some((c) => thread.name.includes(c))) {
      return;
    }

    const reactors = await fetchReactionMembers(guild, reaction);
    const roledReactors = reactors.filter((r) => isStaff(r) || isHelpful(r));

    // If the reaction was from the author or there are enough known people
    // responding, mark that answer as the accepted one
    const authorId = starter.author.id;
    if (
      roledReactors.length >= STAFF_ACCEPT_THRESHOLD ||
      reaction.users.cache.has(authorId)
    ) {
      threadStats.threadResolved(starter.channelId, authorId, author.id);
      thread.setName(`✅ – ${thread.name}`);
      reaction.message.reply({
        allowedMentions: { repliedUser: false },
        content: `This question has an answer! Thank you for helping 😄

If you have a followup question, you may want to reply to this thread so other members know they're related. ${constructDiscordLink(
          starter,
        )}`,
      });
    }
  },
};
export default autoThread;

export const cleanupThreads = async (channelIds: string[], bot: Client) => {
  channelIds.forEach(async (id) => {
    const channel = await bot.channels.fetch(id);
    if (channel?.type !== ChannelType.GuildText) return;

    const now = new Date();

    const messages = await channel.messages.fetch({ limit: 100 });
    messages.forEach(async (m) => {
      // Since this is a thread-only channel, all messages should have threads
      if (!m.hasThread) return;

      const thread = await bot.channels.fetch(m.id);
      // Skip anything already archived
      if (!thread?.isThread() || thread.archived) return;

      const [tempCollection, starter] = await Promise.all([
        thread.messages.fetch({ limit: 1 }),
        thread.fetchStarterMessage(),
      ]);
      if (!starter) {
        return;
      }
      const mostRecent = tempCollection.at(0);

      // If the thread has no messages, check time for initial message
      const toCompare = mostRecent || starter;

      if (differenceInHours(now, toCompare.createdAt) >= IDLE_TIMEOUT) {
        threadStats.threadTimeout(starter.channelId);
        thread
          .send({
            content: `This thread hasn’t had any activity in ${IDLE_TIMEOUT} hours, so it’s now locked.

Threads are closed automatically after ${IDLE_TIMEOUT} hours. If you have a followup question, you may want to reply to this thread so other members know they're related. ${constructDiscordLink(
              starter,
            )}

${
  toCompare.content === ""
    ? `Question not getting answered? Maybe it's hard to answer, or maybe you asked at a slow time. Check out these resources for help asking a good question:

<https://stackoverflow.com/help/how-to-ask>
<http://wp.me/p2oIwo-26>`
    : ""
}`,
          })
          .then(() => {
            thread.setLocked(true);
            thread.setArchived(true);
          });
      }
    });
  });
};
