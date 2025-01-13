import {
  CircumventedRules,
  POST_FAILURE_REASONS,
  PostFailures,
  PostFailureTooFrequent,
  PostFailureTooLong,
  PostFailureTooManyLines,
} from "../../types/jobs-moderation.js";
import {
  failedCircumventedRules,
  failedMissingType,
  failedReplyOrMention,
  failedTooManyLines,
  failedTooManyEmojis,
  failedTooFrequent,
  failedInconsistentType,
  failedTooLong,
  failedTooManyGaps,
  failedLinkRequired,
} from "./job-mod-helpers.js";

const ValidationMessages = {
  [POST_FAILURE_REASONS.circumventedRules]: (e: CircumventedRules) =>
    `Your message was removed after you edited it so that it no longer complies with our formatting rules. ${e.recentEdit ? "Please re-post." : ""}`,
  [POST_FAILURE_REASONS.missingType]:
    "Your post does not include our required `[HIRING]` or `[FOR HIRE]` tag. Make sure the first line of your post includes `[HIRING]` if you’re looking to pay someone for their work, and `[FOR HIRE]` if you’re offering your services.",
  [POST_FAILURE_REASONS.inconsistentType]:
    "Your message has multiple job postings, but the types are inconsistent. Please only post `[FOR HIRE]` or `[HIRING]` posts.",
  [POST_FAILURE_REASONS.tooManyEmojis]: "Your post has too many emojis.",
  [POST_FAILURE_REASONS.tooLong]: (e: PostFailureTooLong) =>
    `Your post is too long, please shorten it by ${e.overage} characters.`,
  [POST_FAILURE_REASONS.linkRequired]: `Hiring posts must include a link, either to the company website or a page to apply for the job. Make sure it includes \`https://\` so Discord makes it clickable.`,
  [POST_FAILURE_REASONS.tooManyLines]: (e: PostFailureTooManyLines) =>
    `Your post has too many lines, please shorten it by ${e.overage} lines.`,
  [POST_FAILURE_REASONS.tooManyGaps]:
    "Your post has too many spaces between lines, please make sure it’s either single spaced or double spaced.",
  [POST_FAILURE_REASONS.tooFrequent]: (e: PostFailureTooFrequent) =>
    `You’re posting too frequently. You last posted ${e.lastSent} days ago, please wait at least 7 days.`,
  [POST_FAILURE_REASONS.replyOrMention]:
    "Messages in this channel may not be replies or include @-mentions of users due to a history of posters incorrectly attempting to 'apply' by replying within a thread or reply.",
};

export const getValidationMessage = (reason: PostFailures): string => {
  if (failedCircumventedRules(reason)) {
    return ValidationMessages[reason.type](reason);
  }
  if (failedMissingType(reason)) {
    return ValidationMessages[reason.type];
  }
  if (failedInconsistentType(reason)) {
    return ValidationMessages[reason.type];
  }
  if (failedTooFrequent(reason)) {
    return ValidationMessages[reason.type](reason);
  }
  if (failedReplyOrMention(reason)) {
    return ValidationMessages[reason.type];
  }
  if (failedTooLong(reason)) {
    return ValidationMessages[reason.type](reason);
  }
  if (failedLinkRequired(reason)) {
    return ValidationMessages[reason.type];
  }
  if (failedTooManyLines(reason)) {
    return ValidationMessages[reason.type](reason);
  }
  if (failedTooManyGaps(reason)) {
    return ValidationMessages[reason.type];
  }
  if (failedTooManyEmojis(reason)) {
    return ValidationMessages[reason.type];
  }
  return "";
};
