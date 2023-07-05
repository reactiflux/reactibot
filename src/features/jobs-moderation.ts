import { differenceInMinutes, format } from "date-fns";
import { LRUCache } from "lru-cache";

import {
  PermissionFlagsBits,
  SlashCommandBuilder,
  CommandInteraction,
  Client,
  ChannelType,
  Message,
  TextChannel,
  ThreadChannel,
} from "discord.js";
import { CHANNELS } from "../constants/channels";
import { isStaff, quoteMessageContent } from "../helpers/discord";
import { ReportReasons, reportUser } from "../helpers/modLog";
import validate from "./jobs-moderation/validate";
import { parseContent, PostType } from "./jobs-moderation/parse-content";
import {
  loadJobs,
  purgeMember,
  removeSpecificJob,
  untrackModeratedMessage,
  updateJobs,
  PostFailures,
  POST_FAILURE_REASONS,
  trackModeratedMessage,
  failedTooFrequent,
  failedWeb3Content,
  failedWeb3Poster,
  deleteAgedPosts,
} from "./jobs-moderation/job-mod-helpers";
import { getValidationMessage } from "./jobs-moderation/validation-messages";
import { FREQUENCY, scheduleTask } from "../helpers/schedule";

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
    const removed = purgeMember(memberToClear);
    await interaction.reply({
      ephemeral: true,
      content: `Cleared ${removed} posts from ${user?.username} out of cache`,
    });
    return;
  },
};

const rulesThreadCache = new LRUCache<string, ThreadChannel>({
  max: 100,
  ttl: 1000 * 60 * 60 * 2, // 1 hours
  dispose: (value) => {
    value.delete();
  },
});

const freeflowHiring = "<https://discord.gg/gTWTwZPDYT>";
const freeflowForHire = "<https://vjlup8tch3g.typeform.com/to/T8w8qWzl>";

scheduleTask(FREQUENCY.hourly, () => {
  deleteAgedPosts();
});

const jobModeration = async (bot: Client) => {
  const jobBoard = await bot.channels.fetch(CHANNELS.jobBoard);
  if (jobBoard?.type !== ChannelType.GuildText) return;

  await loadJobs(bot, jobBoard);

  bot.on("messageCreate", async (message) => {
    const { channel } = message;
    if (message.author.bot) {
      return;
    }
    if (channel.type === ChannelType.PrivateThread) {
      validationRepl(message);
      return;
    }
    if (
      message.channelId !== CHANNELS.jobBoard ||
      channel.type !== ChannelType.GuildText ||
      isStaff(message.member)
    ) {
      return;
    }
    const posts = parseContent(message.content);
    const errors = validate(posts, message);

    if (errors) {
      await handleErrors(channel, message, errors);
    }
  });

  bot.on("messageUpdate", async (_, newMessage) => {
    const { channel } = newMessage;
    if (newMessage.author?.bot) {
      return;
    }
    if (channel.type === ChannelType.PrivateThread) {
      validationRepl(await newMessage.fetch());
      return;
    }
    if (
      newMessage.channelId !== CHANNELS.jobBoard ||
      channel.type !== ChannelType.GuildText ||
      isStaff(newMessage.member)
    ) {
      return;
    }
    const message = await newMessage.fetch();
    const posts = parseContent(message.content);
    const errors = validate(posts, message);

    if (errors) {
      if (posts.some((p) => p.tags.includes(PostType.forHire))) {
        reportUser({ reason: ReportReasons.jobCircumvent, message });
        await newMessage.delete();
      } else {
        await handleErrors(channel, message, errors);
      }
    }
  });

  /*
   * Handle message deletion. There are 3 major cases where messages are removed:
   * - by a moderator
   * - by the poster immediately because of an error
   * - by the poster to try and circumvent our limits
   * - automatically by this bot
   *
   * We don't currently handle messages removed by moderators, we'd need to check * the audit log and there are race conditions there.
   * There's a 10 minute grace period where people are allowed to re-post if they
   * delete their own message.
   * After 10 minutes, they must wait 6.75 days before reposting
   * If it's been removed by this bot for being a web3 related post, they are
   * warned twice and timed out after a third post.
   */
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

const validationRepl = async (message: Message) => {
  const posts = parseContent(message.content);
  const errors = validate(posts, message);

  await message.channel.send(
    errors.length > 0
      ? errors.map((e) => `- ${getValidationMessage(e)}`).join("\n")
      : "This post passes our validation rules!",
  );
};

const handleErrors = async (
  channel: TextChannel,
  message: Message,
  errors: ReturnType<typeof validate>,
) => {
  // If the job post is valid, update the list of stored jobs and stop.
  if (errors.length === 0) {
    updateJobs(message);
    return;
  }

  // If there are errors, notify the member and moderate the post.
  trackModeratedMessage(message);
  await message.delete();

  let thread: ThreadChannel;
  const existingThread = rulesThreadCache.get(message.author.id);
  if (existingThread) {
    thread = existingThread;
    await existingThread.send(
      `Hey <@${
        message.author.id
      }>, please use this thread to test out new posts against our validation rules. Your was removed for these reasons:

${errors.map((e) => `- ${getValidationMessage(e)}`).join("\n")}`,
    );
  } else {
    thread = await channel.threads.create({
      name: "Your post has been removed",
      type: ChannelType.PrivateThread,
      invitable: false,
    });
    rulesThreadCache.set(message.author.id, thread);
    await thread.send(
      `Hey <@${
        message.author.id
      }>, your message does not meet our requirements to be posted to the board. This thread acts as a REPL where you can test out new posts against our validation rules.
    
It was removed for these reasons:

${errors.map((e) => `- ${getValidationMessage(e)}`).join("\n")}`,
    );
  }

  // Handle missing post type
  let error: PostFailures | undefined = errors.find(failedTooFrequent);
  if (error) {
    reportUser({ reason: ReportReasons.jobFrequency, message });
  }

  // Handle posts that contain web3 content and posters who have been blocked
  // for posting web3 roles
  error = errors.find(failedWeb3Poster) || errors.find(failedWeb3Content);
  if (error) {
    reportUser({ reason: ReportReasons.jobCrypto, message });
    if (error.count >= 3) {
      await message.member?.timeout(20 * 60 * 60 * 1000);
    }
    const { hiring, forHire } = error;
    await thread.send(
      !hiring && !forHire
        ? `If you're hiring: ${freeflowHiring}
If you're seeking work: ${freeflowForHire}`
        : hiring
        ? `Join FreeFlow's server to start hiring for web3: ${freeflowHiring}`
        : `Apply to join FreeFlow's talent pool for web3: ${freeflowForHire}`,
    );
  }
  await thread.send("Your post:");
  await thread.send({
    content: quoteMessageContent(message.content),
    allowedMentions: { users: [] },
  });
};
