import { differenceInMinutes, format } from "date-fns";
import {
  PermissionFlagsBits,
  SlashCommandBuilder,
  CommandInteraction,
  Client,
  ChannelType,
} from "discord.js";
import { CHANNELS } from "../constants/channels";
import { isStaff } from "../helpers/discord";
import { ReportReasons, reportUser } from "../helpers/modLog";
import { formatting } from "./jobs-moderation/formatting";
import {
  JOB_POST_FAILURE,
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

export const resetJobCacheCommand = {
  command: new SlashCommandBuilder()
    .setName("reset-job-cache")
    .setDescription("Reset cached posts for the time-based job moderation")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("User to clear post history for")
        .setRequired(true),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  handler: async (interaction: CommandInteraction) => {
    const { options } = interaction;

    const { user } = options.get("user") || {};
    if (!user) {
      interaction.reply("Must mention a user to clear their post history");
      return;
    }

    const memberToClear = user.id;
    const removed =
      removeFromWeb3Cache(memberToClear) + purgeMember(memberToClear);
    await interaction.reply({
      ephemeral: true,
      content: `Cleared ${removed} posts from ${user?.username} out of cache`,
    });
    return;
  },
};

const jobModeration = async (bot: Client) => {
  const jobBoard = await bot.channels.fetch(CHANNELS.jobBoard);
  if (jobBoard?.type !== ChannelType.GuildText) return;

  await loadJobs(bot, jobBoard);

  bot.on("messageCreate", async (message) => {
    if (
      message.channelId !== CHANNELS.jobBoard ||
      message.author.id === bot.user?.id
    ) {
      return;
    }
    try {
      const errors: JOB_POST_FAILURE[] = [];
      errors.concat(await participationRules(message));
      errors.concat(await web3Jobs(message));
      errors.concat(await formatting(message));

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
