const enum ENVIONMENTS {
  production = "production",
}

export const isProd = () => process.env.ENVIRONMENT === ENVIONMENTS.production;

console.log("Running as", isProd() ? "PRODUCTION" : "TEST", "environment");

let ok = true;
const getEnv = (key: string, optional = false) => {
  if (process.env.VITEST) {
    return "dummystring";
  }
  const value = process.env[key];
  if (!value && !optional) {
    console.log(`Add a ${key} value to .env`);
    ok = false;
    return "";
  }
  return value ?? "";
};

export const applicationKey = getEnv("DISCORD_PUBLIC_KEY");
export const applicationId = getEnv("DISCORD_APP_ID");
export const guildId = getEnv("GUILD_ID");
export const discordToken = getEnv("DISCORD_HASH");
export const reactibotApiKey = getEnv("REACTIBOT_API_KEY", true);
export const gitHubReadToken = getEnv("GH_READ_TOKEN", true);
export const amplitudeKey = getEnv("AMPLITUDE_KEY", true);
export const openAiKey = getEnv("OPENAI_KEY", true);

if (!ok) throw new Error("Environment misconfigured");
