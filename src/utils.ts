import { GuildMember, Message } from "discord.js";

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

const disabledBotChannelNames = ["random"];

export const isBotDisabledInChannel = (channelName: string) => {
  return disabledBotChannelNames.includes(channelName);
};

export const notifyUserBotResponseWasPrevented = async (
  message: Message,
  channelName: string
) => {
  const { author, channel } = message;

  try {
    await author.send(
      `Please do not test bot commands in the #${channelName} channel. You can test them here.`
    );
  } catch {
    await channel.send(
      `Please do not test bot commands in the #${channelName} channel. You can direct message me to test them (you may need to enable direct messages from users in this server).`
    );
  }
};
