import { bot } from "..";
import { ChannelHandlers } from "../types";
import { EMBED_COLOR } from "./commands";

const DELETE_EMOJI = "🗑️";

export const PLAYGROUND_REGEX =
  /https?:\/\/(?:www\.)?(?:typescriptlang|staging-typescript)\.org\/(?:play|dev\/bug-workbench)(?:\/index\.html)?\/?(\??(?:\w+=[^\s#&]+)?(?:&\w+=[^\s#&]+)*)#code\/([\w\-%+_]+={0,4})/;

// See https://github.com/typescript-community/community-bot/blob/master/src/modules/playground.ts
const tsPlaygroundLinkShortener: ChannelHandlers = {
  async handleMessage({ msg }) {
    const match = PLAYGROUND_REGEX.exec(msg.content);
    if (!match) return;

    const [url] = match;

    // Ignore messages that include more than just the link
    if (url.length !== msg.content.trim().length) return;

    const sent = await msg.channel.send({
      embeds: [
        {
          title: "Shortened Playground Link",
          url,
          color: EMBED_COLOR,
          author: {
            name: msg.author.tag,
            iconURL: msg.author.displayAvatarURL(),
          },
        },
      ],
    });
    sent.react(DELETE_EMOJI);
    msg.delete();
  },
  // Remove the embed if the sender of the playground link reacts with DELETE_EMOJI
  handleReaction({ user, reaction }) {
    const { emoji, message } = reaction;
    if (emoji.name !== DELETE_EMOJI) return;

    const embed = message.embeds.find(
      (embed) =>
        embed.title === "Shortened Playground Link" &&
        embed.author?.name === user.tag,
    );
    if (embed) {
      message.delete();
    } else {
      // Don't let anyone else (except the bot) add 🗑️ reactions
      if (user.id !== bot.user?.id) {
        reaction.remove();
      }
    }
  },
};

export default tsPlaygroundLinkShortener;
