import fetch from "node-fetch";
import queryString from "query-string";
import { ChannelType, Client } from "discord.js";
import { amplitudeKey } from "../helpers/env";
import { difference } from "../helpers/sets";
import { mapAppliedTagsToTagNames } from "../helpers/discord";

type AmplitudeValue = string | number | boolean;
type EmitEventData = Record<string, AmplitudeValue | AmplitudeValue[]>;

const emitEvent = (
  eventName: string,
  { data, userId }: { data?: EmitEventData; userId?: string } = {},
) => {
  if (!amplitudeKey) {
    console.log({
      user_id: userId,
      event_type: eventName,
      event_properties: data,
    });
    return;
  }

  const fields = {
    api_key: amplitudeKey,
    event: JSON.stringify({
      user_id: userId || "0",
      event_type: eventName,
      event_properties: data,
    }),
  };

  fetch(`https://api.amplitude.com/httpapi?${queryString.stringify(fields)}`);
};

const message = "message sent";
const postTagged = "post tagged";
const threadCreated = "thread created";
const threadReplyRemoved = "thread reply removed";
const threadTimeout = "thread timeout";
const threadResolved = "thread resolved";
const reacted = "reaction added";

export const threadStats = {
  postTagged: (tags: string[], channel: string) =>
    emitEvent(postTagged, { data: { tags, channel } }),
  threadCreated: (channel: string) =>
    emitEvent(threadCreated, { data: { channel } }),
  threadReplyRemoved: (channel: string) =>
    emitEvent(threadReplyRemoved, { data: { channel } }),
  threadTimeout: (channel: string) =>
    emitEvent(threadTimeout, { data: { channel } }),
  threadResolved: (
    channel: string,
    threadAuthor: string,
    answerAuthor: string,
  ) =>
    emitEvent(threadResolved, {
      data: { channel, threadAuthor, answerAuthor },
      userId: threadAuthor,
    }),
};

const stats = (client: Client) => {
  client.on("threadUpdate", async (oldThread, newThread) => {
    if (oldThread.parent?.type !== ChannelType.GuildForum) {
      return;
    }
    const appliedTags = [
      ...difference(
        new Set(newThread.appliedTags),
        new Set(oldThread.appliedTags),
      ),
    ];

    if (appliedTags.length === 0) {
      return;
    }

    threadStats.postTagged(
      mapAppliedTagsToTagNames(appliedTags, oldThread.parent),
      newThread.parentId ?? "0",
    );
  });
  client.on("threadCreate", async (thread) => {
    if (
      thread.parent?.type === ChannelType.GuildForum &&
      thread.appliedTags.length > 0
    ) {
      threadStats.postTagged(
        mapAppliedTagsToTagNames(thread.appliedTags, thread.parent),
        thread.parentId ?? "0",
      );
    }
  });
  client.on("messageReactionAdd", async (reaction, user) => {
    const { message, emoji } = reaction;
    const { channel } = message;

    if (!channel || !emoji || !user || user.bot) return;

    const channelId =
      channel.isThread() && channel.parent
        ? (await channel.parent.fetch()).id
        : channel.id;

    emitEvent(reacted, {
      data: {
        channel: channelId,
        emoji: emoji.toString() ?? "n/a",
        target: message.author?.id ?? "0",
      },
      userId: user.id,
    });
  });
  client.on("messageCreate", async (msg) => {
    const { member, author, channel, content } = msg;

    if (
      !channel ||
      !channel.isTextBased() ||
      channel.isDMBased() ||
      !author ||
      author.bot ||
      msg.system
    ) {
      return;
    }
    const rootChannel =
      channel.isThread() && channel.parent
        ? await channel.parent.fetch()
        : channel;

    emitEvent(message, {
      data: {
        channel: rootChannel.id,
        category: rootChannel.parentId ?? "0",
        messageLength: content?.length ?? 0,
        roles: member
          ? [...member.roles.cache.values()]
              .map(({ name }) => name)
              // Everybody has 'everyone', so it double-counts when viewing
              // metrics charts.
              .filter((x) => x !== "@everyone")
          : [],
      },
      userId: author.id,
    });
  });
};

export default stats;
