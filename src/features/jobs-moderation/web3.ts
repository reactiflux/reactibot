import { differenceInHours } from "date-fns";
import { simplifyString } from "../../helpers/string";
import { JobPostValidator, POST_FAILURE_REASONS } from "./job-mod-helpers";

const cryptoPosters: Map<string, { count: number; last: Date }> = new Map();
const bannedWords = /(blockchain|nft|cryptocurrency|token|web3|web 3)/;

const CRYPTO_COOLDOWN = 6; // hours

const hiringTest = /hiring/i;
const isHiring = (content: string) => hiringTest.test(content);

const forHireTest = /for ?hire/i;
const isForHire = (content: string) => forHireTest.test(content);

export const removeFromCache = (idToClear: string) => {
  if (cryptoPosters.has(idToClear)) {
    cryptoPosters.delete(idToClear);
    return 1;
  }
  return 0;
};

export const web3Jobs: JobPostValidator = (posts, message) => {
  const now = new Date();
  const lastCryptoPost = cryptoPosters.get(message.author.id);
  // Fail posts that are sent by someone who was already blocked for posting
  // web3 jobs
  if (
    lastCryptoPost &&
    // extend duration for each repeated post
    differenceInHours(now, lastCryptoPost.last) <
      CRYPTO_COOLDOWN * lastCryptoPost.count
  ) {
    const newCount = lastCryptoPost.count + 1;
    cryptoPosters.set(message.author.id, {
      ...lastCryptoPost,
      count: newCount,
    });
    return [
      {
        type: POST_FAILURE_REASONS.web3Poster,
        count: newCount,
        hiring: isHiring(message.content),
        forHire: isForHire(message.content),
      },
    ];
  }

  // Block posts that trigger our web3 detection
  if (
    posts.some((post) => bannedWords.test(simplifyString(post.description)))
  ) {
    cryptoPosters.set(message.author.id, { count: 1, last: new Date() });
    return [
      {
        type: POST_FAILURE_REASONS.web3Content,
        count: 1,
        hiring: isHiring(message.content),
        forHire: isForHire(message.content),
      },
    ];
  }
  return [];
};
