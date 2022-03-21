import { SlashCommandBuilder } from "@discordjs/builders";
import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v9";
import { applicationId, discordToken, guildId } from "../src/constants";
import { logger } from "../src/features/log";

const cmd = {
  name: "test action",
  description: "¡some kind of test action!",
  handler: () => {},
};
const cmds = [cmd];

const commands = cmds.map((c) =>
  new SlashCommandBuilder()
    .setName(c.name)
    .setDescription(c.description)
    .toJSON(),
);

const rest = new REST({ version: "9" }).setToken(discordToken);

rest
  .put(Routes.applicationGuildCommands(applicationId, guildId), {
    body: commands,
  })
  .then(() =>
    logger.log("DEPLOY", "Successfully registered application commands."),
  )
  .catch((e) => logger.log("DEPLOY", e));
