import { Guild, User } from "discord.js";
import { getModLogChannel } from "../utils";

export const handleBan = async (guild: Guild, user: User) => {
  const modLogChannel = getModLogChannel(guild);
  const ban = await guild.fetchBan(user);

  modLogChannel.send(`
    ${user} has been banned.

Reason: \`\`\`${ban.reason}\`\`\`
`);
};
