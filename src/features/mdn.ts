import { SlashCommandBuilder } from "discord.js";
import { SlashCommand } from "../helpers/discord.js";

const SOURCE_LINK =
  "-# [source](<https://github.com/reactiflux/reactibot/blob/main/src/features/mdn.ts>)";

export const mdnSearch: SlashCommand = {
  command: new SlashCommandBuilder()
    .setName("mdn")
    .setDescription("Link to an MDN resource")
    .addStringOption((option) =>
      option
        .setName("query")
        .setDescription("Which page?")
        .setRequired(true)
        .setAutocomplete(true),
    ) as SlashCommandBuilder,
  handler: async (interaction) => {
    const mdnUrl = interaction.options.getString("query", true);

    if (mdnUrl.startsWith("/")) {
      return await interaction.reply(`https://developer.mozilla.org${mdnUrl}
${SOURCE_LINK}`);
    }

    const res = await fetch(
      `https://developer.mozilla.org/api/v1/search?highlight=false&locale=en-us&q=${mdnUrl}`,
    );
    const { documents } = (await res.json()) as {
      documents?: { title: string; excerpt: string; mdn_url: string }[];
    };

    return await interaction.reply(
      `Maybe one of these?
${documents
  ?.slice(0, 3)
  .map((d) => `- [${d.title}](<https://developer.mozilla.org${d.mdn_url}>)`)
  .join("\n")}
${SOURCE_LINK}`,
    );
  },
  autocomplete: async (interaction) => {
    const partial = interaction.options.getFocused();

    const res = await fetch(
      `https://developer.mozilla.org/api/v1/search?highlight=false&locale=en-us&q=${partial}`,
    );
    const { documents } = (await res.json()) as {
      documents?: { title: string; excerpt: string; mdn_url: string }[];
    };

    await interaction.respond(
      documents
        ? documents
            .filter((d) => d.mdn_url.length < 100)
            .map((b) => ({
              name: b.title,
              value: b.mdn_url,
            }))
        : [],
    );
  },
};
