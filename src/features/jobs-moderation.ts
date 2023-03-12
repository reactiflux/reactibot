import { differenceInMinutes, format } from "date-fns";
import { Client, TextChannel } from "discord.js";
import { CHANNELS } from "../constants/channels";
import { isStaff } from "../helpers/discord";
import { ReportReasons, reportUser } from "../helpers/modLog";
import { formatting } from "./jobs-moderation/formatting";
import {
  loadJobs,
  purgeMember,
  removeSpecificJob,
  RuleViolation,
  untrackModeratedMessage,
  updateJobs,
} from "./jobs-moderation/job-mod-helpers";
import participationRules from "./jobs-moderation/participation";
import {
  removeFromCache as removeFromWeb3Cache,
  web3Jobs,
} from "./jobs-moderation/web3";

const REPOST_THRESHOLD = 10; // minutes

const jobModeration = async (bot: Client) => {
  const jobBoard = await bot.channels.fetch(CHANNELS.jobBoard);
  if (!jobBoard?.isText() || !(jobBoard instanceof TextChannel)) return;

  await loadJobs(bot, jobBoard);

  bot.on("messageCreate", async (message) => {
    if (
      message.channelId !== CHANNELS.jobBoard ||
      message.author.id === bot.user?.id
    ) {
      return;
    }
    // Allow staff to wipe "recently posted" history for a member
    if (isStaff(message.member)) {
      if (
        message.content.toLowerCase().startsWith("!resetjobpost") &&
        message.mentions.members?.size
      ) {
        const memberToClear = message.mentions.members?.at(0)?.id || "";
        const removed =
          removeFromWeb3Cache(memberToClear) + purgeMember(memberToClear);
        await message.reply(
          `Found and cleared ${removed} posts from cache for this user`,
        );
      }
      return;
    }
    try {
      await participationRules(message);
      await web3Jobs(message);
      await formatting(message);

      // Last, update the list of tracked messages.
      updateJobs(message);
    } catch (e) {
      if (!(e instanceof RuleViolation)) {
        throw e;
      }
    }
  });
  bot.on("messageDelete", async (message) => {
    // TODO: look up audit log, early return if member was banned
    if (
      message.channelId !== CHANNELS.jobBoard ||
      !message.author ||
      isStaff(message.member) ||
      message.author.id === bot.user?.id
    ) {
      return;
    }
    // Don't trigger a message for auto-removed messages
    if (untrackModeratedMessage(message)) {
      return;
    }

    message = message.partial ? await message.fetch() : message;
    const deletedCreation = differenceInMinutes(new Date(), message.createdAt);
    if (deletedCreation < REPOST_THRESHOLD) {
      removeSpecificJob(message);
    }

    // Log deleted job posts publicly
    reportUser({
      reason: ReportReasons.jobRemoved,
      message,
      extra: `Originally sent ${format(new Date(message.createdAt), "P p")}`,
    });
  });
};

export default jobModeration;
