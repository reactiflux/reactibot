import discord, {
  Message,
  MessageReaction,
  User,
  PartialMessageReaction,
  PartialUser,
  Partials,
  ActivityType,
  IntentsBitField,
} from "discord.js";

import { logger, channelLog } from "./features/log";
// import codeblock from './features/codeblock';
import jobsMod, { resetJobCacheCommand } from "./features/jobs-moderation";
import { reviewResume } from "./features/resume";
import autoban from "./features/autoban";
import commands from "./features/commands";
import setupStats from "./features/stats";
import emojiMod from "./features/emojiMod";
import promotionThread from "./features/promotion-threads";
import autothread, { cleanupThreads } from "./features/autothread";

import { ChannelHandlers } from "./types";
import { scheduleMessages } from "./features/scheduled-messages";
import tsPlaygroundLinkShortener from "./features/tsplay";
import { CHANNELS, initCachedChannels } from "./constants/channels";
import { scheduleTask } from "./helpers/schedule";
import { discordToken } from "./helpers/env";
import { registerCommand, deployCommands } from "./helpers/deploy-commands";
import voiceActivity from "./features/voice-activity";

export const bot = new discord.Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildEmojisAndStickers,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.GuildMessageReactions,
    IntentsBitField.Flags.GuildVoiceStates,
    IntentsBitField.Flags.DirectMessages,
    IntentsBitField.Flags.DirectMessageReactions,
    IntentsBitField.Flags.MessageContent,
  ],
  partials: [Partials.Channel, Partials.Message, Partials.Reaction],
});

registerCommand(resetJobCacheCommand);
registerCommand(reviewResume);

logger.log("INI", "Bootstrap starting…");
bot
  .login(discordToken)
  .then(async () => {
    logger.log("INI", "Bootstrap complete");

    bot.user?.setActivity("DMs for !commands", { type: ActivityType.Watching });

    scheduleMessages(bot);

    try {
      const guilds = await bot.guilds.fetch();
      guilds.each((guild) =>
        logger.log("INI", `Bot connected to Discord server: ${guild.name}`),
      );
    } catch (error) {
      console.log("Something went wrong when fetching the guilds: ", error);
    }

    if (bot.application) {
      const { id } = bot.application;
      console.log("Bot started. If necessary, add it to your test server:");
      console.log(
        `https://discord.com/api/oauth2/authorize?client_id=${id}&permissions=8&scope=applications.commands%20bot`,
      );
    }
  })
  .catch((e) => {
    console.log({ e });
    console.log(
      `Failed to log into discord bot. Make sure \`.env.local\` has a discord token. Tried to use '${discordToken}'`,
    );
    console.log(
      'You can get a new discord token at https://discord.com/developers/applications, selecting your bot (or making a new one), navigating to "Bot", and clicking "Copy" under "Click to reveal token"',
    );
    process.exit(1);
  });

export type ChannelHandlersById = {
  [channelId: string]: ChannelHandlers[];
};

const channelHandlersById: ChannelHandlersById = {};

const addHandler = (
  oneOrMoreChannels: string | string[],
  oneOrMoreHandlers: ChannelHandlers | ChannelHandlers[],
) => {
  const channels =
    typeof oneOrMoreChannels === "string"
      ? [oneOrMoreChannels]
      : [...new Set(oneOrMoreChannels)];
  const handlers =
    oneOrMoreHandlers instanceof Array
      ? oneOrMoreHandlers
      : [oneOrMoreHandlers];

  channels.forEach((channelId) => {
    const existingHandlers = channelHandlersById[channelId];
    if (existingHandlers) {
      existingHandlers.push(...handlers);
    } else {
      channelHandlersById[channelId] = handlers;
    }
  });
};

const handleMessage = async (message: Message) => {
  if (message.system) {
    return;
  }
  const msg = message.partial ? await message.fetch() : message;

  const channelId = msg.channel.id;

  if (channelHandlersById[channelId]) {
    channelHandlersById[channelId].forEach((channelHandlers) => {
      channelHandlers.handleMessage?.({ msg, bot });
    });
  }

  if (channelHandlersById["*"]) {
    channelHandlersById["*"].forEach((channelHandlers) => {
      channelHandlers.handleMessage?.({ msg, bot });
    });
  }
};

const handleReaction = (
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser,
) => {
  // if reaction is in a thread, use the parent channel ID
  const { channel } = reaction.message;
  const channelId = channel.isThread()
    ? channel.parentId || channel.id
    : channel.id;
  const handlers = channelHandlersById[channelId];

  if (handlers) {
    handlers.forEach((channelHandlers) => {
      channelHandlers.handleReaction?.({ reaction, user, bot });
    });
  }

  channelHandlersById["*"].forEach((channelHandlers) => {
    channelHandlers.handleReaction?.({ reaction, user, bot });
  });
};

const handleVoiceStateUpdate = (
  oldState: discord.VoiceState,
  newState: discord.VoiceState,
) => {
  const channel = newState.channel || oldState.channel;
  if (!channel) return;

  const channelId = channel.id;
  const handlers = channelHandlersById[channelId];

  if (handlers) {
    handlers.forEach((channelHandlers) => {
      channelHandlers.handleVoiceStateChange?.({ oldState, newState, bot });
    });
  }

  channelHandlersById["*"].forEach((channelHandlers) => {
    channelHandlers.handleVoiceStateChange?.({ oldState, newState, bot });
  });
};

initCachedChannels(bot);
logger.add(channelLog(bot, CHANNELS.botLog));

// Amplitude metrics
setupStats(bot);

// common
addHandler("*", [
  commands,
  autoban,
  emojiMod,
  tsPlaygroundLinkShortener,
  voiceActivity,
]);

addHandler(
  [
    CHANNELS.events,
    CHANNELS.iBuiltThis,
    CHANNELS.iWroteThis,
    CHANNELS.techReadsAndNews,
    CHANNELS.twitterFeed,
  ],
  promotionThread,
);

const threadChannels = [CHANNELS.helpJs, CHANNELS.helpThreadsReact];
addHandler(threadChannels, autothread);

bot.on("ready", () => {
  deployCommands(bot);
  jobsMod(bot);
  scheduleTask("help thread cleanup", 1000 * 60 * 30, () => {
    cleanupThreads(threadChannels, bot);
  });
});

bot.on("messageReactionAdd", handleReaction);

bot.on("voiceStateUpdate", handleVoiceStateUpdate);

bot.on("threadCreate", (thread) => {
  thread.join();
});

bot.on("messageCreate", async (msg) => {
  if (msg.author?.id === bot.user?.id) return;

  handleMessage(msg);
});

const errorHandler = (error: unknown) => {
  if (error instanceof Error) {
    logger.log("ERROR", `${error.message} ${error.stack}`);
  } else if (typeof error === "string") {
    logger.log("ERROR", error);
  }
};
bot.on("error", errorHandler);

process.on("uncaughtException", errorHandler);
process.on("unhandledRejection", errorHandler);
