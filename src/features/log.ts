import { Client } from "discord.js";

type Logger = (type: string, text: string) => void;

export const stdoutLog: Logger = (type, text) => {
  const d = new Date();
  console.log(
    `[${d.toLocaleDateString()} ${d.toLocaleTimeString()}] [${type}] ${text}`,
  );
};

export const channelLog =
  (client: Client, channelId: string): Logger =>
  async (type, text) => {
    try {
      const channel = await client.channels.fetch(channelId);

      if (channel?.isText()) {
        channel.send(`[${type}] ${text}`);
      }
    } catch (error) {
      console.error(error);
    }
  };

const loggers: Logger[] = [];

export const logger = {
  add: (logger: Logger) => loggers.push(logger),
  log: (type: string, text: string) =>
    loggers.map((logger) => logger(type, text)),
};
