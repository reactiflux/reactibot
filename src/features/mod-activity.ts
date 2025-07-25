import {
  Client,
  AuditLogEvent,
  GuildMember,
  PartialGuildMember,
} from "discord.js";
import { logger } from "./log.js";

const guildMemberTimeoutHandler = (
  oldMember: GuildMember | PartialGuildMember,
  newMember: GuildMember,
) => {
  const oldTimeout = oldMember.communicationDisabledUntil;
  const newTimeout = newMember.communicationDisabledUntil;

  const date = new Date();

  if (!oldTimeout && newTimeout) {
    if (newTimeout >= date) {
      const unixTime = Math.floor(newTimeout.getTime() / 1000);
      // makes sure we don't log timeouts from the past if a user's role updates. It's still possible that a user is updated during a timeout, but this is the best we can do.
      logger.log(
        "TIMEOUT",
        `${newMember.user.tag} has been timed out in ${newMember.guild.name} until <t:${unixTime}:f> (<t:${unixTime}:R>).`,
        "modLog",
      );
    }
  } else if (oldTimeout && !newTimeout) {
    logger.log(
      "TIMEOUT END",
      `${newMember.user.tag}'s timeout has ended in ${newMember.guild.name}.`,
      "modLog",
    );
  }
};

export const modActivity = (client: Client) => {
  client.on("guildMemberRemove", async (member) => {
    try {
      const auditLogs = await member.guild.fetchAuditLogs({
        type: AuditLogEvent.MemberKick,
      });
      const kickLog = auditLogs.entries.first();
      const executor = kickLog?.executor;

      if (executor && kickLog.target?.id === member.user.id) {
        logger.log(
          "KICK",
          `${member.user.tag} has been kicked from ${member.guild.name} by ${
            executor.tag
          } with reason: ${kickLog.reason ?? "No reason provided"}.`,
        );
      }
    } catch (err) {
      logger.log("KICK", `An error occurred while logging a kick: ${err}`);
    }
  });

  client.on("guildBanAdd", async (ban) => {
    try {
      const auditLogs = await ban.guild.fetchAuditLogs({
        type: AuditLogEvent.MemberBanAdd,
      });
      const banLog = auditLogs.entries.first();
      const executor = banLog?.executor;

      if (executor) {
        logger.log(
          "BAN",
          `${ban.user.tag} has been banned by ${executor.tag} with reason: ${
            banLog.reason ?? "No reason provided"
          }.`,
        );
      } else {
        logger.log(
          "BAN",
          `${ban.user.tag} has been banned, but the executor could not be determined.`,
        );
      }
    } catch (err) {
      logger.log("BAN", `An error occurred while logging a ban: ${err}`);
    }
  });

  client.on("guildBanRemove", async (ban) => {
    try {
      const auditLogs = await ban.guild.fetchAuditLogs({
        type: AuditLogEvent.MemberBanRemove,
      });
      const unbanLog = auditLogs.entries.first();
      const executor = unbanLog?.executor;

      if (executor) {
        logger.log(
          "UNBAN",
          `${ban.user.tag} has been unbanned by ${
            executor.tag
          }. The reason for the ban was: ${
            unbanLog.reason ?? "No reason provided"
          }.`,
        );
      } else {
        logger.log(
          "UNBAN",
          `${ban.user.tag} has been unbanned from ${ban.guild.name}, but the executor could not be determined.`,
        );
      }
    } catch (err) {
      logger.log("UNBAN", `An error occurred while logging an unban: ${err}`);
    }
  });

  client.on(
    "guildMemberUpdate",
    (oldMember: GuildMember | PartialGuildMember, newMember: GuildMember) => {
      guildMemberTimeoutHandler(oldMember, newMember);
    },
  );
};
