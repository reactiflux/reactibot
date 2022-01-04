import { Message } from "discord.js";
import { ReportReasons, modRoleId } from "../constants";
import { constructDiscordLink } from "./discord";

// Discord's limit for message length
const maxMessageLength = 2000;
export const truncateMessage = (
  message: string,
  maxLength = maxMessageLength - 500,
) => {
  if (message.length > maxLength) return `${message.slice(0, maxLength)}…`;

  return message;
};

export const constructLog = (
  trigger: ReportReasons,
  members: string[],
  staff: string[],
  message: Message,
) => {
  const modAlert = `<@${modRoleId}>`;
  const preface = `<@${message.author.id}> in <#${message.channel.id}> warned 1 times`;
  const postfix = `Link: ${constructDiscordLink(message)}

${members.length ? `Reactors: ${members.join(", ")}` : ""}
${staff.length ? `Staff: ${staff.join(", ")}` : ""}
`;
  const reportedMessage = truncateMessage(message.content);

  switch (trigger) {
    case ReportReasons.mod:
      return `${preface}:

\`${reportedMessage}\`

${postfix}`;

    case ReportReasons.userWarn:
      return `${modAlert} – ${preface}, met the warning threshold for the message:

\`${reportedMessage}\`

${postfix}`;

    case ReportReasons.userDelete:
      return `${modAlert} – ${preface}, met the deletion threshold for the message:

\`${reportedMessage}\`

${postfix}`;
    case ReportReasons.spam:
      return `${preface}, reported for spam:

\`${reportedMessage}\`

${postfix}`;
  }
};
