import type { ChannelHandlers } from "../types/index.d.ts";
import { EmbedType } from "discord.js";

//import { CHANNELS } from "../constants/channels.js";
import { EMBED_COLOR } from "./commands.js";

const jobKeywords = [
  "looking for work",
  "seeking opportunities",
  "available for hire",
  "open to work",
  "freelance available",
  "seeking a role",
  "looking for projects",
  "hire me",
  "job opportunities",
  "job offer",
  "job opportunity",
  "contact me",
  "actively seeking",
  "available for freelance",
  "remote position",
  "dm me",
  "reach out",
  "ready to join",
  "new opportunity",
  "open position",
  "seeking remote",
  "available now",
  "remote role",
  "remote opportunity",
  "full-time",
  "remote position",
  "job opportunities",
  "opportunities available",
  "new opportunity",
  "open for",
  "we’re hiring",
  "we are hiring",
];

const currencyKeywords = ["₹", "€", "$"];
const hasCodeBlockWithDollarSign = (content: string): boolean => {
  const codeBlockRegex = /```[\s\S]*?\$[\s\S]*?```/g;
  return codeBlockRegex.test(content);
};

export const messageScanner: ChannelHandlers = {
  handleMessage: async ({ msg }) => {
    if (msg.author.bot) return;

    const content = msg.content.toLowerCase();
    const ignoreDollar = hasCodeBlockWithDollarSign(content);
    const hasCurrencyKeyword =
      !ignoreDollar &&
      currencyKeywords.some((keyword) => content.includes(keyword));

    const keywordRegex = new RegExp(`\\b(${jobKeywords.join("|")})\\b`, "i");
    const containsJobKeyword = keywordRegex.test(content);
    if (!containsJobKeyword && !hasCurrencyKeyword) return;

    //const warningMsg = `Oops <@${msg.author.id}>! This message looks more like a job/collaboration/advice post. Mind sharing that in <#${CHANNELS.jobsLog}> or <#${CHANNELS.lookingForGroup}> or <#${CHANNELS.jobsAdvice}> instead? If this was a mistake, please try again and ask your question. Appreciate you helping us keep channels on-topic 🙌`;
    const sentMsg = await msg.reply({
      embeds: [
        {
          title: "Oops! Wrong Channel, Maybe?",
          type: EmbedType.Rich,
          description: warningMsg,
          color: EMBED_COLOR,
        },
      ],
    });
    await msg.delete();
    setTimeout(() => {
      sentMsg.delete().catch(console.error);
    }, 300_000);
  },
};
