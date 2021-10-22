import { MessageEmbed } from "discord.js";
import { ChannelHandlers } from "../types";
import { EMBED_COLOR } from "./commands";

export const PLAYGROUND_REGEX =
  /https?:\/\/(?:www\.)?(?:typescriptlang|staging-typescript)\.org\/(?:play|dev\/bug-workbench)(?:\/index\.html)?\/?(\??(?:\w+=[^\s#&]+)?(?:\&\w+=[^\s#&]+)*)#code\/([\w\-%+_]+={0,4})/;

// See https://github.com/typescript-community/community-bot/blob/master/src/modules/playground.ts
const tsPlaygroundLinkShortener: ChannelHandlers = {
  async handleMessage({ msg }) {
    const match = PLAYGROUND_REGEX.exec(msg.content);
    if (!match) return;

    const [url] = match;

    // Ignore messages that include more than just the link
    if (url.length !== msg.content.trim().length) return;

    await msg.channel.send({
      embed: {
        title: "Shortened Playground Link",
        url,
        color: EMBED_COLOR,
        author: {
          name: msg.author.tag,
          iconURL: msg.author.displayAvatarURL(),
        },
      },
    });
    msg.delete();
  },
};

export default tsPlaygroundLinkShortener;
