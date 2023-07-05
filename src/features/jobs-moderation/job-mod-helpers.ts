import { add, compareAsc, differenceInDays, differenceInHours } from "date-fns";
import {
  Client,
  Message,
  PartialMessage,
  Snowflake,
  TextChannel,
} from "discord.js";
import { constructDiscordLink } from "../../helpers/discord";
import { ReportReasons, reportUser } from "../../helpers/modLog";
import { parseContent, Post, PostType } from "./parse-content";

export class RuleViolation extends Error {
  reasons: POST_FAILURE_REASONS[];
  constructor(reasons: POST_FAILURE_REASONS[]) {
    super("Job Mod Rule violation");
    this.reasons = reasons;
  }
}

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

export const failedMissingType = (
  e: PostFailures,
): e is PostFailureMissingType => e.type === POST_FAILURE_REASONS.missingType;
export const failedInconsistentType = (
  e: PostFailures,
): e is PostFailureInconsistentType =>
  e.type === POST_FAILURE_REASONS.inconsistentType;
export const failedTooFrequent = (
  e: PostFailures,
): e is PostFailureTooFrequent => e.type === POST_FAILURE_REASONS.tooFrequent;
export const failedReplyOrMention = (
  e: PostFailures,
): e is PostFailureReplyOrMention =>
  e.type === POST_FAILURE_REASONS.replyOrMention;
export const failedTooLong = (e: PostFailures): e is PostFailureTooLong =>
  e.type === POST_FAILURE_REASONS.tooLong;
export const failedTooManyLines = (
  e: PostFailures,
): e is PostFailureTooManyLines => e.type === POST_FAILURE_REASONS.tooManyLines;
export const failedTooManyGaps = (
  e: PostFailures,
): e is PostFailureTooManyGaps => e.type === POST_FAILURE_REASONS.tooManyGaps;
export const failedTooManyEmojis = (
  e: PostFailures,
): e is PostFailureTooManyEmojis =>
  e.type === POST_FAILURE_REASONS.tooManyEmojis;
export const failedWeb3Content = (
  e: PostFailures,
): e is PostFailureWeb3Content => e.type === POST_FAILURE_REASONS.web3Content;
export const failedWeb3Poster = (e: PostFailures): e is PostFailureWeb3Poster =>
  e.type === POST_FAILURE_REASONS.web3Poster;

export type JobPostValidator = (
  posts: Post[],
  message: Message<boolean>,
) => PostFailures[];

interface StoredMessage {
  message: Message;
  authorId: Snowflake;
  createdAt: Date;
  type: PostType;
}
export const jobBoardMessageCache: Array<StoredMessage> = [];

const DAYS_OF_POSTS = 30;

export const loadJobs = async (bot: Client, channel: TextChannel) => {
  const now = new Date();

  let oldestMessage: typeof jobBoardMessageCache[0] | undefined;

  // Iteratively add all messages that are less than DAYS_OF_POSTS days old.
  // Fetch by 10 messages at a time, paging through the channel history.
  while (
    !oldestMessage ||
    differenceInDays(now, oldestMessage.createdAt) < DAYS_OF_POSTS
  ) {
    const newMessages: typeof jobBoardMessageCache = (
      await channel.messages.fetch({
        limit: 10,
        ...(oldestMessage ? { after: oldestMessage.message.id } : {}),
      })
    )
      // Convert fetched messages to be stored in the cache
      .map((message) => ({
        message,
        authorId: message.author.id,
        createdAt: message.createdAt,
        // By searching for "hiring", we treat posts without tags as "forhire",
        // which makes the subject to deletion after aging out. This will only be
        // relevant when this change is first shipped, because afterwards all
        // un-tagged posts will be removed.
        type: parseContent(message.content)[0].tags.includes("hiring")
          ? PostType.hiring
          : PostType.forHire,
      }));
    if (newMessages.length === 0) {
      break;
    }
    oldestMessage = newMessages
      .sort((a, b) => compareAsc(a.createdAt, b.createdAt))
      .at(-1);
    if (!oldestMessage) break;

    jobBoardMessageCache.push(
      ...newMessages
        .filter(
          (m) =>
            differenceInDays(now, m.createdAt) < DAYS_OF_POSTS &&
            m.authorId !== bot.user?.id,
        )
        .values(),
    );
  }
};

const POST_INTERVAL = 7;
const FORHIRE_AGE_LIMIT = 1.25;

export const deleteAgedPosts = async () => {
  // Delete all `forhire` messages that are older than the age limit
  const forHirePosts = jobBoardMessageCache.filter(
    (p) => p.type === PostType.forHire,
  );
  console.log(
    `[INFO]: deleteAgedPosts() ${
      forHirePosts.length
    } forhire posts. max age is ${FORHIRE_AGE_LIMIT} JSON: \`${JSON.stringify(
      forHirePosts.map(({ message, ...p }) => ({
        ...p,
        hoursOld: differenceInHours(new Date(), p.createdAt),
        messageId: message.id,
      })),
    )}\``,
  );
  while (
    forHirePosts[0] &&
    differenceInHours(new Date(), jobBoardMessageCache[0].createdAt) >=
      FORHIRE_AGE_LIMIT
  ) {
    const { message } = jobBoardMessageCache[0];
    await message.fetch();
    if (!message.deletable) {
      console.log(
        `[DEBUG] deleteAgedPosts() message '${constructDiscordLink(
          message,
        )}' not deletable`,
      );
      return;
    }
    trackModeratedMessage(message);
    // Log deletion so we have a record of it
    reportUser({ reason: ReportReasons.jobAge, message });
    await message.delete();
    jobBoardMessageCache.shift();
    console.log(
      `[INFO]: deleteAgedPosts() deleted post ${constructDiscordLink(message)}`,
    );
  }
};

export const updateJobs = (message: Message) => {
  // Assume all posts in a message have the same tag
  const [parsed] = parseContent(message.content);
  console.log(
    `[INFO]: updateJobs() adding new post to cache. JSON:${JSON.stringify({
      authorId: message.author.id,
      createdAt: message.createdAt,
      type: parsed.tags.includes("forhire")
        ? PostType.forHire
        : PostType.hiring,
    })}}`,
  );
  jobBoardMessageCache.push({
    message,
    authorId: message.author.id,
    createdAt: message.createdAt,
    type: parsed.tags.includes("forhire") ? PostType.forHire : PostType.hiring,
  });

  // Allow posts every 6.75 days by pretending "now" is 6 hours in the future
  const now = add(new Date(), { hours: 6 });
  // Remove all posts that are older than the limit
  while (
    jobBoardMessageCache[0] &&
    differenceInDays(now, jobBoardMessageCache[0].createdAt) >= POST_INTERVAL
  ) {
    jobBoardMessageCache.shift();
  }
};
export const removeSpecificJob = (message: Message) => {
  jobBoardMessageCache.splice(
    jobBoardMessageCache.findIndex((m) => m.message.id === message.id),
  );
};

export const purgeMember = (idToRemove: string) => {
  let removed = removeFromCryptoCache(idToRemove);

  let index = jobBoardMessageCache.findIndex((x) => x.authorId === idToRemove);
  while (index >= 0) {
    removed += 1;
    jobBoardMessageCache.splice(index, 1);
    index = jobBoardMessageCache.findIndex((x) => x.authorId === idToRemove);
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

const cryptoPosters: Map<string, { count: number; last: Date }> = new Map();
export const removeFromCryptoCache = (idToClear: string) => {
  if (cryptoPosters.has(idToClear)) {
    cryptoPosters.delete(idToClear);
    return 1;
  }
  return 0;
};
export const getCryptoCache = cryptoPosters.get.bind(cryptoPosters);
export const setCryptoCache = cryptoPosters.set.bind(cryptoPosters);
