import {
  ChannelType,
  Client,
  VoiceBasedChannel,
  VoiceChannel,
} from "discord.js";
import { logger } from "./log";
import { scheduleTask } from "../helpers/schedule";

const voiceChannelJoinTimestamps: Record<string, Record<string, number>> = {};

const getTimeInChannel = (
  channel: VoiceBasedChannel | null,
  userId: string,
) => {
  if (!channel) return 0;

  const joinTimestamp = voiceChannelJoinTimestamps[channel.id]?.[userId];
  if (!joinTimestamp) return 0;

  return ((Date.now() - joinTimestamp) / 1000 / 60).toFixed(2);
};

const voiceActivity = (bot: Client) => {
  scheduleTask("voice activity", 3 * 60 * 1000, () => {
    // Fetch all voice channels
    const voiceChannels = bot.channels.cache.filter(
      (channel): channel is VoiceChannel =>
        channel.type === ChannelType.GuildVoice,
    );

    // For each voice channel, log who is currently connected
    voiceChannels.forEach((channel) => {
      const members = channel.members.map(
        (member) =>
          `- ${member.user.username} (${getTimeInChannel(
            channel,
            member.id,
          )} minutes)`,
      );

      // Only log if there are members in the channel
      if (members.length > 0) {
        logger.log(
          "VOICE",
          `${members.length} in <#${channel.id}>:\n${members.join("\n")}`,
        );
      }
    });
  });

  bot.on("voiceStateUpdate", (oldState, newState) => {
    const { member, channel } = newState;
    if (!member) {
      return;
    }

    if (channel) {
      voiceChannelJoinTimestamps[channel.id] ??= {};
      voiceChannelJoinTimestamps[channel.id][member.id] = Date.now();

      logger.log("VOICE", `<@${member.id}> joined <#${channel.id}>.`);
    } else if (!channel) {
      const { channel: cachedChannel } = oldState;
      if (!cachedChannel) return;

      voiceChannelJoinTimestamps[cachedChannel.id] ??= {};

      logger.log(
        "VOICE",
        `<@${member.id}> was in <#${cachedChannel.id}> for ${getTimeInChannel(
          cachedChannel,
          member.id,
        )} minutes.`,
      );
    }
  });
};

export default voiceActivity;
