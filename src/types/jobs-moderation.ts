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

export type JobPostValidator = (
  posts: Post[],
  message: Message<boolean>,
) => PostFailures[];

export const enum POST_FAILURE_REASONS {
  missingType = "missingType",
  inconsistentType = "inconsistentType",
  tooManyEmojis = "tooManyEmojis",
  tooLong = "tooLong",
  tooManyLines = "tooManyLines",
  tooManyGaps = "tooManyGaps",
  tooFrequent = "tooFrequent",
  replyOrMention = "replyOrMention",
  web3Content = "web3Content",
  web3Poster = "web3Poster",
  // invalidContact = 'invalidContact',
  // unknownLocation = 'unknownLocation',
  // invalidPostType = 'invalidPostType',
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
export interface PostFailureWeb3Content {
  type: POST_FAILURE_REASONS.web3Content;
  count: number;
  hiring: boolean;
  forHire: boolean;
}
export interface PostFailureWeb3Poster {
  type: POST_FAILURE_REASONS.web3Poster;
  count: number;
  hiring: boolean;
  forHire: boolean;
}
export type PostFailures =
  | PostFailureMissingType
  | PostFailureInconsistentType
  | PostFailureTooFrequent
  | PostFailureReplyOrMention
  | PostFailureTooLong
  | PostFailureTooManyLines
  | PostFailureTooManyGaps
  | PostFailureTooManyEmojis
  | PostFailureWeb3Content
  | PostFailureWeb3Poster;
