import {
  ContextMenuCommandBuilder,
  SlashCommandBuilder,
} from "@discordjs/builders";
import { REST } from "@discordjs/rest";
import {
  APIApplicationCommand,
  ApplicationCommandType,
  Routes,
} from "discord-api-types/v10";
import { applicationId, discordToken, guildId } from "../src/constants";
import { logger } from "../src/features/log";
import { difference } from "../src/helpers/sets";

import * as report from "../src/commands/report";

// TODO: make this a global command in production
const upsertUrl = () => Routes.applicationGuildCommands(applicationId, guildId);
const deleteUrl = (commandId: string) =>
  Routes.applicationGuildCommand(applicationId, guildId, commandId);

interface CommandConfig {
  name: string;
  description: string;
  type: ApplicationCommandType;
}
const cmds: CommandConfig[] = [report];

const commands = [
  ...cmds
    .filter((x) => x.type === ApplicationCommandType.ChatInput)
    .map((c) =>
      new SlashCommandBuilder()
        .setName(c.name)
        .setDescription(c.description)
        .toJSON(),
    ),
  ...cmds
    .filter((x) => x.type === ApplicationCommandType.Message)
    .map((c) =>
      new ContextMenuCommandBuilder()
        .setType(ApplicationCommandType.Message)
        .setName(c.name)
        .toJSON(),
    ),
  ...cmds
    .filter((x) => x.type === ApplicationCommandType.User)
    .map((c) =>
      new ContextMenuCommandBuilder()
        .setType(ApplicationCommandType.User)
        .setName(c.name)
        .toJSON(),
    ),
];
const names = new Set(commands.map((c) => c.name));

const rest = new REST({ version: "10" }).setToken(discordToken);
const deploy = async () => {
  const remoteCommands = (await rest.get(
    upsertUrl(),
  )) as APIApplicationCommand[];

  // Take the list of names to delete and swap it out for IDs to delete
  const remoteNames = new Set(remoteCommands.map((c) => c.name));
  const deleteNames = [...difference(remoteNames, names)];
  const toDelete = deleteNames
    .map((x) => remoteCommands.find((y) => y.name === x)?.id)
    .filter((x): x is string => Boolean(x));

  logger.log(
    "DEPLOY",
    `Removing ${toDelete.length} commands: [${deleteNames.join(",")}]`,
  );
  await Promise.allSettled(
    toDelete.map((commandId) => rest.delete(deleteUrl(commandId))),
  );

  // Grab a list of commands that need to be updated
  const toUpdate = remoteCommands.filter(
    (c) =>
      // Check all necessary fields to see if any changed. User and Message
      // commands don't have a description.
      !commands.find((x) => {
        const {
          type = ApplicationCommandType.ChatInput,
          name,
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-expect-error Unions are weird
          description = "",
        } = x;
        switch (type as ApplicationCommandType) {
          case ApplicationCommandType.User:
          case ApplicationCommandType.Message:
            return name === c.name && type === c.type;
          case ApplicationCommandType.ChatInput:
          default:
            return (
              name === c.name &&
              type === c.type &&
              description === c.description
            );
        }
      }),
  );

  logger.log(
    "DEPLOY",
    `Updating ${toUpdate.length} commands: [${toUpdate
      .map((x) => x.name)
      .join(",")}]`,
  );

  await rest.put(upsertUrl(), { body: commands });
};
try {
  deploy();
} catch (e) {
  logger.log("DEPLOY EXCEPTION", e as string);
}
