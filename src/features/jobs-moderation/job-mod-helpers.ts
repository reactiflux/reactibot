import {
  add,
  compareAsc,
  differenceInDays,
  differenceInHours,
  format,
} from "date-fns";
import {
  Client,
  Message,
  PartialMessage,
  Snowflake,
  TextChannel,
} from "discord.js";
import { constructDiscordLink, isStaff } from "../../helpers/discord.js";
import { partition } from "../../helpers/array.js";
import { ReportReasons, reportUser } from "../../helpers/modLog.js";
import { parseContent } from "./parse-content.js";
import {
  POST_FAILURE_REASONS,
  PostFailureInconsistentType,
  PostFailureMissingType,
  PostFailureReplyOrMention,
  PostFailureTooFrequent,
  PostFailureTooLong,
  PostFailureTooManyEmojis,
  PostFailureTooManyGaps,
  PostFailureTooManyLines,
  PostFailures,
  PostType,
  PostFailureLinkRequired,
  CircumventedRules,
} from "../../types/jobs-moderation.js";

export const failedCircumventedRules = (
  e: PostFailures,
): e is CircumventedRules => e.type === POST_FAILURE_REASONS.circumventedRules;
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
export const failedLinkRequired = (
  e: PostFailures,
): e is PostFailureLinkRequired => e.type === POST_FAILURE_REASONS.linkRequired;
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

interface StoredMessage {
  message: Message;
  authorId: Snowflake;
  createdAt: Date;
  description: string;
  tags: string[];
  type: PostType;
}
let jobBoardMessageCache: {
  forHire: StoredMessage[];
  hiring: StoredMessage[];
} = { forHire: [], hiring: [] };

export const getJobPosts = () => {
  return {
    hiring: jobBoardMessageCache.hiring,
    forHire: jobBoardMessageCache.forHire,
  };
};

const DAYS_OF_POSTS = 90;

export const loadJobs = async (bot: Client, channel: TextChannel) => {
  const now = new Date();

  let oldestMessage: StoredMessage | undefined;

  // Iteratively add all messages that are less than DAYS_OF_POSTS days old.
  while (
    !oldestMessage ||
    differenceInDays(now, oldestMessage.createdAt) < DAYS_OF_POSTS
  ) {
    const messages = await channel.messages.fetch(
      oldestMessage ? { before: oldestMessage.message.id } : {},
    );
    console.log(
      "[DEBUG] loadJobs()",
      `Oldest message: ${oldestMessage ? oldestMessage.createdAt : "none"}.`,
      "Just fetched",
      messages.size,
      "messages",
      messages
        .map(
          (m) =>
            `${m.author.username}, ${differenceInDays(now, m.createdAt)} days old`,
        )
        .join("; "),
    );
    const newMessages: StoredMessage[] = messages
      // Convert fetched messages to be stored in the cache
      .map((message) => {
        const { tags, description } = parseContent(message.content)[0];
        return {
          message,
          authorId: message.author.id,
          createdAt: message.createdAt,
          description,
          tags,
          // By searching for "hiring", we treat posts without tags as "forhire",
          // which makes the subject to deletion after aging out. This will only be
          // relevant when this change is first shipped, because afterwards all
          // un-tagged posts will be removed.
          type: tags.includes("hiring") ? PostType.hiring : PostType.forHire,
        };
      });
    if (newMessages.length === 0) {
      break;
    }
    oldestMessage = newMessages
      .sort((a, b) => compareAsc(a.createdAt, b.createdAt))
      .at(0);
    if (!oldestMessage) break;

    const humanNonStaffMessages = newMessages.filter(
      (m) =>
        differenceInDays(now, m.createdAt) < DAYS_OF_POSTS &&
        !m.message.system &&
        !isStaff(m.message.member) &&
        m.authorId !== bot.user?.id,
    );
    const [hiring, forHire] = partition(
      (m) => m.type === PostType.hiring,
      humanNonStaffMessages,
    );

    jobBoardMessageCache = { hiring, forHire };
  }
};

const POST_INTERVAL = 7;
const FORHIRE_AGE_LIMIT = 1.25 * 48;

export const deleteAgedPosts = async () => {
  // Delete all `forhire` messages that are older than the age limit
  console.log(
    `[INFO] deleteAgedPosts() ${
      jobBoardMessageCache.forHire.length
    } forhire posts. max age is ${FORHIRE_AGE_LIMIT} hours JSON: \`${JSON.stringify(
      jobBoardMessageCache.forHire.map(({ message, ...p }) => ({
        ...p,
        hoursOld: differenceInHours(new Date(), p.createdAt),
        messageId: message.id,
      })),
    )}\``,
  );
  while (
    jobBoardMessageCache.forHire[0] &&
    differenceInDays(new Date(), jobBoardMessageCache.forHire[0].createdAt) <
      90 &&
    differenceInHours(new Date(), jobBoardMessageCache.forHire[0].createdAt) >=
      FORHIRE_AGE_LIMIT
  ) {
    const { message } = jobBoardMessageCache.forHire[0];
    jobBoardMessageCache.forHire.shift();
    try {
      await message.fetch();
      if (!message.deletable) {
        console.log(
          `[DEBUG] deleteAgedPosts() message '${constructDiscordLink(
            message,
          )}' not deletable`,
        );
        return;
      }
      if (isStaff(message.member)) {
        return;
      }
      trackModeratedMessage(message);
      // Log deletion so we have a record of it
      reportUser({
        reason: ReportReasons.jobAge,
        message,
        extra: `Originally sent ${format(new Date(message.createdAt), "P p")}`,
      });
      await message.delete();
      console.log(
        `[INFO]: deleteAgedPosts() deleted post ${constructDiscordLink(
          message,
        )}`,
      );
    } catch (e) {
      console.log(
        "[DEBUG]",
        `deleteAgedPosts() message '${constructDiscordLink(
          message,
        )}' not found, originally sent by ${
          message.author.username
        } at ${format(message.createdAt, "P p")}. Message cache (${
          jobBoardMessageCache.forHire.length
        } entries) has: [${jobBoardMessageCache.forHire
          .map(
            (c) =>
              `${c.message.id} ${c.message.author.username} ${format(
                c.message.createdAt,
                "P p",
              )}`,
          )
          .join(",\n")}]
${e}`,
      );
    }
  }
};

export const updateJobs = (message: Message) => {
  // Assume all posts in a message have the same tag
  const [parsed] = parseContent(message.content);
  const type = parsed.tags.includes("forhire")
    ? PostType.forHire
    : PostType.hiring;
  console.log(
    `[INFO]: updateJobs() adding new post to cache. JSON:${JSON.stringify({
      authorId: message.author.id,
      createdAt: message.createdAt,
      type,
    })}}`,
  );
  (type === PostType.hiring
    ? jobBoardMessageCache.hiring
    : jobBoardMessageCache.forHire
  ).push({
    message,
    authorId: message.author.id,
    createdAt: message.createdAt,
    description: parsed.description,
    tags: parsed.tags,
    type,
  });

  // Allow posts every 6.75 days by pretending "now" is 6 hours in the future
  const now = add(new Date(), { hours: 6 });
  // Remove all posts that are older than the limit
  while (
    jobBoardMessageCache.hiring[0] &&
    differenceInDays(now, jobBoardMessageCache.hiring[0].createdAt) >=
      POST_INTERVAL
  ) {
    jobBoardMessageCache.hiring.shift();
  }
  while (
    jobBoardMessageCache.forHire[0] &&
    differenceInDays(now, jobBoardMessageCache.forHire[0].createdAt) >=
      POST_INTERVAL
  ) {
    jobBoardMessageCache.forHire.shift();
  }
};

type NumberOfDays = number;
export const getLastPostAge = (author: Message["author"]): NumberOfDays => {
  const now = Date.now();
  const existingMessage =
    jobBoardMessageCache.hiring.find((m) => m.authorId === author.id) ||
    jobBoardMessageCache.forHire.find((m) => m.authorId === author.id);
  // If we didn't find a message, return larger than the minimum interval
  if (!existingMessage) return POST_INTERVAL + 1;

  return differenceInDays(now, existingMessage.createdAt);
};

export const removeSpecificJob = (message: Message) => {
  const index = jobBoardMessageCache.hiring.findIndex(
    (m) => m.message.id === message.id,
  );
  if (index !== -1) {
    jobBoardMessageCache.hiring.splice(index);
  } else
    jobBoardMessageCache.forHire.splice(
      jobBoardMessageCache.forHire.findIndex(
        (m) => m.message.id === message.id,
      ),
    );
};

export const purgeMember = (idToRemove: string) => {
  let removed = 0;
  let index = jobBoardMessageCache.hiring.findIndex(
    (x) => x.authorId === idToRemove,
  );
  while (index >= 0) {
    removed += 1;
    jobBoardMessageCache.hiring.splice(index, 1);
    index = jobBoardMessageCache.hiring.findIndex(
      (x) => x.authorId === idToRemove,
    );
  }
  index = jobBoardMessageCache.forHire.findIndex(
    (x) => x.authorId === idToRemove,
  );
  while (index >= 0) {
    removed += 1;
    jobBoardMessageCache.forHire.splice(index, 1);
    index = jobBoardMessageCache.forHire.findIndex(
      (x) => x.authorId === idToRemove,
    );
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
