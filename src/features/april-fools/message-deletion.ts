import { ChannelHandlers } from "../../types";

const CHANCE_TO_DELETE = 0.02;

export default {
  handleMessage: async ({ msg: maybeMessage }) => {
    const msg = maybeMessage.partial
      ? await maybeMessage.fetch()
      : maybeMessage;

    const random = Math.random();
    if (random < CHANCE_TO_DELETE) {
      return msg.delete();
    }
  },
} as ChannelHandlers;
