import { extractEmoji } from "../../helpers/string";
import {
  JobPostValidator,
  PostFailures,
  POST_FAILURE_REASONS,
} from "./job-mod-helpers";

export const normalizeContent = (content: string) => {
  return content.replace(/\n+/g, "\n").trim();
};

const NEWLINE = /\n/g;
export const formatting: JobPostValidator = (posts, message) => {
  // Handle missing tags;
  const hasTags = posts.every(
    ({ tags }) => tags.length > 0 || tags.includes("hiring") || tags.includes,
  );
  const errors: PostFailures[] = [];

  if (!hasTags) {
    errors.push({ type: POST_FAILURE_REASONS.missingType });
  }
  // If > 1 in 150 chars is an emoji
  const emojiCount = extractEmoji(message.content).length;
  if (emojiCount / message.content.length > 1 / 150) {
    errors.push({ type: POST_FAILURE_REASONS.tooManyEmojis });
  }
  const lineCount = message.content.match(NEWLINE)?.length || 0;
  if (lineCount > 18) {
    errors.push({ type: POST_FAILURE_REASONS.tooManyLines });
  }

  return errors;
};
