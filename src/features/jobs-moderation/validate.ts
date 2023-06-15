import { differenceInDays } from "date-fns";
import { Message, MessageType } from "discord.js";
import { differenceInHours } from "date-fns";

import { jobBoardMessageCache } from "./job-mod-helpers";

import { simplifyString } from "../../helpers/string";
import { extractEmoji } from "../../helpers/string";
import {
  getCryptoCache,
  JobPostValidator,
  PostFailures,
  POST_FAILURE_REASONS,
  setCryptoCache,
} from "./job-mod-helpers";
import { parseContent, PostType } from "./parse-content";

const validate = (posts: ReturnType<typeof parseContent>, message: Message) => {
  const errors: PostFailures[] = [];
  errors.push(...participation(posts, message));
  errors.push(...web3(posts, message));
  errors.push(...formatting(posts, message));
  return errors;
};
export default validate;

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

const CRYPTO_COOLDOWN = 6; // hours
const bannedWords = /(blockchain|nft|cryptocurrency|token|web3|web 3)/;

export const web3: JobPostValidator = (posts, message) => {
  const now = new Date();
  const lastCryptoPost = getCryptoCache(message.author.id);
  // Fail posts that are sent by someone who was already blocked for posting
  // web3 jobs
  if (
    lastCryptoPost &&
    // extend duration for each repeated post
    differenceInHours(now, lastCryptoPost.last) <
      CRYPTO_COOLDOWN * lastCryptoPost.count
  ) {
    const newCount = lastCryptoPost.count + 1;
    setCryptoCache(message.author.id, {
      ...lastCryptoPost,
      count: newCount,
    });
    return [
      {
        type: POST_FAILURE_REASONS.web3Poster,
        count: newCount,
        hiring: posts.some((p) => p.tags.includes(PostType.hiring)),
        forHire: posts.some((p) => p.tags.includes(PostType.forHire)),
      },
    ];
  }

  // Block posts that trigger our web3 detection
  if (
    posts.some((post) => bannedWords.test(simplifyString(post.description)))
  ) {
    setCryptoCache(message.author.id, { count: 1, last: new Date() });
    return [
      {
        type: POST_FAILURE_REASONS.web3Content,
        count: 1,
        hiring: posts.some((p) => p.tags.includes(PostType.hiring)),
        forHire: posts.some((p) => p.tags.includes(PostType.forHire)),
      },
    ];
  }
  return [];
};

export const participation: JobPostValidator = (posts, message) => {
  const { members: mentions } = message.mentions;
  if (
    // Is a reply
    message.type === MessageType.Reply ||
    // Mentions a user other than self
    (mentions?.size && !mentions.every((m) => m.id === message.author.id))
  ) {
    return [{ type: POST_FAILURE_REASONS.replyOrMention }];
  }

  // Handle posting too frequently
  const now = Date.now();
  const existingMessage = jobBoardMessageCache.find(
    (m) => m.authorId === message.author.id,
  );
  if (existingMessage) {
    const lastSent = differenceInDays(now, existingMessage.createdAt);
    return [{ type: POST_FAILURE_REASONS.tooFrequent, lastSent }];
  }
  return [];
};
