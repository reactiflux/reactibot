import { compareAsc, differenceInDays } from "date-fns";
import { Client, Message } from "discord.js";
import { CHANNELS } from "../constants";

const storedMessages: Message[] = [];

const DAYS_OF_POSTS = 7;

const jobModeration = async (bot: Client) => {
  const jobBoard = await bot.channels.fetch(CHANNELS.jobBoard);

  if (!jobBoard?.isText()) return;
  const now = new Date();

  let oldestMessage: Message | undefined;
  while (
    !oldestMessage ||
    differenceInDays(now, oldestMessage.createdAt) < DAYS_OF_POSTS
  ) {
    const newMessages = await jobBoard.messages.fetch({
      limit: 10,
      ...(oldestMessage ? { after: oldestMessage.id } : {}),
    });
    oldestMessage = newMessages
      .sort((a, b) => compareAsc(a.createdAt, b.createdAt))
      .last();
    if (!oldestMessage) break;

    storedMessages.push(
      ...newMessages
        .filter((m) => differenceInDays(now, m.createdAt) < DAYS_OF_POSTS)
        .values(),
    );
  }
  console.log("loaded all", storedMessages.length);
};

export default jobModeration;
