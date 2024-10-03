import {
  Client,
  EmbedType,
  InteractionType,
  ComponentType,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import { CHANNELS } from "../constants/channels";
import { EMBED_COLOR } from "./commands";

const LOCK_POST = "lock-post";

export const lookingForGroup = async (bot: Client) => {
  bot.on("interactionCreate", async (interaction) => {
    if (
      interaction.type !== InteractionType.MessageComponent ||
      interaction.componentType !== ComponentType.Button ||
      !interaction.channel ||
      interaction.channel.type !== ChannelType.PublicThread ||
      interaction.channel.parentId !== CHANNELS.lookingForGroup
    ) {
      return;
    }

    if (interaction.user.id !== interaction.channel.ownerId) {
      interaction.reply({
        ephemeral: true,
        content:
          "This is not your thread! These interactions can only be used by the original poster.",
      });
      return;
    }

    if (interaction.customId === LOCK_POST) {
      await interaction.reply(
        "This post has been locked at the request of the post author",
      );
      await interaction.channel.setLocked(true);
    }
  });
  bot.on("threadCreate", async (thread) => {
    console.log("create");
    if (thread.parentId !== CHANNELS.lookingForGroup) {
      return;
    }

    await thread.send({
      embeds: [
        {
          title: "Looking For Group",
          type: EmbedType.Rich,
          description: `Projects in this space must be open source licensed and may not be commercially monetized — this is a place for enthusiastic collaboration, and anyone found to be exploiting in any manner, especially for free labor, will be moderatated as a hostile actor. 

Please do not routinely re-post your own skills. This is a forum, not a chat channel, prefer to bump your old post by replying to it (maybe with an update about what you've been working on?)

Reactiflux moderators cannot moderate behavior outside of the public channels. If you suspect someone is taking advantage of your generosity, block and move on. Before you accuse someone of being a bot or scammer, though, consider if there might be a language and cultural barrier.

Post authors: Once you've found collaborators or a project to contribute to, please lock your post to indicate that you're no longer seeking responses 🙏`,
          color: EMBED_COLOR,
        },
      ],
      components: [
        // @ts-expect-error Discord.js types appear to be wrong
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(LOCK_POST)
            .setLabel("Lock post")
            .setStyle(ButtonStyle.Danger),
        ),
      ],
    });
  });
};
