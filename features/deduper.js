const deduper = {
  monitoredChannels: [
    "102860784329052160", // #general
    "103696749012467712", // #need-help-0
    "565213527673929729" // #need-help-1
  ],

  dupeExpireTime: 2 * 60 * 1000, // 2 minutes to reject the duplicate as cross-post (ms)
  cleanerInterval: 10 * 60 * 1000, // Frees up the memory from 10 to 10 minutes (ms)

  lastMessageOfMember: {},

  deleteMsgAndWarnUser: (msg, lastMsg) => {
    msg.delete();
    // prettier-ignore
    msg.author
        .send(`Hello there! It looks like you just posted a message to the #${msg.channel.name} channel on our server.
			
We don't allow cross-posting, so I had to delete your message because it is identical as your last one posted on #${lastMsg.channel.name}. You can avoid this warning deleting the first message or waiting 2 minutes.

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
        lastMessage.content === msg.content &&
        msg.createdTimestamp - lastMessage.createdTimestamp <
          deduper.dupeExpireTime
      ) {
        deduper.deleteMsgAndWarnUser(msg, lastMessage);
      } else {
        deduper.lastMessageOfMember[userId] = msg;
      }
    }
  },

  registerCleaner: () => {
    setInterval(() => {
      Object.keys(deduper.lastMessageOfMember).forEach(userId => {
        const msg = deduper.lastMessageOfMember[userId];

        if (Date.now() - msg.createdTimestamp > deduper.dupeExpireTime) {
          delete deduper.lastMessageOfMember[userId];
        }
      });
    }, deduper.cleanerInterval);
  }
};

module.exports = {
  default: deduper
};
