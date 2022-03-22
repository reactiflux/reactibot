import {
  ContextMenuCommandBuilder,
  SlashCommandBuilder,
} from "@discordjs/builders";
import { REST } from "@discordjs/rest";
import { ApplicationCommandType, Routes } from "discord-api-types/v9";
import { applicationId, discordToken, guildId } from "../src/constants";
import { logger } from "../src/features/log";

const cmd = {
  name: "test action",
  description: "¡some kind of test action!",
  handler: () => {},
};
const cmds = [cmd];

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
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error Discord.js doesn't export the union we need
        .setType(ApplicationCommandType.Message)
        .setName(c.name)
        .toJSON(),
    ),
  ...cmds
    .filter((x) => x.type === ApplicationCommandType.User)
    .map((c) =>
      new ContextMenuCommandBuilder()
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error Discord.js doesn't export the union we need
        .setType(ApplicationCommandType.User)
        .setName(c.name)
        .toJSON(),
    ),
];

const rest = new REST({ version: "9" }).setToken(discordToken);

rest
  // TODO: make this a global command in production
  .put(Routes.applicationGuildCommands(applicationId, guildId), {
    body: commands,
  })
  .then(() =>
    logger.log("DEPLOY", "Successfully registered application commands."),
  )
  .catch((e) => logger.log("DEPLOY", e));
