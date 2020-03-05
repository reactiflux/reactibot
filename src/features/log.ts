import { Client, TextChannel } from "discord.js";

type Logger = (type: string, text: string) => void;

export const stdoutLog: Logger = (type, text) => {
  const d = new Date();
  console.log(
    `[${d.toLocaleDateString()} ${d.toLocaleTimeString()}] [${type}] ${text}`
  );
};

export const channelLog = (bot: Client, channelID: string): Logger => (
  type,
  text
) => {
  try {
    const channel = bot.channels.cache.get(channelID) as TextChannel;
    channel.send(`[${type}] ${text}`);
    // eslint-disable-next-line no-empty
  } catch (e) {}
};

const loggers: Logger[] = [];

export const logger = {
  add: (logger: Logger) => loggers.push(logger),
  log: (type: string, text: string) => loggers.map(logger => logger(type, text))
};
