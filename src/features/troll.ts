import { ChannelType } from "discord.js";
import { isStaff } from "../helpers/discord";
import { ChannelHandlers } from "../types";

const troll: ChannelHandlers = {
  handleMessage: async ({ msg, bot }) => {
    if (msg.guild || !msg.content.startsWith("skillissue")) return;

    const [, messageLink] = msg.content.split(" ");
    const [guildId, channelId, messageId] = new URL(messageLink).pathname
      .split("/")
      .slice(-3);

    const guild = await bot.guilds.fetch(guildId);
    const channel = await guild.channels.fetch(channelId);
    const guildMember = await guild.members.fetch(msg.author.id);
    if (
      isStaff(guildMember) &&
      channel &&
      channel.type === ChannelType.GuildText
    ) {
      const message = await channel.messages.fetch(messageId);
      await message.reply("skill issue");
    }
  },
};

export default troll;
