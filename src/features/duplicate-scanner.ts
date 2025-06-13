import type { ChannelHandlers } from "../types/index.js";
import { EmbedType } from "discord.js";

import { EMBED_COLOR } from "./commands.js";
const userMessageMap = new Map<string, Set<string>>();

// Time (ms) to keep track of duplicates (e.g., 30 sec)
const MESSAGE_CACHE_TTL = 60 * 0.5 * 1000;
const MAX_TRIVIAL_CHARACTERS = 10;

const normalizeContent = (content: string) =>
  content.trim().toLowerCase().replace(/\s+/g, " ");
export const messageDuplicateChecker: ChannelHandlers = {
  handleMessage: async ({ msg }) => {
    if (msg.author.bot) return;

    const content = normalizeContent(msg.content);
    const userId = msg.author.id;

    if (content.length < MAX_TRIVIAL_CHARACTERS) return;

    const existingUsers = userMessageMap.get(content);
    if (!existingUsers) {
      userMessageMap.set(content, new Set([userId]));

      // Auto-clean this entry
      setTimeout(() => {
        userMessageMap.delete(content);
      }, MESSAGE_CACHE_TTL);
      return;
    }
    if (!existingUsers.has(userId)) {
      existingUsers.add(userId);
      return;
    }

    await msg.delete().catch(console.error);
    const warningMsg = `Hey <@${userId}>, it looks like you've posted this message in another channel already. Please avoid cross-posting.`;
    const warning = await msg.channel.send({
      embeds: [
        {
          title: "Please do not cross-post.",
          type: EmbedType.Rich,
          description: warningMsg,
          color: EMBED_COLOR,
        },
      ],
    });

    // Auto-delete warning after 30 seconds
    setTimeout(() => {
      warning.delete().catch(console.error);
    }, 30_000);

    return;
  },
};
