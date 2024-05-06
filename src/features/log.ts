import { ChannelType, Client } from "discord.js";
import { CHANNELS } from "../constants/channels";

type Logger = (type: string, text: string) => void;

const stdoutLog: Logger = (type, text) => {
  const d = new Date();
  console.log(
    `[${d.toLocaleDateString()} ${d.toLocaleTimeString()}] [${type}]`,
    text,
  );
};

export const channelLog =
  (client: Client, channelId: string): Logger =>
  async (type, text) => {
    try {
      const channel = await client.channels.fetch(channelId);

      if (channel?.type == ChannelType.GuildText) {
        channel.send({
          content: `[${type}] ${text}`,
          allowedMentions: { users: [] },
        });
      }
    } catch (error) {
      console.error(error);
    }
  };

type LoggerKey = keyof typeof CHANNELS | 'stdout';
type LoggerObj = {id: LoggerKey, logger: Logger}
type LoggerMap = Map<LoggerKey | 'stdout', Logger>

const loggers: LoggerMap = new Map([['stdout', stdoutLog]]);

export const logger = {
  add: ({id, logger}: LoggerObj) => loggers.set(id, logger),
  remove: (loggerId: LoggerObj["id"]) => loggers.delete(loggerId),
  log: (type: string, text: string, loggerId: LoggerKey = 'botLog', ) => {
    const defaultLogger = loggers.get('stdout')
    const logger = loggers.get(loggerId)

    if(!defaultLogger) {
      console.error(`Default logger not found`)
      return
    }

    if(!logger) {
      console.error(`Logger with id ${loggerId} not found`)
      return
    }

    defaultLogger(type, text)
    logger(type, text)
  }
};
