import ogs from "open-graph-scraper";
import { ChannelHandlers } from "../types";
import { threadStats } from "../features/stats";
import { format } from "date-fns";
import fetch from "node-fetch";
import { ChannelType } from "discord.js";

const promotionThread: ChannelHandlers = {
  handleMessage: async ({ msg }) => {
    if (
      msg.channel.type === ChannelType.PublicThread ||
      msg.channel.type === ChannelType.PrivateThread
    ) {
      return;
    }

    const [firstLink] =
      msg.content.match(
        /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_+.~#?&//=]*)/g,
      ) || [];

    const title = await (async () => {
      let maybeTitle = msg.author.username;
      if (firstLink) {
        if (/^https:\/\/twitter.com|^https:\/\/x.com/.test(firstLink)) {
          try {
            const res = await fetch(
              `https://publish.twitter.com/oembed?url=${firstLink}`,
            );
            const { author_name } = (await res.json()) as {
              author_name: string;
            };
            maybeTitle = `${author_name} on Twitter `;
          } catch (e) {
            // do nothing
          }
        } else {
          try {
            const { result, error } = await ogs({ url: firstLink });
            if (error) {
              console.log("[DEBUG] Erorr when fetching og tags: ", error);
            }
            if (result.success) {
              if (result.ogSiteName === "Twitter") {
                maybeTitle = `${msg.author.username} tweet`;
              } else if (result.ogSiteName === "GitHub") {
                maybeTitle =
                  result.ogDescription || result.ogTitle || result.ogSiteName;
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
