import {
  Message,
  GuildMember,
  PartialMessage,
  Guild,
  MessageReaction,
  PartialMessageReaction,
} from "discord.js";
import { staffRoles } from "../constants";

export const isStaff = (member: GuildMember | null | undefined) => {
  if (!member) return false;

  return member.roles.cache.some((role) =>
    staffRoles.includes(role.name.toLowerCase()),
  );
};

export const constructDiscordLink = (message: Message | PartialMessage) =>
  `https://discord.com/channels/${message.guild?.id}/${message.channel.id}/${message.id}`;

export const fetchReactionMembers = (
  guild: Guild,
  reaction: MessageReaction | PartialMessageReaction,
) =>
  Promise.all(reaction.users.cache.map((user) => guild.members.fetch(user.id)));
