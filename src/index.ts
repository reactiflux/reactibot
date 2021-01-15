require("dotenv").config();

import discord, {
  Message,
  PartialMessage,
  MessageReaction,
  User
} from "discord.js";

import { logger, stdoutLog, channelLog } from "./features/log";
// import codeblock from './features/codeblock';
import qna from "./features/qna";
import jobs from "./features/jobs";
import autoban from "./features/autoban";
import commands from "./features/commands";
import setupStats from "./features/stats";
import emojiMod from "./features/emojiMod";
import { ChannelHandlers } from "./types";

const bot = new discord.Client({
  partials: ["MESSAGE", "CHANNEL", "REACTION"]
});
bot.login(process.env.DISCORD_HASH);

export type ChannelHandlersById = {
  [channelId: string]: ChannelHandlers[];
};

const channelHandlersById: ChannelHandlersById = {};

const addHandler = (channelId: string, channelHandlers: ChannelHandlers) => {
  channelHandlersById[channelId] = [
    ...(channelHandlersById[channelId] || []),
    channelHandlers
  ];
};

const handleMessage = (msg: Message | PartialMessage) => {
  if (msg.partial) {
    return;
  }

  const channelId = msg.channel.id;

  if (channelHandlersById[channelId]) {
    channelHandlersById[channelId].forEach(channelHandlers => {
      channelHandlers.handleMessage?.({ msg: msg as Message, bot });
    });
  }

  if (channelHandlersById["*"]) {
    channelHandlersById["*"].forEach(channelHandlers => {
      channelHandlers.handleMessage?.({ msg: msg as Message, bot });
    });
  }
};

const handleReaction = (reaction: MessageReaction, user: User) => {
  const channelId = reaction.message.channel.id;

  if (channelHandlersById[channelId]) {
    channelHandlersById[channelId].forEach(channelHandlers => {
      channelHandlers.handleReaction?.({ reaction, user, bot });
    });
  }

  if (channelHandlersById["*"]) {
    channelHandlersById["*"].forEach(channelHandlers => {
      channelHandlers.handleReaction?.({ reaction, user, bot });
    });
  }
};

logger.add(stdoutLog);
if (process.env.BOT_LOG) {
  logger.add(channelLog(bot, process.env.BOT_LOG)); // #bot-log
}

// Amplitude metrics
setupStats(bot);

// reactiflux
addHandler("103882387330457600", jobs);
addHandler("106168778013822976", qna); // reactiflux-admin
addHandler("193117606629081089", qna); // #q&a

// btm server
addHandler("479862475047567361", qna); // #general

// common
addHandler("*", commands);
// addHandler('*', codeblock);
addHandler("*", autoban);
addHandler("*", emojiMod);

bot.on("messageReactionAdd", async (reaction, user) => {
  if (user.partial) {
    try {
      await user.fetch();
    } catch (error) {
      console.log("Something went wrong when fetching the user: ", error);
    }
  }

  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch (error) {
      console.log("Something went wrong when fetching the reaction: ", error);
    }
  }

  handleReaction(reaction, user as User);
});

bot.on("message", async msg => {
  if (msg.author?.id === bot.user?.id) return;

  handleMessage(msg);
});

logger.log("INI", "Bootstrap complete");

bot.on("ready", () => {
  Array.from(bot.guilds.cache.values()).forEach(guild => {
    logger.log("INI", `Bot connected to Discord server: ${guild.name}`);
  });

  bot.user?.setActivity("DMs for !commands", { type: "WATCHING" });
});

bot.on("error", err => {
  try {
    logger.log("ERR", err.message);
  } catch (e) {
    logger.log("ERR", err + "");
  }
});

const errorHandler = (error: any) => {
  if (error && error.message) {
    logger.log("ERROR", error.message);
  }
};

process.on("uncaughtException", errorHandler);
process.on("unhandledRejection", errorHandler);
