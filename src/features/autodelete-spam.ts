import { ChannelHandlers } from "../types";
import { isStaff } from "../helpers/discord";
import { simplifyString } from "../helpers/modLog";

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

const autodelete: ChannelHandlers = {
  handleMessage: async ({ msg: maybeMessage }) => {
    if (isStaff(maybeMessage.member)) return;

    const msg = maybeMessage.partial
      ? await maybeMessage.fetch()
      : maybeMessage;

    const msgHasPingKeywords = ["@everyone", "@here"].some((pingKeyword) =>
      msg.content.includes(pingKeyword),
    );

    const content = simplifyString(msg.content);
    const words = content.split(" ");
    const msgSpamKeywords = words
      .map((word) => spamKeywords.includes(word))
      .filter(Boolean);

    const msgHasSafeKeywords = checkWords(msg.content, safeKeywords);

    const msgHasLink =
      msg.content.includes("http") &&
      !safeDomains.some((domain) => msg.content.includes(domain));

    const spamScore =
      Number(msgHasLink) +
      msgSpamKeywords.length +
      // Pinging everyone is always treated as spam
      Number(msgHasPingKeywords) * 5 -
      // If it's a job post, then it's probably  not spam
      Number(msgHasSafeKeywords) * 10;

    if (spamScore > 3) {
      await msg.react("💩");
    }
  },
};

export default autodelete;
