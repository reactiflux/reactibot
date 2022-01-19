import { compareAsc, differenceInDays } from "date-fns";
import { Client, Message } from "discord.js";
import { CHANNELS } from "../constants";

const storedMessages: Message[] = [];

const DAYS_OF_POSTS = 7;

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
      message.author.id === bot.user?.id
    ) {
      return;
    }

    const now = new Date();
    const member = await message.guild?.members.fetch({
      user: message.author.id,
    });
    const existingMessage = storedMessages.find(
      (m) => m.author.id === message.author.id,
    );
    if (existingMessage) {
      return;
    }
    updateJobs(message);
  });
};

export default jobModeration;
