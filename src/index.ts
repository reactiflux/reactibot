import "dotenv/config";
import {
  Client,
  Message,
  MessageReaction,
  User,
  PartialMessageReaction,
  PartialUser,
  Partials,
  ActivityType,
  IntentsBitField,
} from "discord.js";

import { logger, channelLog } from "./features/log.js";
// import codeblock from './features/codeblock';
import jobsMod, { resetJobCacheCommand } from "./features/jobs-moderation.js";
import { resumeResources } from "./features/resume.js";
import { lookingForGroup } from "./features/looking-for-group.js";
import autoban from "./features/autoban.js";
import commands from "./features/commands.js";
import setupStats from "./features/stats.js";
import emojiMod from "./features/emojiMod.js";
import promotionThread from "./features/promotion-threads.js";
import autothread, { cleanupThreads } from "./features/autothread.js";
import voiceActivity from "./features/voice-activity.js";

import type { ChannelHandlers } from "./types/index.js";
import { scheduleMessages } from "./features/scheduled-messages.js";
import tsPlaygroundLinkShortener from "./features/tsplay.js";
import { CHANNELS, initCachedChannels } from "./constants/channels.js";
import { scheduleTask } from "./helpers/schedule.js";
import { discordToken, isProd } from "./helpers/env.js";
import { registerCommand, deployCommands } from "./helpers/deploy-commands.js";
import resumeReviewPdf from "./features/resume-review.js";
import troll from "./features/troll.js";
import { modActivity } from "./features/mod-activity.js";
import {
  debugEventButtonHandler,
  debugEvents,
} from "./features/debug-events.js";
import { recommendBookCommand } from "./features/book-list.js";
import { mdnSearch } from "./features/mdn.js";
import "./server.js";
import { jobScanner } from "./features/job-scanner.js";

export const bot = new Client({
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
  partials: [Partials.Channel, Partials.Reaction, Partials.GuildMember],
});

registerCommand(resetJobCacheCommand);
registerCommand(recommendBookCommand);
registerCommand(mdnSearch);

if (!isProd()) {
  registerCommand(debugEvents);
}

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
      // Create a new array to avoid mutating the existing one
      channelHandlersById[channelId] = [...existingHandlers, ...handlers];
    } else {
      channelHandlersById[channelId] = [...handlers];
    }
  });
};

const getMessage = async (message: Message) => {
  try {
    return await message.fetch();
  } catch (e: unknown) {
    logger.log(
      "ERROR",
      `Failed to fetch message: ${JSON.stringify({
        error: e,
        messageId: message.id,
        partial: message.partial,
        channelId: message.channelId,
        content: message.content,
        authorUsername: message.author?.username,
        authorSystem: message.author?.system,
        authorBot: message.author?.bot,
        system: message.system,
      })}`,
    );

    return null;
  }
};

const handleMessage = async (message: Message) => {
  if (message.system) {
    return;
  }

  const msg = await getMessage(message);

  if (!msg) {
    return;
  }

  const channel = msg.channel;
  const channelId = channel.isThread()
    ? channel.parentId || channel.id
    : channel.id;

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

initCachedChannels(bot);
logger.add({ id: "botLog", logger: channelLog(bot, CHANNELS.botLog) });
logger.add({ id: "modLog", logger: channelLog(bot, CHANNELS.modLog) });

// Amplitude metrics
setupStats(bot);

// common
addHandler("*", [
  commands,
  autoban,
  emojiMod,
  tsPlaygroundLinkShortener,
  troll,
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
addHandler(
  [
    CHANNELS.helpReact,
    CHANNELS.helpJs,
    CHANNELS.helpReactNative,
    CHANNELS.helpStyling,
    CHANNELS.helpBackend,
    CHANNELS.generalReact,
    CHANNELS.generalTech,
  ],
  jobScanner,
);
const threadChannels = [CHANNELS.helpJs, CHANNELS.helpThreadsReact];
addHandler(threadChannels, autothread);

addHandler(CHANNELS.resumeReview, resumeReviewPdf);

bot.on("ready", () => {
  deployCommands(bot);
  jobsMod(bot);
  resumeResources(bot);
  lookingForGroup(bot);
  voiceActivity(bot);
  modActivity(bot);
  debugEventButtonHandler(bot);
  scheduleTask("help thread cleanup", 1000 * 60 * 30, () => {
    cleanupThreads(threadChannels, bot);
  });
});

bot.on("messageReactionAdd", handleReaction);

bot.on("threadCreate", (thread) => {
  thread.join();
});

bot.on("messageCreate", async (msg) => {
  if (msg.author?.id === bot.user?.id) return;

  if (msg.content.includes("🙂👍👍")) {
    msg.channel.send("heya!");
  }

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
