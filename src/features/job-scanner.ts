import type { ChannelHandlers } from "../types/index.js";
import { isStaff, isHelpful } from "../helpers/discord.js";
import { logger } from "./log.js";

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
  "job opportunities",
  "opportunities available",
  "new opportunity",
  "open for",
  "we’re hiring",
  "we are hiring",
];

const currencyKeywords = ["₹", "€", "$"];
const hasCodeBlockWithDollarSign = (content: string): boolean => {
  const codeBlockRegex = /(`{1,3})([\s\S]*?\$[\s\S]*?)\1/g;
  return codeBlockRegex.test(content);
};

export const jobScanner: ChannelHandlers = {
  handleMessage: async ({ msg }) => {
    if (msg.author.bot || isStaff(msg.member) || isHelpful(msg.member)) return;

    const content = msg.content.toLowerCase();
    const ignoreDollar = hasCodeBlockWithDollarSign(content);

    const currencyMatches = !ignoreDollar
      ? currencyKeywords.filter((keyword) => content.includes(keyword))
      : [];
    const keywordRegex = new RegExp(`\\b(${jobKeywords.join("|")})\\b`, "i");
    const jobKeywordMatches = content.match(keywordRegex) || [];
    const uniqueJobKeywordMatches = new Set([...jobKeywordMatches]);

    if (currencyMatches.length === 0 && jobKeywordMatches.length === 0) return;
    logger.log(
      "job keyword detected",
      `${msg.author.username} in <#${msg.channel.id}> \n*Content:* ${msg.content} \n*Matched Keywords:* ${[
        ...currencyMatches,
        ...uniqueJobKeywordMatches,
      ].join(", ")}`,
    );
  },
};
