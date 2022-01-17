import { ChannelHandlers } from "../types";
import { isStaff } from "../helpers/discord";

const spamKeywords = ["discord", "nitro", "steam", "free", "gift", "airdrop"];

const autodelete: ChannelHandlers = {
  handleMessage: async ({ msg: maybeMessage }) => {
    if (isStaff(maybeMessage.member)) return;

    const msg = maybeMessage.partial
      ? await maybeMessage.fetch()
      : maybeMessage;

    const msgHasPingKeywords = ["@everyone", "@here"].some((pingKeyword) =>
      msg.content.includes(pingKeyword),
    );

    const msgHasSpamKeywords = msg.content
      .split(" ")
      .some((word) => spamKeywords.includes(word.toLowerCase()));

    const msgHasLink = msg.content.includes("http");

    if (
      Number(msgHasPingKeywords) +
        Number(msgHasSpamKeywords) +
        Number(msgHasLink) >=
      2
    ) {
      await msg.react("💩");
    }
  },
};

export default autodelete;
