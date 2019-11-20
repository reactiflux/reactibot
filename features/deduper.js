const deduper = {
  logChannelId: "591326408396111907", // Channel where the bot will report about dedupes (#mod-log)
  dupeExpireTime: 2 * 60 * 1000, // 2 minutes to reject the duplicate as cross-post (ms)
  cleanerInterval: 10 * 60 * 1000, // Frees up the memory from 10 to 10 minutes (ms)

  /**
   * Structure example:
   * {
   *   "userIdOne": {
   *     "channelIdOne": message1,
   *     "channelIdTwo": message2,
   *   },
   *   "userIdTwo": {
   *     "channelIdOne": message3,
   *     "channelIdTwo": message4,
   *   },
   * }
   */
  lastMessagesOfMember: {},

  deleteMsgAndWarnUser: (msg, lastMsg) => {
    lastMsg.delete();

    // prettier-ignore
    msg.author
        .send(`Hello there! It looks like you just posted a message to the #${msg.channel.name} channel on our server.

We don't allow cross-posting, so I had to delete your previous message on #${lastMsg.channel.name} because it is identical as your recent message. You can avoid the deletion of messages waiting 2 minutes.

Thank you :)

:robot: This message was sent by a bot, please do not respond to it - in case of additional questions / issues, please contact one of our mods!`);

    msg.client.channels
      .get(deduper.logChannelId)
      .send(`Warned <@${msg.author.id}> for crossposting`);
  },

  handleMessage: ({ msg, user }) => {
    const userId = user.id;
    const lastMessagesPerChannel = deduper.lastMessagesOfMember[userId] || {};
    let shouldSaveMessageToList = true;

    Object.keys(lastMessagesPerChannel).forEach(channelId => {
      const lastMessage = lastMessagesPerChannel[channelId];

      // we take the difference between the time when this message was sent with the time when the last message was sent,
      // if there is an interval bigger than `deduper.dupeExpireTime`, then it is not considered as a duplicate
      const isWithinTheTimeLimit =
        msg.createdTimestamp - lastMessage.createdTimestamp <
        deduper.dupeExpireTime;

      if (
        lastMessage &&
        !lastMessage.deleted &&
        lastMessage.channel.id !== msg.channel.id &&
        lastMessage.content === msg.content &&
        isWithinTheTimeLimit
      ) {
        deduper.deleteMsgAndWarnUser(msg, lastMessage);
        shouldSaveMessageToList = false;
      }
    });

    if (shouldSaveMessageToList) {
      deduper.lastMessagesOfMember[userId] =
        deduper.lastMessagesOfMember[userId] || {};

      deduper.lastMessagesOfMember[userId][msg.channel.id] = msg;
    }
  },

  registerCleaner: () => {
    setInterval(() => {
      Object.keys(deduper.lastMessagesOfMember).forEach(userId => {
        const lastMessagesPerChannel = deduper.lastMessagesOfMember[userId];

        Object.keys(lastMessagesPerChannel).forEach(channelId => {
          const msg = lastMessagesPerChannel[channelId];

          // if the message is older than the expire time it will never be considered a duplicate, so
          // we can remove it from the array to free space
          if (Date.now() - msg.createdTimestamp > deduper.dupeExpireTime) {
            delete lastMessagesPerChannel[channelId];
          }
        });
      });
    }, deduper.cleanerInterval);
  }
};

module.exports = {
  default: deduper
};
