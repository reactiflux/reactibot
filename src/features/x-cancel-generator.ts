import type { ChannelHandlers } from "../types/index.js";

export const TWITTER_REGEX =
  /https?:\/\/(?:www\.)?(?:x|twitter)\.com\/\w+\/status\/\d+/i;

const xCancelGenerator: ChannelHandlers = {
  handleMessage: async ({ msg }) => {
    const match = TWITTER_REGEX.exec(msg.content);
    if (!match || msg.author.bot) return; // Ignore bots to prevent loops
    msg.suppressEmbeds(true);
    const [url] = match;
    const alternativeUrl = url.replace(/(x|twitter)\.com/i, "xcancel.com");
    await msg.channel.send(
      `[Converted to \`xcancel.com\` for members with no \`x\` account](${alternativeUrl})`,
    );
  },
};

export default xCancelGenerator;
