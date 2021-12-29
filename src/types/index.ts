import {
  Message,
  User,
  Client,
  MessageReaction,
  PartialMessageReaction,
  PartialUser,
  PartialMessage,
} from "discord.js";

type CommonArgs = {
  bot: Client;
};

export type HandleMessageArgs = CommonArgs & {
  msg: Message | PartialMessage;
};

export type HandleReactionArgs = CommonArgs & {
  reaction: MessageReaction | PartialMessageReaction;
  user: User | PartialUser;
};

export type ChannelHandlers = {
  handleMessage?: (obj: HandleMessageArgs) => void;
  handleReaction?: (obj: HandleReactionArgs) => void;
};
