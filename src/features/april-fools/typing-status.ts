import { ChannelHandlers } from "../../types";

const CHANCE_TO_TYPE = 0.02;

export default {
  handleMessage: async ({ msg: maybeMessage }) => {
    const msg = maybeMessage.partial
      ? await maybeMessage.fetch()
      : maybeMessage;

    const random = Math.random();
    if (random > CHANCE_TO_TYPE) {
      return;
    }

    const channel = msg.channel;
    await channel.sendTyping(); // This will start typing for 10 seconds (a Discord value, not customizable)
  },
} as ChannelHandlers;
