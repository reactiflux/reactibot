import fetch from "node-fetch";
import queryString from "query-string";
import { Client } from "discord.js";

type AmplitudeValue = string | number | boolean;
type EmitEventData = Record<string, AmplitudeValue | AmplitudeValue[]>;

const emitEvent = (
  eventName: string,
  { data, userId }: { data?: EmitEventData; userId?: string } = {},
) => {
  if (!process.env.AMPLITUDE_KEY) {
    console.log({
      event_type: eventName,
      event_properties: data,
    });
    return;
  }

  const fields = {
    api_key: process.env.AMPLITUDE_KEY,
    event: JSON.stringify({
      user_id: userId,
      event_type: eventName,
      event_properties: data,
    }),
  };

  fetch(`https://api.amplitude.com/httpapi?${queryString.stringify(fields)}`);
};

const message = "message sent";
const newMember = "new member joined";
const memberLeft = "member left server";
const threadCreated = "thread created";
const threadReplyRemoved = "thread reply removed";
const threadTimeout = "thread timeout";
const threadResolved = "thread resolved";

export const threadStats = {
  threadCreated: (channel: string) =>
    emitEvent(threadCreated, { data: { channel } }),
  threadReplyRemoved: (channel: string) =>
    emitEvent(threadReplyRemoved, { data: { channel } }),
  threadTimeout: (channel: string) =>
    emitEvent(threadTimeout, { data: { channel } }),
  threadResolved: (channel: string, userId: string) =>
    emitEvent(threadResolved, { data: { channel, userId } }),
};

const stats = (client: Client) => {
  client.on("guildMemberAdd", () => {
    emitEvent(newMember);
  });

  client.on("guildMemberRemove", () => {
    emitEvent(memberLeft);
  });

  client.on("messageCreate", async (msg) => {
    const { member, author, channel, content } = msg;

    if (!channel || !author || author.id === client.user?.id) return;

    const channelId =
      channel.isThread() && channel.parent
        ? (await channel.parent.fetch()).id
        : channel.id;

    emitEvent(message, {
      data: {
        channel: channelId,
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
