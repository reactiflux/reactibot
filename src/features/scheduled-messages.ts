import { MessageOptions } from "child_process";
import * as discord from "discord.js";
import cron from "node-cron";

export const MESSAGE_SCHEDULE: MessageConfig[] = [
  /*  Example:
  {
    cronExpression: "0,30 * * * *",  // https://crontab.guru/#0,30_*_*_*_*
    guilds: [
      {
        // getting these IDs: https://support.discord.com/hc/en-us/articles/206346498-Where-can-I-find-my-User-Server-Message-ID-
        id: "102860784329052160",  // Reactiflux's server ID
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
  for (const { id, channelIds } of messageConfig.guilds) {
    const guild = await bot.guilds.fetch(id);

    for (const channelId of channelIds) {
      const channel = guild.channels.resolve(channelId);

      if (channel === null) {
        console.log(
          `Failed to send a scheduled message: channel ${channelId} does not exist in guild ${id}.`,
        );
      } else if (!isTextChannel(channel)) {
        console.log(
          `Failed to send a scheduled message: channel ${channelId} in guild ${id} is not a text channel.`,
        );
      } else {
        channel.send(messageConfig.message);
      }
    }
  }
};

const isTextChannel = (
  channel: discord.Channel,
): channel is discord.TextChannel | discord.DMChannel | discord.NewsChannel => {
  return (
    channel.type === "GUILD_TEXT" ||
    channel.type === "GUILD_NEWS" ||
    channel.type === "GUILD_STORE"
  );
};
