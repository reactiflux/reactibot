import type { ChannelHandlers } from "../types/index.js";
import { EMBED_COLOR } from "./commands.js";

export const TWITTER_REGEX =
  /https?:\/\/(?:www\.)?(?:x|twitter)\.com\/\w+\/status\/\d+/i;

const xCancelGenerator: ChannelHandlers = {
  handleMessage: async ({ msg }) => {
    const match = TWITTER_REGEX.exec(msg.content);
    if (!match || msg.author.bot) return; // Ignore bots to prevent loops

    const [url] = match;
    const alternativeUrl = url.replace(/(x|twitter)\.com/i, "xcancel.com");
    await msg.channel.send(
      "This `x.com` link has been converted to `xcancel.com` so that server members won't require an account to view content and threads:",
    );
    await msg.channel.send({
      embeds: [
        {
          title: "View on xCancel",
          url: alternativeUrl,
          description: `[Original Link](${url})`,
          color: EMBED_COLOR,
        },
      ],
    });
  },
};

export default xCancelGenerator;
