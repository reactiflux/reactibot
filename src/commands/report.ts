import { ApplicationCommandType } from "discord-api-types/v9";
import { Message, MessageContextMenuInteraction } from "discord.js";
import { ReportReasons, reportUser } from "../helpers/modLog";

export const name = "report-message";
export const description = "Anonymously report this message";
export const type = ApplicationCommandType.Message;
export const handler = async (interaction: MessageContextMenuInteraction) => {
  const message = interaction.targetMessage;
  if (!(message instanceof Message)) {
    return;
  }

  reportUser({ reason: ReportReasons.anonReport, message });

  await interaction.reply({
    ephemeral: true,
    content: "This message has been reported anonymously",
  });
};
