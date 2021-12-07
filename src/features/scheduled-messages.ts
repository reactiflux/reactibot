import type * as discord from "discord.js";
import cron from "node-cron";
import { logger } from "./log";

// By keeping these at odd divisions, we can make sure they show up at all timezones. If it were */24, for instance, it would consistently show up in the middle of the night for some timezones.
const enum FREQUENCY {
  "often" = "0 */9 * * *",
  "daily" = "0 */20 * * *",
  "twiceWeekly" = "0 */68 * * *",
  "weekly" = "0 */160 * * *",
}

type MessageConfig = {
  cronExpression: string;
  postTo: { guildId?: discord.Snowflake; channelId: discord.Snowflake }[];
  message: discord.MessageOptions;
};
export const MESSAGE_SCHEDULE: MessageConfig[] = [
  /*  Example:
  {
    cronExpression: "0,30 * * * *",  // https://crontab.guru/#0,30_*_*_*_*
    postTo: [
      {
        // getting these IDs: https://support.discord.com/hc/en-us/articles/206346498-Where-can-I-find-my-User-Server-Message-ID-
        id: "102860784329052160",  // Reactiflux's server ID, optional
        channelIds: ["103696749012467712"]  // #help-react
      }
    ],
    message: {
      embed: {
        title: "Example Message",
        description: "This message is posted every 0th and 30th minute of the hour"
      }
    }
  }
  */
];

export type MessageConfig = {
  cronExpression: string;
  guilds: { id: discord.Snowflake; channelIds: discord.Snowflake[] }[];
  message: discord.MessageOptions;
};

export const messages: MessageConfig[] = [];

export const scheduleMessages = (
  bot: discord.Client,
  messageConfigs: MessageConfig[],
) => {
  const scheduledTasks = messageConfigs.map((messageConfig) =>
    scheduleMessage(bot, messageConfig),
  );
  return scheduledTasks;
};

export const scheduleMessage = (
  bot: discord.Client,
  messageConfig: MessageConfig,
) => {
  return cron.schedule(messageConfig.cronExpression, () =>
    sendMessage(bot, messageConfig),
  );
};

const sendMessage = async (
  bot: discord.Client,
  messageConfig: MessageConfig,
) => {
  messageConfig.postTo.forEach(
    async ({ guildId = "102860784329052160", channelId }) => {
      const guild = await bot.guilds.fetch(guildId);

      const channel = guild.channels.resolve(channelId);

      if (channel === null) {
        logger.log(
          "scheduled",
          `Failed to send a scheduled message: channel ${channelId} does not exist in guild ${guildId}.`,
        );
        return;
      }
      if (!isTextChannel(channel)) {
        logger.log(
          "scheduled",
          `Failed to send a scheduled message: channel ${channelId} in guild ${guildId} is not a text channel.`,
        );
        return;
      }
      channel.send(messageConfig.message);
    },
  );
};

const isTextChannel = (
  channel: discord.Channel,
): channel is discord.TextChannel | discord.DMChannel | discord.NewsChannel => {
  return (
    channel.type === "text" ||
    channel.type === "news" ||
    channel.type === "store"
  );
};
