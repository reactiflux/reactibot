import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  ClientEvents,
  CommandInteraction,
  SlashCommandBuilder,
} from "discord.js";
import { isProd } from "../helpers/env";

type DebugEvent = {
  eventId: keyof ClientEvents;
  label: string;
  style: ButtonStyle;
};

export const debugEventArr: DebugEvent[] = [
  {
    eventId: "guildBanAdd",
    label: "Guild Ban Add",
    style: ButtonStyle.Danger,
  },
  {
    eventId: "guildBanRemove",
    label: "Guild Ban Remove",
    style: ButtonStyle.Primary,
  },
  {
    eventId: "guildMemberRemove",
    label: "Guild Member Remove",
    style: ButtonStyle.Secondary,
  },
  {
    eventId: "guildMemberUpdate",
    label: "Guild Member Update (timeout)",
    style: ButtonStyle.Success,
  },
];

export const debugEventMap = new Map(debugEventArr.map((x) => [x.eventId, x]));

export const debugEvents = {
  command: new SlashCommandBuilder()
    .setName("debug-event-buttons")
    .setDescription(
      "These buttons help us debug Discord moderation events in the bot.",
    ),
  handler: async (interaction: CommandInteraction) => {
    if (isProd()) {
      return await interaction.reply({
        content: "Not allowed in production environments",
      });
    }

    const row = new ActionRowBuilder<ButtonBuilder>();

    debugEventArr.forEach(({ eventId, label, style }) => {
      const component = new ButtonBuilder()
        .setCustomId(eventId)
        .setLabel(label)
        .setStyle(style);

      row.addComponents(component);
    });

    return await interaction.reply({
      content: "Here are some test buttons",
      components: [row],
    });
  },
};

export const debugEventButtonHandler = (client: Client) => {
  client.on("interactionCreate", async (interaction) => {
    if (isProd()) return;

    if (!interaction.isButton()) return;

    const { customId } = interaction;

    const event = debugEventMap.get(customId as keyof ClientEvents);

    const mockDate = new Date();
    mockDate.setDate(mockDate.getDate() + 14);

    const mockPayload = {
      user: interaction.user,
      guild: {
        fetchAuditLogs: async () => {
          return {
            entries: {
              first: () => ({
                executor: interaction.user,
                target: interaction.user,
                reason: "Debug event",
              }),
            },
          };
        },
      },
    };

    const mockPayloadSecondary = {
      ...mockPayload,
      communicationDisabledUntil: mockDate,
    };

    if (event) {
      // @ts-expect-error payload isn't typed correctly - we added all props needed to satisfy the current mod-activity events that we have
      client.emit(event.eventId, mockPayload, mockPayloadSecondary);
      await interaction.reply(`[DEBUG EVENT] Emitted ${event.label} event.`);
    }
  });
};
