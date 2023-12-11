import { VoiceBasedChannel } from "discord.js";
import { ChannelHandlers } from "../types";
import { logger } from "./log";

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

const voiceActivity: ChannelHandlers = {
  handleVoiceStateChange({ oldState, newState }) {
    const { member } = newState;
    if (!member) return;

    const diffInPartipants =
      (newState.channel?.members?.size ?? 0) -
      (oldState.channel?.members?.size ?? 0);

    const messages = [];
    let channel: VoiceBasedChannel | null = null;

    if (diffInPartipants > 0) {
      channel = newState.channel;
      if (!channel) return;

      voiceChannelJoinTimestamps[channel.id] ??= {};
      voiceChannelJoinTimestamps[channel.id][member.id] = Date.now();

      messages.push(`<@${member.id}> joined <#${channel.id}>.`);
    } else if (diffInPartipants <= 0) {
      channel = oldState.channel
      if (!channel) return;

      voiceChannelJoinTimestamps[channel.id] ??= {};

      messages.push(
        `<@${member.id}> was in <#${channel.id}> for ${getTimeInChannel(
          channel,
          member.id,
        )} minutes.`,
      );
    }

    if (!channel) return;

    if (channel.members.size > 0) {
      const members = channel.members
        .map(
          (member) =>
            `<@${member.id}> (${getTimeInChannel(
              channel,
              member.id,
            )} minutes)`,
        )
        .join(", ");
      messages.push(`Members in <#${channel.id}>: ${members}`);
    } else {
      messages.push(`No members in <#${channel.id}>.`);
    }

    logger.log("VOICE", messages.join("\n"));
  },
};

export default voiceActivity;
