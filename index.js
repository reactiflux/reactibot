require("dotenv").config();

const discord = require("discord.js");
const fetch = require("node-fetch");

const { logger, stdoutLog, channelLog } = require("./features/log");

const codeblock = require("./features/codeblock").default;
const qna = require("./features/qna").default;
const jobs = require("./features/jobs").default;
const autoban = require("./features/autoban").default;
const commands = require("./features/commands").default;
const witInvite = require("./features/wit-invite").default;
const stats = require("./features/stats").default;
const deduper = require("./features/deduper").default;

const bot = new discord.Client();
bot.login(process.env.DISCORD_HASH);

const channelHandlers = {
  channels: {},

  addHandler: (channelId, channelHandler) => {
    const handlers = channelHandlers.channels[channelId] || [];
    handlers.push(channelHandler);
    channelHandlers.channels[channelId] = handlers;
  },

  handle: (msg, user) => {
    const channel = msg.channel.id;
    if (channelHandlers.channels[channel]) {
      channelHandlers.channels[channel].forEach(
        handler =>
          handler.handleMessage &&
          handler.handleMessage.call(this, {
            msg,
            user
          })
      );
    }

    if (channelHandlers.channels["*"]) {
      channelHandlers.channels["*"].forEach(handler => {
        handler.handleMessage &&
          handler.handleMessage.call(this, {
            msg,
            user
          });
      });
    }
  },

  handleReaction: (reaction, user) => {
    const channel = reaction.message.channel.id;
    if (channelHandlers.channels[channel]) {
      channelHandlers.channels[channel].forEach(
        handler =>
          handler.handleReaction &&
          handler.handleReaction.call(this, {
            reaction,
            user
          })
      );
    }

    if (channelHandlers.channels["*"]) {
      channelHandlers.channels["*"].forEach(
        handler =>
          handler.handleReaction &&
          handler.handleReaction.call(this, {
            reaction,
            user
          })
      );
    }
  }
};

logger.add(stdoutLog);
logger.add(channelLog(bot, "479862475047567361"));

// Amplitude metrics
stats(bot);

// reactiflux
channelHandlers.addHandler("103882387330457600", jobs);
channelHandlers.addHandler("541673256596537366", witInvite); // #women-in-tech
channelHandlers.addHandler("106168778013822976", qna); // reactiflux-admin
channelHandlers.addHandler("193117606629081089", qna); // #q&a

// btm server
channelHandlers.addHandler("479862475047567361", qna); // #general

// common
channelHandlers.addHandler("*", commands);
// channelHandlers.addHandler('*', codeblock);
channelHandlers.addHandler("*", autoban);
channelHandlers.addHandler("*", deduper);

bot.on("messageReactionAdd", (reaction, user) => {
  channelHandlers.handleReaction(reaction, user);
});

bot.on("message", msg => {
  if (msg.author.id === bot.user.id) return;
  channelHandlers.handle(msg, msg.author);
});

logger.log("INI", "Bootstrap complete");
bot.on("ready", () => {
  logger.log("INI", "Bot connected to Discord server");
});
bot.on("error", err => {
  try {
    logger.log("ERR", err.message);
  } catch (e) {
    logger.log("ERR", err);
  }
});
