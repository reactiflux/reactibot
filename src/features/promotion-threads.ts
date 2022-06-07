import ogs from "open-graph-scraper";
import { sleep } from "../helpers/misc";
import { ChannelHandlers } from "../types";
import { threadStats } from "../features/stats";
import { format } from "date-fns";
import fetch from "node-fetch";

const promotionThread: ChannelHandlers = {
  handleMessage: async ({ msg: maybeMessage }) => {
    const msg = maybeMessage.partial
      ? await maybeMessage.fetch()
      : maybeMessage;

    // Delete top-level replies
    if (msg.type === "REPLY") {
      msg.author.send(msg.content);
      const reply = await msg.reply(
        "This is a thread-only channel! Please reply in that message’s thread. Your message has been DM’d to you.",
      );
      msg.delete();
      threadStats.threadReplyRemoved(msg.channelId);
      sleep(5).then(() => reply.delete());
      return;
    }

    const [firstLink] =
      msg.content.match(
        /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_+.~#?&//=]*)/g,
      ) || [];

    const title = await (async () => {
      let maybeTitle = msg.author.username;
      if (firstLink) {
        if (firstLink.startsWith("https://twitter.com/")) {
          try {
            const res = await fetch(
              `https://publish.twitter.com/oembed?url=${firstLink}`,
            );
            const { author_name } = await res.json();
            maybeTitle = `${author_name} on Twitter `;
          } catch (e) {
            // do nothing
          }
        } else {
          try {
            const { result, error } = await ogs({ url: firstLink });
            console.log({ result, error });
            if (result.success) {
              if (result.ogSiteName === "Twitter") {
                maybeTitle = `${msg.author.username} tweet`;
              } else {
                maybeTitle = `${result.twitterTitle || result.ogTitle}`;
              }
            }
          } catch (e) {
            // do nothing
          }
        }
      }
      return `${maybeTitle} – ${format(new Date(), "HH-mm MMM d")}`;
    })();
    // Create threads
    await msg.startThread({
      name: `${title.slice(0, 99)}…`,
    });
    threadStats.threadCreated(msg.channelId);
  },
};
export default promotionThread;
