import { Client, GuildMember } from "discord.js";

const staffRoles = ["mvp", "moderator", "admin", "admins", "reactiflux"];

export const isBot = (
  member: GuildMember | null | undefined,
  bot: Client | null | undefined
) => {
  if (!member) {
    return false;
  }

  return member.roles.cache.some(
    role =>
      staffRoles.includes(role.name.toLowerCase()) &&
      member.user.id === bot?.user?.id
  );
};

export const isStaff = (member: GuildMember | null | undefined) => {
  if (!member) {
    return false;
  }

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
