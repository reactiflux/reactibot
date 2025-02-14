import type { Message } from "discord.js";

export interface Post {
  tags: string[];
  description: string;
  // contact: string;
}

export enum PostType {
  hiring = "hiring",
  forHire = "forhire",
}

export type JobPostValidator<WithMessage = true> = (
  posts: Post[],
  message: WithMessage extends true
    ? Message<boolean>
    : Message<boolean> | undefined,
) => PostFailures[];

export const enum POST_FAILURE_REASONS {
  missingType = "missingType",
  inconsistentType = "inconsistentType",
  tooManyEmojis = "tooManyEmojis",
  tooLong = "tooLong",
  linkRequired = "linkRequired",
  tooManyLines = "tooManyLines",
  tooManyGaps = "tooManyGaps",
  tooFrequent = "tooFrequent",
  replyOrMention = "replyOrMention",
  circumventedRules = "circumventedRules",
  // invalidContact = 'invalidContact',
  // unknownLocation = 'unknownLocation',
  // invalidPostType = 'invalidPostType',
}

export interface CircumventedRules {
  type: POST_FAILURE_REASONS.circumventedRules;
  recentEdit: boolean;
}
export interface PostFailureMissingType {
  type: POST_FAILURE_REASONS.missingType;
}
export interface PostFailureInconsistentType {
  type: POST_FAILURE_REASONS.inconsistentType;
}
export interface PostFailureTooManyEmojis {
  type: POST_FAILURE_REASONS.tooManyEmojis;
}
export interface PostFailureTooManyLines {
  type: POST_FAILURE_REASONS.tooManyLines;
  overage: number;
}
export interface PostFailureTooLong {
  type: POST_FAILURE_REASONS.tooLong;
  overage: number;
}
export interface PostFailureLinkRequired {
  type: POST_FAILURE_REASONS.linkRequired;
}
export interface PostFailureTooManyGaps {
  type: POST_FAILURE_REASONS.tooManyGaps;
}
export interface PostFailureTooFrequent {
  type: POST_FAILURE_REASONS.tooFrequent;
  lastSent: number;
}
export interface PostFailureReplyOrMention {
  type: POST_FAILURE_REASONS.replyOrMention;
}
export type PostFailures =
  | CircumventedRules
  | PostFailureMissingType
  | PostFailureInconsistentType
  | PostFailureTooFrequent
  | PostFailureReplyOrMention
  | PostFailureLinkRequired
  | PostFailureTooLong
  | PostFailureTooManyLines
  | PostFailureTooManyGaps
  | PostFailureTooManyEmojis;
