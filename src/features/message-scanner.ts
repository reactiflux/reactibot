import type { ChannelHandlers } from "../types/index.d.ts";
import { EmbedType } from "discord.js";

import { CHANNELS } from "../constants/channels.js";
import { EMBED_COLOR } from "./commands.js";

const delayInMilliseconds = 300000; // 5 mins

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
  "frontend developer",
  "full stack developer",
  "software engineer",
  "open for",
  "₹",
  "$",
  "€",
];

export const messageScanner: ChannelHandlers = {
  handleMessage: async ({ msg }) => {
    if (msg.author.bot) return;

    const content = msg.content.toLowerCase();

    if (content.includes("?") || content.includes("```")) return;

    const containsJobKeyword = jobKeywords.some((keyword) =>
      content.includes(keyword),
    );

    if (containsJobKeyword) {
      const warningMsg = `Oops <@${msg.author.id}>! This message looks more like a job post or intro. Mind sharing that in <#${CHANNELS.jobsLog}> or <#${CHANNELS.introduction}> instead? If this was a mistake, please try again and ask your question. Appreciate you helping us keep channels on-topic 🙌`;
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
      }, delayInMilliseconds);
    }
  },
};
