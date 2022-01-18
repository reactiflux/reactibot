import { ChannelHandlers } from "../types";
import { isStaff } from "../helpers/discord";

const spamKeywords = ["nitro", "steam", "free", "gift", "airdrop"];

const safeKeywords = ["forhire", "hiring", "remote", "onsite"];

const safeDomains = [
  "https://discord.com",
  "https://www.reactiflux.com",
  "https://github.com",
  "https://developer.mozilla.org",
  "https://reactjs.org",
  "https://beta.reactjs.org",
  "https://nextjs.org",
];

const checkWords = (message: string, wordList: string[]) =>
  message.split(/\b/).some((word) => wordList.includes(word.toLowerCase()));

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

    const msgHasSpamKeywords = checkWords(msg.content, spamKeywords);

    const msgHasNoSafeKeywords = !checkWords(msg.content, safeKeywords);

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
