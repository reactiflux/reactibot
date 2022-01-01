import { format } from "date-fns";
import { sleep } from "../helpers/misc";
import { ChannelHandlers } from "../types";

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
          "This is a thread-only channel! Please reply in that message’s thread. Your message has been DM'd to you.",
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
};
export default autoThread;
