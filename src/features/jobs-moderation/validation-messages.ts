import {
  PostFailures,
  PostFailureTooFrequent,
  PostFailureTooLong,
  failedMissingType,
  failedReplyOrMention,
  failedTooManyLines,
  failedTooManyEmojis,
  POST_FAILURE_REASONS,
  failedTooFrequent,
  failedWeb3Content,
  failedWeb3Poster,
  failedInconsistentType,
  PostFailureTooManyLines,
  failedTooLong,
  failedTooManyGaps,
} from "./job-mod-helpers";

const ValidationMessages = {
  [POST_FAILURE_REASONS.missingType]:
    "Your post does not include our required `HIRING` or `FOR HIRE` tag. Make sure the first line of your post includes `HIRING` if you’re looking to pay someone for their work, and `FOR HIRE` if you’re offering your services.",
  [POST_FAILURE_REASONS.inconsistentType]:
    "Your message has multiple job postings, but the types are inconsistent. Please only post FOR HIRE or HIRING posts.",
  [POST_FAILURE_REASONS.tooManyEmojis]: "Your post has too many emojis.",
  [POST_FAILURE_REASONS.tooLong]: (e: PostFailureTooLong) =>
    `Your post is too long. Reduce its length by ${e.overage} characters.`,
  [POST_FAILURE_REASONS.tooManyLines]: (e: PostFailureTooManyLines) =>
    `Your post has too many lines. Reduce its length by ${e.overage} lines.`,
  [POST_FAILURE_REASONS.tooManyGaps]:
    "Your post has too many spaces between lines. Make sure it’s either single spaced or double spaced.",
  [POST_FAILURE_REASONS.tooFrequent]: (e: PostFailureTooFrequent) =>
    `You’re posting too frequently. You last posted ${e.lastSent} days ago, please wait at least 7 days.`,
  [POST_FAILURE_REASONS.replyOrMention]:
    "Messages in this channel may not be replies or include @-mentions of users, to ensure the channel isn’t being used to discuss postings.",
  [POST_FAILURE_REASONS.web3Content]:
    "We do not allow web3 positions to be advertised here. If you continue posting, you’ll be timed out overnight.",
  [POST_FAILURE_REASONS.web3Poster]:
    "We do not allow posers who arrived to post web3 positions to create posts. If you continue posting, you’ll be timed out overnight.",
};

export const getValidationMessage = (reason: PostFailures): string => {
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
  if (failedTooManyLines(reason)) {
    return ValidationMessages[reason.type](reason);
  }
  if (failedTooManyGaps(reason)) {
    return ValidationMessages[reason.type];
  }
  if (failedTooManyEmojis(reason)) {
    return ValidationMessages[reason.type];
  }
  if (failedWeb3Content(reason)) {
    return ValidationMessages[reason.type];
  }
  if (failedWeb3Poster(reason)) {
    return ValidationMessages[reason.type];
  }
  return "";
};
