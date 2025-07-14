import type { ChannelHandlers, HandleMessageArgs } from "../../types/index.js";
import { EmbedType } from "discord.js";

import { EMBED_COLOR } from "../commands.js";
import { LRUCache } from "lru-cache";
import { isStaff, isHelpful } from "../../helpers/discord.js";
import { logger } from "../log.js";
import { truncateMessage } from "../../helpers/modLog.js";
import { formatWithEllipsis } from "./helper.js";
import cooldown from "../cooldown.js";
const maxMessagesPerUser = 5; // Maximum number of messages per user to track
// Time (ms) to keep track of duplicates (e.g., 30 sec)
export const duplicateCache = new LRUCache<string, Set<string>>({
  max: 100,
  ttl: 1000 * 60 * 0.5,
  dispose: (value) => {
    value.clear();
  },
});
const maxTrivialCharacters = 10;
const removeFirstElement = (messages: Set<string>) => {
  const iterator = messages.values();
  const firstElement = iterator.next().value;
  if (firstElement) {
    messages.delete(firstElement);
  }
};

const handleDuplicateMessage = async ({
  msg,
  userId,
}: HandleMessageArgs & { userId: string }) => {
  await msg.delete().catch(console.error);
  const cooldownKey = `resume-${msg.channelId}`;
  if (cooldown.hasCooldown(userId, cooldownKey)) {
    return;
  }
  cooldown.addCooldown(userId, cooldownKey);
  const warningMsg = `Hey <@${userId}>, it looks like you've posted this message in another channel already. Please avoid cross-posting.`;
  const warning = await msg.channel.send({
    embeds: [
      {
        title: "Duplicate Message Detected",
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

  logger.log(
    "duplicate message detected",
    `${msg.author.username} in <#${msg.channel.id}> \n${formatWithEllipsis(truncateMessage(msg.content, 100))}`,
  );
  return;
};
const normalizeContent = (content: string) =>
  content.trim().toLowerCase().replace(/\s+/g, " ");
export const messageDuplicateChecker: ChannelHandlers = {
  handleMessage: async ({ msg, bot }) => {
    if (msg.author.bot || isStaff(msg.member) || isHelpful(msg.member)) return;

    const content = normalizeContent(msg.content);
    const userId = msg.author.id;

    if (content.length < maxTrivialCharacters) return;

    const userMessages = duplicateCache.get(userId);

    if (!userMessages) {
      const messages = new Set<string>();
      messages.add(content);
      duplicateCache.set(userId, messages);
      return;
    }

    if (userMessages.has(content)) {
      await handleDuplicateMessage({ msg, bot, userId });
      return;
    }

    if (userMessages.size >= maxMessagesPerUser) {
      removeFirstElement(userMessages);
    }

    userMessages.add(content);
  },
};
