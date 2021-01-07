import { Guild, GuildMember, TextChannel } from "discord.js";

const staffRoles = ["mvp", "moderator", "admin", "admins"];

export const isStaff = (member: GuildMember | null | undefined) => {
  if (!member) return false;

  return member.roles.cache.some(role =>
    staffRoles.includes(role.name.toLowerCase())
  );
};

// Discord's limit for message length
const maxMessageLength = 2000;

export const truncateMessage = (
  message: string,
  maxLength = maxMessageLength - 500
) => {
  if (message.length > maxLength) return `${message.slice(0, maxLength)}...`;

  return message;
};

export const getModLogChannel = (guild: Guild) => {
  return guild.channels.cache.find(
    channel => channel.name === "mod-log" || channel.id === "257930126145224704"
  ) as TextChannel;
};
