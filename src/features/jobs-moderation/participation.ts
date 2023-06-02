import { differenceInDays } from "date-fns";
import { MessageType } from "discord.js";
import { JobPostValidator, POST_FAILURE_REASONS } from "./job-mod-helpers";
import { storedMessages } from "./job-mod-helpers";

const participationRules: JobPostValidator = (posts, message) => {
  // Block replies and mentions
  if (message.type === MessageType.Reply || message.mentions.members?.size) {
    // if (message.type === "REPLY" || (message.mentions.members?.size || 0) > 0) {
    return [{ type: POST_FAILURE_REASONS.replyOrMention }];
  }

  // Handle posting too frequently
  const now = Date.now();
  const existingMessage = storedMessages.find(
    (m) => m.authorId === message.author.id,
  );
  if (existingMessage) {
    const lastSent = differenceInDays(now, existingMessage.createdAt);
    return [{ type: POST_FAILURE_REASONS.tooFrequent, lastSent }];
  }
  return [];
};

export default participationRules;
