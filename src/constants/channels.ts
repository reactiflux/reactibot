import { Client, TextChannel } from "discord.js";
import { guildId } from "../constants";
import { isProd } from "../helpers/env";

const LOCAL_CHANNELS: Record<keyof typeof PRODUCTION_CHANNELS, string> = {
  helpReact: "926931785219207301",
  helpThreadsReact: "950790460857794620",
  helpJs: "950790460857794620",
  random: "926931785219207301",
  gaming: "926931785219207301",
  thanks: "926931785219207301",
  jobBoard: "925847361996095509",
  jobsLog: "925847644318879754",
  events: "950790520811184150",
  iBuiltThis: "950790520811184150",
  iWroteThis: "950790520811184150",
  twitterFeed: "950790520811184150",
  techReadsAndNews: "950790520811184150",
  modLog: "925847644318879754",
  botLog: "916081991542276096",
};

const PRODUCTION_CHANNELS = {
  helpReact: "103696749012467712",
  helpThreadsReact: "902647189120118794",
  helpJs: "565213527673929729",
  random: "103325358643752960",
  gaming: "509219336175747082",
  thanks: "798567961468076072",
  jobBoard: "103882387330457600",
  jobsLog: "989201828572954694",
  events: "127442949435817984",
  iBuiltThis: "312761588778139658",
  iWroteThis: "918616846100492298",
  twitterFeed: "951207372125274112",
  techReadsAndNews: "105816607976095744",
  modLog: "591326408396111907",
  botLog: "701462381703856158",
};

export const CHANNELS = isProd() ? PRODUCTION_CHANNELS : LOCAL_CHANNELS;

const LOCAL_ROLES = {
  wordle: "955571117312077824",
  starHelper: "932749426785665136",
  mvp: "932749517290344488",
  moderator: "916797467918471190",
  admin: "916797467918471190",
};
const PRODUCTION_ROLES = {
  wordle: "954499699870666842",
  starHelper: "852537681346691102",
  mvp: "340332804611244043",
  moderator: "102870499406647296",
  admin: "103261043291082752",
};

export const ROLES = isProd() ? PRODUCTION_ROLES : LOCAL_ROLES;

const cachedChannels: Record<string, Record<string, TextChannel>> = {
  [guildId]: {},
};

export const initCachedChannels = async (bot: Client) => {
  const reactiflux = await bot.guilds.fetch(guildId);
  const channels = await Promise.all(
    [CHANNELS.botLog, CHANNELS.modLog, CHANNELS.jobsLog].map((channelId) =>
      reactiflux.channels.fetch(channelId),
    ),
  );

  channels.forEach((channel) => {
    if (!channel || !channel.isText()) return;
    cachedChannels[guildId][channel.id] = channel as TextChannel;
  });
};

export const getChannel = (channelId: string) =>
  cachedChannels[guildId][channelId];
