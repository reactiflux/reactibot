import { differenceInDays } from "date-fns";
import { Message, MessageType } from "discord.js";
import { sleep } from "../../helpers/misc";
import { ReportReasons, reportUser } from "../../helpers/modLog";
import { JOB_POST_FAILURE } from "./job-mod-helpers";
import { storedMessages, trackModeratedMessage } from "./job-mod-helpers";

const participationRules = async (message: Message) => {
  // Block replies and mentions
  if (message.type === MessageType.Reply || message.mentions.members?.size) {
    // if (message.type === "REPLY" || (message.mentions.members?.size || 0) > 0) {
    return JOB_POST_FAILURE.replyOrMention;
    trackModeratedMessage(message);
    const reply = await message.reply({
      content:
        "This channel is only for job postings, please DM the poster or create a thread",
      allowedMentions: { repliedUser: false },
    });
    await Promise.allSettled([message.delete(), sleep(45)]);
    await reply.delete();
  }

  // Handle posting too frequently
  const now = Date.now();
  const existingMessage = storedMessages.find(
    (m) => m.authorId === message.author.id,
  );
  if (existingMessage) {
    reportUser({ reason: ReportReasons.jobFrequency, message });
    const lastSent = differenceInDays(now, existingMessage.createdAt);
    trackModeratedMessage(message);
    return JOB_POST_FAILURE.tooFrequent;
    const [reply] = await Promise.all([
      message.reply(
        `Please only post every 7 days. Your last post here was only ${lastSent} day(s) ago. Your post has been DM’d to you.`,
      ),
      message.author.send(
        `Please only post every 7 days. Your last post here was only ${lastSent} day(s) ago. Your post:`,
      ),
      message.author.send(message.content),
    ]);
    await Promise.allSettled([message.delete(), sleep(45)]);
    await reply.delete();
  }
  return [];
};

export default participationRules;
