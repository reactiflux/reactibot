import type { ChannelHandlers } from "../types/index.js";
import { EmbedType } from "discord.js";

import { CHANNELS } from "../constants/channels.js";
import { EMBED_COLOR } from "./commands.js";
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
    const hasCurrencyKeyword =
      !ignoreDollar &&
      currencyKeywords.some((keyword) => content.includes(keyword));

    const keywordRegex = new RegExp(`\\b(${jobKeywords.join("|")})\\b`, "i");
    const containsJobKeyword = keywordRegex.test(content);
    if (!containsJobKeyword && !hasCurrencyKeyword) return;

    const warningMsg = `Oops <@${msg.author.id}>! This message looks more like a job/collaboration/advice post. Mind sharing that in <#${CHANNELS.jobBoard}> or <#${CHANNELS.lookingForGroup}> or <#${CHANNELS.jobsAdvice}> instead? If this was a mistake, please try again and ask your question. Appreciate you helping us keep channels on-topic.`;
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
    logger.log(
      "job keyword detected",
      `${msg.author.username} in <#${msg.channel.id}> \n${msg.content}`,
    );
    await msg
      .delete()
      .catch((e) => logger.log("failed to delete job posting message", e));
    setTimeout(() => {
      sentMsg
        .delete()
        .catch((e) =>
          logger.log("failed to delete auto reply to a job posting message", e),
        );
    }, 30_000);
  },
};
