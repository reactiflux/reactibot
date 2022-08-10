import {
  GuildMember,
  Message,
  MessageOptions,
  MessagePayload,
} from "discord.js";
import { modRoleId } from "../constants";
import {
  constructDiscordLink,
  escapeDisruptiveContent,
  quoteMessageContent,
} from "./discord";
import { simplifyString } from "../helpers/string";
import { CHANNELS, getChannel } from "../constants/channels";

export const modLog = async (
  message: string | MessagePayload | MessageOptions,
) => {
  const logChannel = await getChannel(CHANNELS.jobsLog);
  return await logChannel.send(message);
};

const warningMessages = new Map<
  string,
  { warnings: number; message: Message }
>();

export const enum ReportReasons {
  anonReport = "anonReport",
  userWarn = "userWarn",
  userDelete = "userDelete",
  jobAge = "jobAge",
  jobFrequency = "jobFrequency",
  jobRemoved = "jobRemoved",
  jobCrypto = "jobCrypto",
}

interface Report {
  reason: ReportReasons;
  message: Message;
  extra?: string;
  staff?: GuildMember[];
  members?: GuildMember[];
}
export const reportUser = ({
  reason,
  message,
  extra,
  staff = [],
  members = [],
}: Report) => {
  const simplifiedContent = `${message.author.id}${simplifyString(
    message.content,
  )}`;
  const cached = warningMessages.get(simplifiedContent);
  const logBody = constructLog({ reason, message, extra, staff, members });

  if (cached) {
    // If we already logged for ~ this message, edit the log
    const { message, warnings: oldWarnings } = cached;
    const warnings = oldWarnings + 1;

    const finalLog = logBody.replace(
      /warned \d times/,
      `warned ${warnings} times`,
    );

    message.edit(finalLog);
    warningMessages.set(simplifiedContent, { warnings, message });
    return warnings;
  } else {
    // If this is new, send a new message
    getChannel(
      message.channelId === CHANNELS.jobBoard
        ? CHANNELS.jobsLog
        : CHANNELS.modLog,
    )
      .send(logBody)
      .then((warningMessage) => {
        warningMessages.set(simplifiedContent, {
          warnings: 1,
          message: warningMessage,
        });
      });
    return 1;
  }
};

// Discord's limit for message length
const maxMessageLength = 2000;
export const truncateMessage = (
  message: string,
  maxLength = maxMessageLength - 500,
) => {
  if (message.length > maxLength) return `${message.slice(0, maxLength)}…`;

  return message;
};

const constructLog = ({
  reason,
  message,
  extra: origExtra = "",
  staff = [],
  members = [],
}: {
  reason: ReportReasons;
  message: Message;
  extra?: string;
  staff?: GuildMember[];
  members?: GuildMember[];
}): string => {
  const modAlert = `<@${modRoleId}>`;
  const preface = `<@${message.author.id}> in <#${message.channel.id}> warned 1 times`;
  const extra = origExtra ? `${origExtra}\n` : "";
  const postfix = `Link: ${constructDiscordLink(message)}

${
  members.length
    ? `Reactors: ${members.map(({ user }) => user.username).join(", ")}\n`
    : ""
}${
    staff.length
      ? `Staff: ${staff.map(({ user }) => user.username).join(", ")}`
      : ""
  }
`;
  const reportedMessage = truncateMessage(
    escapeDisruptiveContent(quoteMessageContent(message.content)),
  );

  switch (reason) {
    case ReportReasons.userWarn:
      return `${modAlert} – ${preface}, met the warning threshold for the message:
${extra}
${reportedMessage}

${postfix}`;

    case ReportReasons.userDelete:
      return `${modAlert} – ${preface}, met the deletion threshold for the message:
${extra}
${reportedMessage}

${postfix}`;

    case ReportReasons.anonReport:
      return `${preface}, reported anonymously:
${extra}
${reportedMessage}

${postfix}`;

    case ReportReasons.jobAge:
      return `${preface}, account too young:
${extra}
${reportedMessage}
`;

    case ReportReasons.jobFrequency:
      return `${preface}, posting too frequently:
${extra}
${reportedMessage}
`;

    case ReportReasons.jobRemoved:
      return `${preface}, post was deleted:
${extra}
${reportedMessage}
`;
    case ReportReasons.jobCrypto:
      return `<@${message.author.id}> posted a crypto job:
${reportedMessage}
`;
  }
};
