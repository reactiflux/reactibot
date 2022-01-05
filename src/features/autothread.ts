import { differenceInHours, format } from "date-fns";
import { Client, Message, PartialMessage } from "discord.js";
import { constructDiscordLink } from "../helpers/discord";
import { sleep } from "../helpers/misc";
import { ChannelHandlers } from "../types";

const CHECKS = ["☑️", "✔️", "✅"];
const IDLE_TIMEOUT = 12;

const lockWithReply = ({
  content: msg,
  message,
  starter,
  shouldReply,
}: {
  content: string;
  message: Message | PartialMessage;
  starter: Message | PartialMessage;
  shouldReply: boolean;
}) => {
  const { channel: thread } = message;
  if (!thread.isThread()) {
    return;
  }

  const content = `${msg}

If you have a followup question, you may reply to this thread so other members know they're related. ${constructDiscordLink(
    starter,
  )}

Threads are closed automatically after ${IDLE_TIMEOUT} hours, or if the member who started it reacts to a message with ✅ to mark that as the accepted answer.`;

  (shouldReply
    ? message.reply({ content, allowedMentions: { repliedUser: false } })
    : thread.send(content)
  ).then(() => {
    thread.setLocked(true);
    thread.setArchived(true);
  });
};

const autoThread: ChannelHandlers = {
  handleMessage: async ({ msg: maybeMessage }) => {
    const msg = maybeMessage.partial
      ? await maybeMessage.fetch()
      : maybeMessage;

    if (msg.type === "REPLY") {
      const repliedTo = await msg.fetchReference();
      // Allow members to reply to their own messages, as "followup" threads
      // If they replied to someone else, delete it and let them know why
      if (msg.author.id !== repliedTo.author.id) {
        msg.author.send(msg.content);
        const reply = await msg.reply(
          "This is a thread-only channel! Please reply in that message’s thread. Your message has been DM’d to you.",
        );
        msg.delete();
        sleep(5).then(() => reply.delete());
        return;
      }
    }
    msg.startThread({
      name: `${msg.author.username} – ${format(new Date(), "HH-mm MMM d")}`,
    });
  },
  handleReaction: async ({ reaction }) => {
    if (!CHECKS.includes(reaction.emoji.toString())) {
      return;
    }

    const { channel: thread } = reaction.message;
    const starter = thread.isThread()
      ? await thread.fetchStarterMessage()
      : undefined;

    // If the reaction was sent by the original thread author, lock the thread
    if (starter && reaction.users.cache.has(starter.author.id)) {
      lockWithReply({
        content: `This question has an answer! Thank you for helping 😄`,
        message: reaction.message,
        starter,
        shouldReply: true,
      });
    }
  },
};
export default autoThread;

export const cleanupThreads = async (channelIds: string[], bot: Client) => {
  channelIds.forEach(async (id) => {
    const channel = await bot.channels.fetch(id);
    if (!channel?.isText()) return;

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
      const mostRecent = tempCollection.at(0);

      // If the thread has no messages, check time for initial message
      const toCompare = mostRecent || starter;

      if (differenceInHours(now, toCompare.createdAt) >= IDLE_TIMEOUT) {
        lockWithReply({
          content: `This thread hasn’t had any activity in ${IDLE_TIMEOUT} hours, so it’s now locked.`,
          message: toCompare,
          starter,
          shouldReply: false,
        });
      }
    });
  });
};
