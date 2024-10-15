import type {
  APIApplicationCommand,
  Client,
  ContextMenuCommandBuilder,
} from "discord.js";
import { InteractionType, Routes } from "discord.js";

import { REST, SlashCommandBuilder } from "discord.js";

import {
  MessageContextCommand,
  SlashCommand,
  UserContextCommand,
  calculateChangedCommands,
} from "./discord";
import { applicationId, isProd, discordToken } from "./env";

export const rest = new REST({ version: "10" }).setToken(discordToken);

/**
 * deployCommands notifies Discord of the latest commands to use and registers
 * interaction event handlers.
 * @param client A discord.js client
 */
export const deployCommands = async (client: Client) => {
  const localCommands = [...commands.values()].map(({ command }) => command);

  await (isProd()
    ? deployProdCommands(client, localCommands)
    : deployTestCommands(client, localCommands));

  client.on("interactionCreate", (interaction) => {
    if (!interaction) {
      return;
    }
    if (
      interaction.type === InteractionType.MessageComponent ||
      interaction.type === InteractionType.ModalSubmit
    ) {
      // Not currently needed
      return;
    }
    const config = commands.get(
      interaction.commandName || "null interaction.command",
    );
    if (!config) {
      throw new Error(`No command found for ${interaction.commandName}`);
    }
    if (
      isSlashCommand(config) &&
      interaction.isAutocomplete() &&
      config.autocomplete
    ) {
      config.autocomplete(interaction);
      return;
    }
    config.handler(interaction as any);
    return;
  });
};

const isSlashCommand = (config: Command): config is SlashCommand =>
  config.command instanceof SlashCommandBuilder;

type ChangedCommands = ReturnType<typeof calculateChangedCommands>;

const applyCommandChanges = async (
  localCommands: (ContextMenuCommandBuilder | SlashCommandBuilder)[],
  toDelete: ChangedCommands["toDelete"],
  didCommandsChange: boolean,
  remoteCount: number,
  put: () => `/${string}`,
  del: (id: string) => `/${string}`,
) => {
  await Promise.allSettled(
    toDelete.map((commandId) => rest.delete(del(commandId))),
  );

  if (!didCommandsChange && remoteCount === localCommands.length) {
    return;
  }

  await rest.put(put(), { body: localCommands });
};

export const deployProdCommands = async (
  client: Client,
  localCommands: (ContextMenuCommandBuilder | SlashCommandBuilder)[],
) => {
  // If a randomly sampled guild has guild commands, wipe all guild commands
  // This should only one once as a migration, but maybe stuff will get into
  // weird states.
  const guilds = await client.guilds.fetch();
  const randomGuild = guilds.at(Math.floor(Math.random() * guilds.size));
  const randomGuildCommands = (await rest.get(
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    Routes.applicationGuildCommands(applicationId, randomGuild!.id),
  )) as APIApplicationCommand[];
  if (randomGuildCommands.length > 0) {
    await Promise.allSettled(
      // for each guild,
      guilds.map(async (g) => {
        // fetch all commands,
        const commands = (await rest.get(
          Routes.applicationGuildCommands(applicationId, g.id),
        )) as APIApplicationCommand[];
        // and delete each one
        await Promise.allSettled(
          commands.map(async (c) =>
            rest.delete(
              Routes.applicationGuildCommand(applicationId, g.id, c.id),
            ),
          ),
        );
      }),
    );
  }

  const remoteCommands = (await rest.get(
    Routes.applicationCommands(applicationId),
  )) as APIApplicationCommand[];
  const { didCommandsChange, toDelete } = calculateChangedCommands(
    localCommands,
    remoteCommands,
  );

  console.log(
    `Deploying commands…
  local:  ${localCommands.map((c) => c.name).join(",")}
  global: ${remoteCommands.map((c) => c.name).join(",")}
Global commands ${
      didCommandsChange || localCommands.length !== remoteCommands.length
        ? "DID"
        : "DID NOT"
    } change
      ${toDelete.length > 0 ? `  deleting: ${toDelete.join(",")}\n` : ""}`,
  );

  await applyCommandChanges(
    localCommands,
    toDelete,
    didCommandsChange,
    remoteCommands.length,
    () => Routes.applicationCommands(applicationId),
    (commandId: string) => Routes.applicationCommand(applicationId, commandId),
  );
};

export const deployTestCommands = async (
  client: Client,
  localCommands: (ContextMenuCommandBuilder | SlashCommandBuilder)[],
) => {
  // Delete all global commands
  // This shouldn't happen, but ensures a consistent state esp in development
  const globalCommands = (await rest.get(
    Routes.applicationCommands(applicationId),
  )) as APIApplicationCommand[];
  // and delete each one
  await Promise.allSettled(
    globalCommands.map(async (c) =>
      rest.delete(Routes.applicationCommand(applicationId, c.id)),
    ),
  );

  // Deploy directly to all connected guilds
  const guilds = await client.guilds.fetch();
  console.log(`Deploying test commands to ${guilds.size} guilds…`);
  await Promise.all(
    guilds.map(async (guild) => {
      const guildCommands = (await rest.get(
        Routes.applicationGuildCommands(applicationId, guild.id),
      )) as APIApplicationCommand[];

      const changes = calculateChangedCommands(localCommands, guildCommands);
      console.log(
        `${guild.name}: ${
          changes.didCommandsChange
            ? `Upserting ${localCommands.length} commands.`
            : "No command updates."
        } ${
          changes.toDelete.length > 0
            ? `Deleting ${changes.toDelete.join(", ")}`
            : ""
        }`,
      );
      await applyCommandChanges(
        localCommands,
        changes.toDelete,
        changes.didCommandsChange,
        guildCommands.length,
        () => Routes.applicationGuildCommands(applicationId, guild.id),
        (commandId: string) =>
          Routes.applicationGuildCommand(applicationId, guild.id, commandId),
      );
    }),
  );
};

type Command = MessageContextCommand | UserContextCommand | SlashCommand;

const commands = new Map<string, Command>();
export const registerCommand = (config: Command) => {
  commands.set(config.command.name, config);
};
