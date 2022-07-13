import {
  compareAsc,
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
  format,
} from "date-fns";
import {
  Client,
  Message,
  MessageActionRow,
  MessageButton,
  MessageMentions,
  TextChannel,
} from "discord.js";
import { simplifyString } from "../helpers/string";
import { CHANNELS } from "../constants/channels";
import { isStaff } from "../helpers/discord";
import { sleep } from "../helpers/misc";
import { ReportReasons, reportUser, modLog } from "../helpers/modLog";
import cooldown from "./cooldown";

const storedMessages: Message[] = [];
const moderatedMessageIds: Set<string> = new Set();

const DAYS_OF_POSTS = 7; // days
const MINIMUM_JOIN_AGE = 1; // hours
const REPOST_THRESHOLD = 10; // minutes

const tags = ["forhire", "for hire", "hiring", "remote", "local"];

const loadJobs = async (bot: Client, channel: TextChannel) => {
  const now = new Date();

  let oldestMessage: Message | undefined;
  while (
    !oldestMessage ||
    differenceInDays(now, oldestMessage.createdAt) < DAYS_OF_POSTS
  ) {
    const newMessages = await channel.messages.fetch({
      limit: 10,
      ...(oldestMessage ? { after: oldestMessage.id } : {}),
    });
    oldestMessage = newMessages
      .sort((a, b) => compareAsc(a.createdAt, b.createdAt))
      .last();
    if (!oldestMessage) break;

    storedMessages.push(
      ...newMessages
        .filter(
          (m) =>
            differenceInDays(now, m.createdAt) < DAYS_OF_POSTS &&
            m.author.id !== bot.user?.id,
        )
        .values(),
    );
  }
};

const updateJobs = (message: Message) => {
  storedMessages.push(message);

  // Remove all posts that are older than the limit
  const now = new Date();
  while (
    storedMessages[0] &&
    differenceInDays(now, storedMessages[0].createdAt) >= DAYS_OF_POSTS
  ) {
    storedMessages.shift();
  }
};
const removeSpecificJob = (message: Message) => {
  storedMessages.splice(storedMessages.findIndex((m) => m === message));
};

const freeflowHiring = "https://discord.gg/gTWTwZPDYT";
const freeflowForHire = "https://vjlup8tch3g.typeform.com/to/T8w8qWzl";

const hiringTest = /hiring/i;
const isHiring = (content: string) => hiringTest.test(content);

const forHireTest = /for ?hire/i;
const isForHire = (content: string) => forHireTest.test(content);

const jobModeration = async (bot: Client) => {
  const jobBoard = await bot.channels.fetch(CHANNELS.jobBoard);
  if (!jobBoard?.isText() || !(jobBoard instanceof TextChannel)) return;

  await loadJobs(bot, jobBoard);

  bot.on("interactionCreate", (interaction) => {
    if (
      interaction.isMessageComponent() &&
      interaction.customId === "freeflow-hiring"
    ) {
      if (
        !(interaction.message.mentions as MessageMentions).users.has(
          interaction.user.id,
        )
      ) {
        modLog(`<@${interaction.user.id}> invited to Freeflow by hiring link`);
      } else {
        modLog(`<@${interaction.user.id}> directed to hire from Freeflow`);
      }
      interaction.reply({
        content: "Join the Freeflow community and start hiring developers",
        ephemeral: true,
        components: [
          new MessageActionRow().addComponents(
            new MessageButton()
              .setURL(freeflowHiring)
              .setLabel("Apply")
              .setStyle("LINK"),
          ),
        ],
      });
    }
    if (
      interaction.isMessageComponent() &&
      interaction.customId === "freeflow-for-hire"
    ) {
      if (
        !(interaction.message.mentions as MessageMentions).users.has(
          interaction.user.id,
        )
      ) {
        modLog(
          `<@${interaction.user.id}> invited to Freeflow by for hire link`,
        );
        return interaction.reply({
          ephemeral: true,
          content: `For more information about Freeflow, visit their website: <https://freeflow.dev/> or apply to join: ${freeflowForHire}`,
        });
      }
      modLog(`<@${interaction.user.id}> directed to apply to Freeflow`);
      interaction.reply({
        content: `Apply to join Freeflow to get started: ${freeflowForHire}`,
        ephemeral: true,
      });
    }
  });

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
        message.content.startsWith("!resetJobPost") &&
        message.mentions.members?.size
      ) {
        const memberToClear = message.mentions.members?.at(0);
        let removed = 0;

        let index = storedMessages.findIndex(
          (x) => x.author.id === memberToClear?.id,
        );
        while (index > 0) {
          removed += 1;
          storedMessages.splice(index, 1);
          index = storedMessages.findIndex(
            (x) => x.author.id === memberToClear?.id,
          );
        }
        message.reply(
          `Found and cleared ${removed} posts from cache for this user`,
        );
      }
      return;
    }

    if (message.type === "REPLY") {
      message
        .reply({
          content:
            "This channel is only for job postings, please DM the poster or create a thread",
          allowedMentions: { repliedUser: false },
        })
        .then(async (reply) => {
          await sleep(45);
          reply.delete();
        });
      moderatedMessageIds.add(message.id);
      message.delete();
      return;
    }

    const DELETE_DELAY = 90;
    const bannedWords = /(blockchain|nft|cryptocurrency|token|web3)/;
    if (bannedWords.test(simplifyString(message.content))) {
      moderatedMessageIds.add(message.id);
      const [reply] = await Promise.all([
        message.reply({
          content: `Sorry! We don't allow blockchain or related cryptocurrency roles to be advertised in our community. We encourage you to contact our Freeflow, a talent network for the cryptocurrency industry. This message will be deleted in ${DELETE_DELAY} seconds.`,
          components: (() => {
            const hiring = isHiring(message.content);
            const forHire = isForHire(message.content);
            const hiringLink = new MessageActionRow().addComponents(
              new MessageButton()
                .setCustomId("freeflow-hiring")
                .setLabel("Start hiring")
                .setStyle("PRIMARY"),
            );
            const forHireLink = new MessageActionRow().addComponents(
              new MessageButton()
                .setCustomId("freeflow-for-hire")
                .setLabel("Request a Freeflow application")
                .setStyle("PRIMARY"),
            );
            if (!hiring && !forHire) {
              return [hiringLink, forHireLink];
            }
            return hiring ? [hiringLink] : [forHireLink];
          })(),
        }),
        reportUser({ reason: ReportReasons.jobCrypto, message }),
      ]);
      await Promise.all([message.delete(), sleep(DELETE_DELAY)]);
      await reply.delete();
      return;
    }

    // Handle joining and posting too quickly
    const now = new Date();
    if (
      message.member?.joinedAt &&
      differenceInHours(now, message.member.joinedAt) < MINIMUM_JOIN_AGE
    ) {
      moderatedMessageIds.add(message.id);
      reportUser({ reason: ReportReasons.jobAge, message });
      const [reply] = await Promise.all([
        message.reply(
          "You joined too recently to post a job, please try again in a little while. Your post has been DM’d to you.",
        ),
        message.author.send(message.content),
        message.author.send(
          "You joined too recently to post a job, please try again in a little while. Your post:",
        ),
      ]);
      await Promise.all([
        message.delete(),
        (async () => {
          await sleep(45);
          return reply.delete();
        })(),
      ]);

      return;
    }

    // Handle posting too frequently
    const existingMessage = storedMessages.find(
      (m) => m.author.id === message.author.id,
    );
    if (existingMessage) {
      reportUser({ reason: ReportReasons.jobFrequency, message });
      const lastSent = differenceInDays(now, existingMessage.createdAt);
      moderatedMessageIds.add(message.id);
      message.author.send(
        `Please only post every 7 days. Your last post here was only ${lastSent} day(s) ago. Your post:`,
      );
      message.author.send(message.content);
      message
        .reply(
          `Please only post every 7 days. Your last post here was only ${lastSent} day(s) ago. Your post has been DM’d to you.`,
        )
        .then(async (reply) => {
          await sleep(45);
          reply.delete();
        });
      message.delete();

      return;
    }

    // Handle missing tags
    const content = message.content.toLowerCase();
    const hasTags = tags.some((tag) => content.includes(`[${tag}]`));
    if (!hasTags && message.mentions.members?.size === 0) {
      if (cooldown.hasCooldown(message.author.id, "user.jobs")) return;

      cooldown.addCooldown(message.author.id, "user.jobs");
      // TODO: private threads, probably a discord helper for creating
      const thread = await message.startThread({
        name: message.author.username,
      });
      const content = `Your post to #job-board didn't have any tags - please consider adding some of the following tags to the start of your message to make your offer easier to find (and to index correctly on https://reactiflux.com/jobs):

      [FOR HIRE] - you are looking for a job
      [HIRING] - you are looking to hire someone
      [INTERN] - this is an intern position, no experience required
      [REMOTE] - only remote work is possible
      [LOCAL] - only local work is possible (please remember to provide the country / city!)
      [VISA] - Your company will help with the visa process in case of successful hire

      Thank you :)

      :robot: This message was sent by a bot, please do not respond to it - in case of additional questions / issues, please contact one of our mods!`;
      if (thread) {
        // Warning is sent in a newly created thread
        await thread.send(content);
      } else {
        // If thread creation fails, the warning is sent as a normal message
        await message.reply(content);
      }
    }

    // Last, update the list of tracked messages.
    updateJobs(message);
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
    if (moderatedMessageIds.has(message.id)) {
      moderatedMessageIds.delete(message.id);
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
