import { isProd } from "./helpers/env";

export const modRoleId = "&102870499406647296";

export const applicationId = isProd()
  ? "644375510725689369"
  : "678901220861280256";
export const guildId = "102860784329052160";

export const discordToken = process.env.DISCORD_HASH ?? "";
export const gitHubToken = process.env.GITHUB_TOKEN ?? "";
export const amplitudeKey = process.env.AMPLITUDE_KEY ?? "";

export const enum ReportReasons {
  userWarn = "userWarn",
  userDelete = "userDelete",
  mod = "mod",
  spam = "spam",
}
