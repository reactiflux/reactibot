import { add, compareAsc, differenceInDays } from "date-fns";
import {
  Client,
  Message,
  PartialMessage,
  Snowflake,
  TextChannel,
} from "discord.js";

export class RuleViolation extends Error {
  reasons: POST_FAILURE_REASONS[];
  constructor(reasons: POST_FAILURE_REASONS[]) {
    super("Job Mod Rule violation");
    this.reasons = reasons;
  }
}

export const enum POST_FAILURE_REASONS {
  missingType = "missingType",
  tooManyEmojis = "tooManyEmojis",
  tooManyLines = "tooManyLines",
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
export interface PostFailureTooManyEmojis {
  type: POST_FAILURE_REASONS.tooManyEmojis;
}
export interface PostFailureTooManyLines {
  type: POST_FAILURE_REASONS.tooManyLines;
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
  | PostFailureTooFrequent
  | PostFailureReplyOrMention
  | PostFailureTooManyLines
  | PostFailureTooManyEmojis
  | PostFailureWeb3Content
  | PostFailureWeb3Poster;

export const failedMissingType = (
  e: PostFailures,
): e is PostFailureMissingType => e.type === POST_FAILURE_REASONS.missingType;
export const failedTooFrequent = (
  e: PostFailures,
): e is PostFailureTooFrequent => e.type === POST_FAILURE_REASONS.tooFrequent;
export const failedReplyOrMention = (
  e: PostFailures,
): e is PostFailureReplyOrMention =>
  e.type === POST_FAILURE_REASONS.replyOrMention;
export const failedTooManyLines = (
  e: PostFailures,
): e is PostFailureTooManyLines => e.type === POST_FAILURE_REASONS.tooManyLines;
export const failedTooManyEmojis = (
  e: PostFailures,
): e is PostFailureTooManyEmojis =>
  e.type === POST_FAILURE_REASONS.tooManyEmojis;
export const failedWeb3Content = (
  e: PostFailures,
): e is PostFailureWeb3Content => e.type === POST_FAILURE_REASONS.web3Content;
export const failedWeb3Poster = (e: PostFailures): e is PostFailureWeb3Poster =>
  e.type === POST_FAILURE_REASONS.web3Poster;

export interface Post {
  tags: string[];
  description: string;
  // contact: string;
}

export type JobPostValidator = (
  posts: Post[],
  message: Message<boolean>,
) => PostFailures[];

interface StoredMessage {
  id: Snowflake;
  authorId: Snowflake;
  createdAt: Date;
}
export const storedMessages: Array<StoredMessage> = [];

const DAYS_OF_POSTS = 7;

export const loadJobs = async (bot: Client, channel: TextChannel) => {
  const now = new Date();

  let oldestMessage: typeof storedMessages[0] | undefined;

  // Iteratively add all messages that are less than DAYS_OF_POSTS days old.
  // Fetch by 10 messages at a time, paging through the channel history.
  while (
    !oldestMessage ||
    differenceInDays(now, oldestMessage.createdAt) < DAYS_OF_POSTS
  ) {
    const newMessages: typeof storedMessages = (
      await channel.messages.fetch({
        limit: 10,
        ...(oldestMessage ? { after: oldestMessage.id } : {}),
      })
    ).map(({ id, author, createdAt }) => ({
      id,
      authorId: author.id,
      createdAt,
    }));
    if (newMessages.length === 0) {
      return;
    }
    oldestMessage = newMessages
      .sort((a, b) => compareAsc(a.createdAt, b.createdAt))
      .at(-1);
    if (!oldestMessage) break;

    storedMessages.push(
      ...newMessages
        .filter(
          (m) =>
            differenceInDays(now, m.createdAt) < DAYS_OF_POSTS &&
            m.authorId !== bot.user?.id,
        )
        .values(),
    );
    console.log(storedMessages.length);
  }
};

export const updateJobs = (message: Message) => {
  storedMessages.push({
    id: message.id,
    authorId: message.author.id,
    createdAt: message.createdAt,
  });

  // Allow posts every 6.75 days by pretending "now" is 6 hours in the future
  const now = add(new Date(), { hours: 6 });
  // Remove all posts that are older than the limit
  while (
    storedMessages[0] &&
    differenceInDays(now, storedMessages[0].createdAt) >= DAYS_OF_POSTS
  ) {
    storedMessages.shift();
  }
};
export const removeSpecificJob = (message: Message) => {
  storedMessages.splice(storedMessages.findIndex((m) => m.id === message.id));
};

export const purgeMember = (idToRemove: string) => {
  let removed = 0;
  console.log({ storedMessages });

  let index = storedMessages.findIndex((x) => x.authorId === idToRemove);
  while (index > 0) {
    removed += 1;
    storedMessages.splice(index, 1);
    index = storedMessages.findIndex((x) => x.authorId === idToRemove);
  }
  return removed;
};

// Moderated message IDs are used to avoid creating deletion logs for removed
const moderatedMessageIds: Set<string> = new Set();
export const trackModeratedMessage = (message: Message) =>
  moderatedMessageIds.add(message.id);
export const untrackModeratedMessage = (message: Message | PartialMessage) => {
  if (moderatedMessageIds.has(message.id)) {
    moderatedMessageIds.delete(message.id);
    return true;
  }
  return false;
};
