import { isProd } from "./helpers/env";

export const modRoleId = "&102870499406647296";

export const applicationKey = isProd()
  ? "226a4daef2f1eb0429163f825eadd5ac8090fd24bba29274ae9788a8c4b6cd73"
  : "230d8b39980d071b67abd6406b48744152087801a6239402abb2bad2e0e28008";
export const applicationId = isProd()
  ? "644375510725689369"
  : "678901220861280256";
export const guildId = isProd() ? "102860784329052160" : "614601782152265748";

export const discordToken = process.env.DISCORD_HASH ?? "";
export const gitHubToken = process.env.GITHUB_TOKEN ?? "";
export const amplitudeKey = process.env.AMPLITUDE_KEY ?? "";

export const enum ReportReasons {
  anonReport = "anonReport",
  userWarn = "userWarn",
  userDelete = "userDelete",
  mod = "mod",
  spam = "spam",
}
