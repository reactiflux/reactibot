import { sleep } from "../../helpers/misc";
import { ChannelHandlers } from "../../types";

const EMOJIS = [
  [0.02, "👀"],
  [0.02, "🤔"],
  [0.02, "❓"],
] as const;

export default {
  handleMessage: async ({ msg: maybeMessage }) => {
    const msg = maybeMessage.partial
      ? await maybeMessage.fetch()
      : maybeMessage;

    for (const [chance, emoji] of EMOJIS) {
      const random = Math.random();
      if (random < chance) {
        const resp = await msg.react(emoji);

        // For added chaos, remove the reaction in ~30-60s
        const duration = Math.floor(Math.random() * 30) + 30;
        sleep(duration).then(() => {
          resp.remove();
        });

        return;
      }
    }
  },
} as ChannelHandlers;
