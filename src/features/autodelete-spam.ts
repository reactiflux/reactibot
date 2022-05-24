import { ChannelHandlers } from "../types";
import { isStaff } from "../helpers/discord";
import { sleep } from "../helpers/misc";

const spamKeywords = ["nitro", "steam", "free", "gift", "airdrop"];

const safeKeywords = ["forhire", "hiring", "remote", "onsite"];

const spamPings = ["@everyone", "@here"];

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

const getPingCount = (content: string) => {
  return spamPings.reduce(
    (sum, pingKeyword) => (content.includes(pingKeyword) ? sum + 1 : sum),
    0,
  );
};

const getSpamScore = (content: string) => {
  const pingCount = getPingCount(content);

  const words = content.split(" ");
  const includedSpamKeywords = words
    .map((word) => spamKeywords.includes(word))
    .filter(Boolean);

  const hasSafeKeywords = checkWords(content, safeKeywords);

  const hasLink =
    content.includes("http") &&
    !safeDomains.some((domain) => content.includes(domain));

  return (
    Number(hasLink) +
    includedSpamKeywords.length +
    // Pinging everyone is always treated as spam
    Number(pingCount) * 5 -
    // If it's a job post, then it's probably  not spam
    Number(hasSafeKeywords) * 10
  );
};

const autodelete: ChannelHandlers = {
  handleMessage: async ({ msg: maybeMessage }) => {
    if (isStaff(maybeMessage.member)) return;

    const msg = maybeMessage.partial
      ? await maybeMessage.fetch()
      : maybeMessage;
    if (!msg.guild) return;

    if (getPingCount(msg.content) > 0) {
      msg
        .reply({
          embeds: [
            {
              title: "Tsk tsk.",
              description: `Please do **not** try to use \`@here\` or \`@everyone\` - there are ${msg.guild.memberCount} members in Reactiflux. Everybody here is a volunteer, and somebody will respond when they can.`,
              color: "#BA0C2F",
            },
          ],
        })
        .then(async (tsk) => {
          await sleep(15);
          tsk.delete();
        });
    }
    const spamScore = getSpamScore(msg.content);

    if (spamScore >= 3) {
      await msg.react("💩");
    }
  },
};

export default autodelete;
