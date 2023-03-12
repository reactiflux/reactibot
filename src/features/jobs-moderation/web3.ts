import { differenceInHours } from "date-fns";
import { Message } from "discord.js";
import { simplifyString } from "../../helpers/string";
import { sleep } from "../../helpers/misc";
import { ReportReasons, reportUser } from "../../helpers/modLog";
import { RuleViolation, trackModeratedMessage } from "./job-mod-helpers";

const cryptoPosters: Map<string, { count: number; last: Date }> = new Map();
const bannedWords = /(blockchain|nft|cryptocurrency|token|web3|web 3)/;

const CRYPTO_COOLDOWN = 6; // hours

const freeflowHiring = "<https://discord.gg/gTWTwZPDYT>";
const freeflowForHire = "<https://vjlup8tch3g.typeform.com/to/T8w8qWzl>";

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

const DELETE_DELAY = 90;
export const web3Jobs = async (message: Message<boolean>) => {
  const now = new Date();
  const lastCryptoPost = cryptoPosters.get(message.author.id);
  if (
    lastCryptoPost &&
    // extend duration for each repeated post
    differenceInHours(now, lastCryptoPost.last) <
      CRYPTO_COOLDOWN * lastCryptoPost.count
  ) {
    trackModeratedMessage(message);
    const newCount = lastCryptoPost.count + 1;
    cryptoPosters.set(message.author.id, {
      ...lastCryptoPost,
      count: newCount,
    });

    // If they post 3 times, time them out overnight
    if (newCount >= 3) {
      await message.member?.timeout(20 * 60 * 60 * 1000);
    }

    const hiring = isHiring(message.content);
    const forHire = isForHire(message.content);

    const referralLink =
      !hiring && !forHire
        ? `If you're hiring: ${freeflowHiring}
If you're seeking work: ${freeflowForHire}`
        : hiring
        ? `Join their server to start hiring: ${freeflowHiring}`
        : `Apply to join their talent pool: ${freeflowForHire}`;

    const [reply] = await Promise.all([
      message.reply({
        content: `Sorry! We don't allow posts from people who came here to advertise blockchain or related cryptocurrency services.

We encourage you to contact our Freeflow, a talent network for the cryptocurrency industry. This message will be deleted in ${DELETE_DELAY} seconds. If you continue posting, you’ll be timed out overnight.

${referralLink}`,
      }),
      reportUser({ reason: ReportReasons.jobCrypto, message }),
    ]);
    await Promise.all([message.delete(), sleep(DELETE_DELAY)]);
    await reply.delete();
    throw new RuleViolation("recent web3 poster");
  }

  if (bannedWords.test(simplifyString(message.content))) {
    trackModeratedMessage(message);
    cryptoPosters.set(message.author.id, { count: 1, last: new Date() });

    const hiring = isHiring(message.content);
    const forHire = isForHire(message.content);

    const referralLink =
      !hiring && !forHire
        ? `If you're hiring: ${freeflowHiring}
If you're seeking work: ${freeflowForHire}`
        : hiring
        ? `Join their server to start hiring: ${freeflowHiring}`
        : `Apply to join their talent pool: ${freeflowForHire}`;

    const [reply] = await Promise.all([
      message.reply({
        content: `Sorry! We don't allow blockchain or related cryptocurrency roles to be advertised in our community. We encourage you to contact our Freeflow, a talent network for the cryptocurrency industry. This message will be deleted in ${DELETE_DELAY} seconds.

${referralLink}`,
      }),
      reportUser({ reason: ReportReasons.jobCrypto, message }),
    ]);
    await Promise.all([message.delete(), sleep(DELETE_DELAY)]);
    await reply.delete();
    throw new RuleViolation("web3 keyword");
  }
};
