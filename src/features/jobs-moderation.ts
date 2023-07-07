import { differenceInHours, differenceInMinutes, format } from "date-fns";
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
import { parseContent } from "./jobs-moderation/parse-content";
import {
  loadJobs,
  purgeMember,
  removeSpecificJob,
  untrackModeratedMessage,
  updateJobs,
  trackModeratedMessage,
  failedTooFrequent,
  failedWeb3Content,
  failedWeb3Poster,
  deleteAgedPosts,
} from "./jobs-moderation/job-mod-helpers";
import { getValidationMessage } from "./jobs-moderation/validation-messages";
import { FREQUENCY, scheduleTask } from "../helpers/schedule";
import {
  POST_FAILURE_REASONS,
  PostFailures,
  PostType,
} from "../types/jobs-moderation";

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

const jobModeration = async (bot: Client) => {
  const jobBoard = await bot.channels.fetch(CHANNELS.jobBoard);
  if (jobBoard?.type !== ChannelType.GuildText) return;

  // Remove forhire posts that have expired
  scheduleTask("expired post cleanup", FREQUENCY.hourly, () => {
    deleteAgedPosts();
  });
  // Clean up enforcement threads that have been open for more than an hour
  // This _should_ be handled by the cache eviction, but that doesn't appear to
  // be working
  scheduleTask("enforcement thread cleanup", FREQUENCY.hourly, async () => {
    const threads = await jobBoard.threads.fetch({
      archived: { fetchAll: true },
    });
    for (const thread of threads.threads.values()) {
      if (
        !thread.createdAt ||
        differenceInHours(new Date(), thread.createdAt) > 1
      ) {
        await thread.delete();
      }
    }
  });

  await loadJobs(bot, jobBoard);
  await deleteAgedPosts();

  bot.on("messageCreate", async (message) => {
    const { channel } = message;
    if (
      message.author.bot ||
      // Don't treat newly fetched old messages as new posts
      differenceInHours(new Date(), message.createdAt) >= 1
    ) {
      return;
    }
    // If this is an existing enforcement thread, process the through a "REPL"
    // that lets people test messages against the rules
    if (
      message.channelId === CHANNELS.jobBoard &&
      channel.type === ChannelType.PrivateThread
    ) {
      validationRepl(message);
      return;
    }
    // If this is a staff member, bail early
    if (
      message.channelId !== CHANNELS.jobBoard ||
      channel.type !== ChannelType.GuildText ||
      isStaff(message.member)
    ) {
      return;
    }
    const posts = parseContent(message.content);
    const errors = validate(posts, message);
    console.log(
      `[DEBUG] validating new job post from @${
        message.author.username
      }, errors: [${JSON.stringify(errors)}]`,
    );
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
    // You can't post too frequently when editing a message, so filter those out
    const errors = validate(posts, message).filter(
      (e) => e.type !== POST_FAILURE_REASONS.tooFrequent,
    );

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
    await thread.send({
      content: `Hey <@${
        message.author.id
      }>, your message does not meet our requirements to be posted to the board. This thread acts as a REPL where you can test out new posts against our validation rules.

You can view our guidance for job posts here: <https://www.reactiflux.com/promotion#job-board>. It was removed for these reasons:

${errors.map((e) => `- ${getValidationMessage(e)}`).join("\n")}`,
      embeds: [
        {
          title: "Job Board Rules",
          description: `Here's an example of a valid post:
\`\`\`
HIRING | REMOTE | FULL-TIME

Senior React Engineer: $min - $max

Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

More details & apply: https://example.com/apply
\`\`\``,
          color: 0x7289da,
        },
      ],
    });
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
