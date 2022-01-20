import { compareAsc, differenceInDays, format } from "date-fns";
import { Client, Message, TextChannel } from "discord.js";
import { CHANNELS } from "../constants";
import { isStaff } from "../helpers/discord";
import { sleep } from "../helpers/misc";
import cooldown from "./cooldown";

const storedMessages: Message[] = [];
const moderatedMessageIds: Set<string> = new Set();

const DAYS_OF_POSTS = 7; // days
const MINIMUM_JOIN_AGE = 3; // days

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

const jobModeration = async (bot: Client) => {
  const jobBoard = await bot.channels.fetch(CHANNELS.jobBoard);
  if (!jobBoard?.isText() || !(jobBoard instanceof TextChannel)) return;

  await loadJobs(bot, jobBoard);

  bot.on("messageCreate", async (message) => {
    if (
      message.channelId !== CHANNELS.jobBoard ||
      isStaff(message.member) ||
      message.author.id === bot.user?.id
    ) {
      return;
    }

    // Handle joining and posting too quickly
    const now = new Date();
    if (
      message.member?.joinedAt &&
      differenceInDays(now, message.member.joinedAt) < MINIMUM_JOIN_AGE
    ) {
      moderatedMessageIds.add(message.id);
      message.author.send(message.content);
      message
        .reply(
          "You joined too recently to post a job, please try again in a few days. Your post has been DM’d to you.",
        )
        .then(async (reply) => {
          await sleep(15);
          reply.delete();
        });
      message.delete();

      return;
    }

    // Handle posting too frequently
    const existingMessage = storedMessages.find(
      (m) => m.author.id === message.author.id,
    );
    if (existingMessage) {
      moderatedMessageIds.add(message.id);
      message.author.send(message.content);
      message
        .reply(
          `Please only post every 7 days. Your last post here was only ${differenceInDays(
            now,
            existingMessage.createdAt,
          )} day(s) ago. Your post has been DM’d to you.`,
        )
        .then(async (reply) => {
          await sleep(15);
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
      message.author
        .send(`Hello there! You’ve just posted a message to the #jobs-board channel, but you haven’t added any tags - please consider adding some of the following tags to the start of your message to make your offer easier to find (and to index correctly on https://reactiflux.com/jobs):

[FOR HIRE] - you are looking for a job
[HIRING] - you are looking to hire someone
[INTERN] - this is an intern position, no experience required
[REMOTE] - only remote work is possible
[LOCAL] - only local work is possible (please remember to provide the country / city!)
[VISA] - Your company will help with the visa process in case of successful hire

Thank you :)

:robot: This message was sent by a bot, please do not respond to it - in case of additional questions / issues, please contact one of our mods!`);
    }

    // Last, update the list of tracked messages.
    updateJobs(message);
  });
  bot.on("messageDelete", (message) => {
    if (
      message.channelId !== CHANNELS.jobBoard ||
      !message.author ||
      message.author.id === bot.user?.id
    ) {
      return;
    }
    // Don't trigger a message for auto-removed messages
    if (moderatedMessageIds.has(message.id)) {
      moderatedMessageIds.delete(message.id);
      return;
    }

    // Log deleted job posts publicly
    message.channel.send(
      `<@${message.author.id}> deleted their job post from ${format(
        new Date(message.createdAt),
        "PPPP",
      )}`,
    );
  });
};

export default jobModeration;
