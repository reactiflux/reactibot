import fetch from "node-fetch";
import queryString from "query-string";
import { Client } from "discord.js";

type EmitEventData = {
  channel: string; // channel ID
  messageLength: number;
  roles: string[];
};

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

const EVENTS = {
  message: "message sent",
  newMember: "new member joined",
  memberLeft: "member left server",
};

const stats = (client: Client) => {
  client.on("guildMemberAdd", () => {
    emitEvent(EVENTS.newMember);
  });

  client.on("guildMemberRemove", () => {
    emitEvent(EVENTS.memberLeft);
  });

  client.on("messageCreate", (msg) => {
    const { member, author, channel, content } = msg;

    if (!channel || !author || author.id === client.user?.id) return;

    emitEvent(EVENTS.message, {
      data: {
        channel: channel.id,
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
