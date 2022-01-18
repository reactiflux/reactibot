import { ChannelHandlers } from "../types";
import { isStaff } from "../helpers/discord";

const spamKeywords = ["discord", "nitro", "steam", "free", "gift", "airdrop"];

const safeKeywords = ["hiring", "remote", "onsite"];

const safeDomains = [
  "reactiflux.com",
  "github.com",
  "mozilla.org",
  "reactjs.org",
  "nextjs.org",
];

const atLeast =
  (count: number) =>
  (...bools: boolean[]) =>
    bools.filter(Boolean).length >= count;

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
      .split(/\b/)
      .some((word) => spamKeywords.includes(word.toLowerCase()));

    const msgHasNoSafeKeywords = !msg.content
      .split(/\b/)
      .some((word) => safeKeywords.includes(word.toLowerCase()));

    const msgHasLink =
      msg.content.includes("http") &&
      !safeDomains.some((domain) => msg.content.includes(domain));

    if (
      atLeast(3)(
        msgHasPingKeywords,
        msgHasSpamKeywords,
        msgHasNoSafeKeywords,
        msgHasLink,
      )
    ) {
      await msg.react("💩");
    }
  },
};

export default autodelete;
