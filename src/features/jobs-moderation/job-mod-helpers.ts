import { add, compareAsc, differenceInDays } from "date-fns";
import {
  Client,
  Message,
  PartialMessage,
  Snowflake,
  TextChannel,
} from "discord.js";

export class RuleViolation extends Error {}

export const enum JOB_POST_FAILURE {
  missingType = "missingType",
  tooManyLines = "tooManyLines",
  tooFrequent = "tooFrequent",
  replyOrMention = "replyOrMention",
  web3Content = "web3Content",
  web3Poster = "web3Poster",
  // invalidContact = 'invalidContact',
  tooManyEmojis = "tooManyEmojis",
  // unknownLocation = 'unknownLocation',
  // invalidPostType = 'invalidPostType',
}

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
  console.log("pushing job", { storedMessages });

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
