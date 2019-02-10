const fetch = require("node-fetch");
const queryString = require("query-string");

const { AMPLITUDE_KEY } = process.env;

const emitEvent = (eventName, { data, userId = 0 } = {}) => {
  const fields = {
    api_key: AMPLITUDE_KEY,
    event: JSON.stringify({
      user_id: userId,
      event_type: eventName,
      event_properties: data
    })
  };

  fetch(`https://api.amplitude.com/httpapi?${queryString.stringify(fields)}`);
};

const EVENTS = {
  message: "message sent",
  newMember: "new member joined",
  memberLeft: "member left server"
};

const stats = client => {
  client.on("guildMemberAdd", () => {
    emitEvent(EVENTS.newMember);
  });
  client.on("guildMemberRemove", () => {
    emitEvent(EVENTS.memberLeft);
  });
  client.on("message", msg => {
    const { member, author, channel, content } = msg;
    emitEvent(EVENTS.message, {
      data: {
        channel: channel.id,
        messageLength: content.length,
        roles: member
          ? [...member.roles.values()]
              .map(({ name }) => name)
              // Everybody has 'everyone', so it double-counts when viewing
              // metrics charts.
              .filter(x => x !== "@everyone")
          : []
      },
      userId: author.id
    });
  });
};

module.exports = {
  default: stats
};
