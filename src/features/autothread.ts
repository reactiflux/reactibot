import { format } from "date-fns";
import { Message, PartialMessage } from "discord.js";
import { constructDiscordLink } from "../helpers/discord";
import { sleep } from "../helpers/misc";
import { ChannelHandlers } from "../types";

const CHECKS = ["☑️", "✔️", "✅"];

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

If you have a a followup question, you may reply to this thread so other members know they're related. ${constructDiscordLink(
    starter,
  )}

Threads are closed automatically after 6 hours, or if the member who started it reacts to a message with ✅ to mark that as the accepted answer.`;

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
