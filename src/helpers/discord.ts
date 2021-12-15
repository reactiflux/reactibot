import { Message, GuildMember } from "discord.js";
import { staffRoles } from "../constants";

export const isStaff = (member: GuildMember | null | undefined) => {
  if (!member) return false;

  return member.roles.cache.some((role) =>
    staffRoles.includes(role.name.toLowerCase()),
  );
};

export const constructDiscordLink = (message: Message) =>
  `https://discord.com/channels/${message.guild?.id}/${message.channel.id}/${message.id}`;
