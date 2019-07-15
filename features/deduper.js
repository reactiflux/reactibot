const deduper = {
  monitoredChannels: [
    "600025060379721760",
    "600037597955489797",
    "600037610005463050"
  ],

  // dupeExpireTime

  lastMessageOfMember: {},

  deleteMsgAndWarnUser: (msg, lastMsg) => {
    msg.delete();
    // prettier-ignore
    msg.author
        .send(`Hello there! It looks like you just posted a message to the #${msg.channel.name} channel on our server.
			
We don't allow cross posting, so I had to delete your message because it is idential as your last one posted on #${lastMsg.channel.name}. You can avoid this warning deleting the first message.

Thank you :)

:robot: This message was sent by a bot, please do not respond to it - in case of additional questions / issues, please contact one of our mods!`);
  },

  handleMessage: ({ msg, user }) => {
    if (deduper.monitoredChannels.includes(msg.channel.id)) {
      const userId = user.id;
      const lastMessage = deduper.lastMessageOfMember[userId];
      if (
        lastMessage &&
        !lastMessage.deleted &&
        lastMessage.channel.id !== msg.channel.id &&
        lastMessage.content === msg.content
      ) {
        deduper.deleteMsgAndWarnUser(msg, lastMessage);
      } else {
        deduper.lastMessageOfMember[userId] = msg;
      }
    }
  }
};

module.exports = {
  default: deduper
};
