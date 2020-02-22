import { GuildMember } from "discord.js";

const staffRoles = ["mvp", "moderator", "admin", "admins"];

export const isStaff = (member: GuildMember) =>
  member.roles.cache.some(role => {
    console.log(
      "role name",
      role.name.toLowerCase(),
      "-",
      staffRoles.includes(role.name.toLowerCase())
    );
    return staffRoles.includes(role.name.toLowerCase());
  });
