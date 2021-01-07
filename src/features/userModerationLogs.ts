import {
  Guild,
  GuildMember,
  PartialGuildMember,
  PartialUser,
  User
} from "discord.js";
import { formatDate, getModLogChannel } from "../utils";

export const handleBan = async (guild: Guild, user: User | PartialUser) => {
  const modLogChannel = getModLogChannel(guild);
  const auditLogs = await guild.fetchAuditLogs({
    limit: 1,
    type: "MEMBER_BAN_ADD"
  });

  const [ban] = auditLogs.entries.values();
  const { executor, reason, createdAt } = ban;

  const dateTimeString = formatDate(createdAt);

  modLogChannel.send(`
    ${user} has been banned by ${executor} on ${dateTimeString}.

Reason: \`\`\`${reason || ""}\`\`\`
`);
};

export const handleMemberRemove = async (
  member: GuildMember | PartialGuildMember
) => {
  const { guild, user } = member;
  const modLogChannel = getModLogChannel(guild);
  const auditLogs = await guild.fetchAuditLogs({
    limit: 1,
    type: "MEMBER_KICK"
  });

  const [kick] = auditLogs.entries.values();
  const { executor, reason, createdAt, target: kickTarget } = kick;
  const dateTimeString = formatDate(createdAt);

  // due to how this works the timeframe is to prevent a user to
  // joining and leaving the server again and again after getting kicked
  // and thus possibly spamming the modlog forever
  const maxTimeout = 10000;
  const withinTimeFrame =
    new Date().getTime() - createdAt.getTime() < maxTimeout;

  if (user && user.id === (kickTarget as User)?.id && withinTimeFrame) {
    modLogChannel.send(`
    ${member} has been kicked by ${executor} on ${dateTimeString}.

Reason: \`\`\`${reason || ""}\`\`\`
    `);
  }
};
