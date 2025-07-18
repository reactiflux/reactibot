import {
  Message,
  User,
  Client,
  MessageReaction,
  PartialMessageReaction,
  PartialUser,
  VoiceState,
  OmitPartialGroupDMChannel,
} from "discord.js";

type CommonArgs = {
  bot: Client;
};

export type HandleMessageArgs = CommonArgs & {
  msg: OmitPartialGroupDMChannel<Message>;
};

export type HandleReactionArgs = CommonArgs & {
  reaction: MessageReaction | PartialMessageReaction;
  user: User | PartialUser;
};

export type HandleVoiceStateChangeArgs = CommonArgs & {
  oldState: VoiceState;
  newState: VoiceState;
};

export type ChannelHandlers = {
  handleMessage?: (obj: HandleMessageArgs) => void;
  handleReaction?: (obj: HandleReactionArgs) => void;
  handleVoiceStateChange?: (obj: HandleVoiceStateChangeArgs) => void;
};
