import { CHANNELS } from "../constants/channels.js";
import type { ChannelHandlers } from "../types/index.js";

export const TWITTER_REGEX =
  /https?:\/\/(?:www\.)?(?:x|twitter)\.com\/\w+\/status\/\d+/i;

const THREAD_CHANNELS = [
  CHANNELS.events,
  CHANNELS.iBuiltThis,
  CHANNELS.iWroteThis,
  CHANNELS.techReadsAndNews,
  CHANNELS.twitterFeed,
];
const xCancelGenerator: ChannelHandlers = {
  handleMessage: async ({ msg }) => {
    const match = TWITTER_REGEX.exec(msg.content);
    if (!match || msg.author.bot) return; // Ignore bots to prevent loops
    const isThreadChannel = THREAD_CHANNELS.includes(msg.channel.id);
    if (!isThreadChannel) {
      // The below line will suppress the original message embed (if ever required again in future)
      // msg.suppressEmbeds(true);
      const [url] = match;
      const alternativeUrl = url.replace(/(x|twitter)\.com/i, "xcancel.com");
      // Including the < brackets > around alternativeLink is recognized markdown to suppress an embed
      await msg.channel.send(
        `[Converted to \`xcancel.com\` for members with no \`x\` account](<${alternativeUrl}>)`,
      );
    }
  },
};

export default xCancelGenerator;
