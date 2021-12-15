import { ChannelHandlers } from "../types";
import { isStaff } from "../helpers/discord";

const spamKeywords = ["discord", "nitro", "steam", "free", "gift"];

const autodelete: ChannelHandlers = {
  handleMessage: async ({ msg }) => {
    if (isStaff(msg.member)) return;

    const msgHasPingKeywords = ["@everyone", "@here"].some((pingKeyword) =>
      msg.content.includes(pingKeyword),
    );

    const msgHasSpamKeywords = msg.content
      .split(" ")
      .some((word) => spamKeywords.includes(word.toLowerCase()));

    if (msgHasPingKeywords && msgHasSpamKeywords) {
      await msg.react("⚠️");
      await msg.delete();
    }
  },
};

export default autodelete;
