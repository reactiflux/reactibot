import { GuildMember } from "discord.js";

const staffRoles = ["mvp", "moderator", "admin", "admins"];

export const isStaff = (member: GuildMember | null | undefined) => {
  if (!member) return false;

  return member.roles.cache.some(role =>
    staffRoles.includes(role.name.toLowerCase())
  );
};
