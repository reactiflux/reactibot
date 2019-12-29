const cooldown = require("./cooldown").default;

const staffRoles = ["mvp", "moderator", "admin", "admins"];

const isStaff = member =>
  (member.roles || []).some(role =>
    staffRoles.includes(role.name.toLowerCase())
  );

const config = {
  // This is how many ️️warning reactions a post must get until it's considered an official warning
  warningThreshold: 1,
  // This is how many ️️warning reactions a post must get until mods are alerted
  thumbsDownThreshold: 2,
  // This is how many ️️warning reactions a post must get the message is deleted
  deletionThreshold: Infinity
};

const warningMessages = {};

const thumbsDownEmojis = ["👎", "👎🏻", "👎🏼", "👎🏽", "👎🏾", "👎🏿"];

const reactionHandlers = {
  "⚠️": (bot, reaction, message, member) => {
    if (!isStaff(member)) {
      return;
    }
    const usersWhoReacted = reaction.users.map(user =>
      message.guild.members.get(user.id)
    );
    const numberOfTotalReactions = usersWhoReacted.length;
    const numberOfStaffReactions = usersWhoReacted.filter(isStaff).length;

    const modLogChannel = bot.channels.find(
      channel =>
        channel.name === "mod-log" || channel.id === "257930126145224704"
    );

    const userNames = usersWhoReacted
      .filter(user => !isStaff(user))
      .map(member => member.user.username)
      .join(", ");

    const staffNames = usersWhoReacted
      .filter(isStaff)
      .map(member => member.user.username)
      .join(", ");

    let logMessage = "";
    const logMessageEnding = [
      "\n\n",
      `\`${message.content}\``,
      "\n\n",
      `Link: https://discordapp.com/channels/${message.guild.id}/${message.channel.id}/${message.id}`,
      "\n\n",
      userNames && `Reactors: \`${userNames}\``,
      staffNames && userNames && "\n",
      staffNames && `Staff: \`${staffNames}\``
    ]
      .filter(Boolean)
      .join("");

    if (numberOfTotalReactions >= config.warningThreshold) {
      logMessage = `<@${message.author.id}> has met the warning threshold in <#${message.channel.id}> for the message:`;
    }

    if (numberOfStaffReactions >= config.deletionThreshold) {
      logMessage = `<@${message.author.id}> has met the deletion threshold in <#${message.channel.id}> for the message:`;

      message.delete();
    }

    if (logMessage) {
      logMessage += logMessageEnding;

      if (warningMessages[message.id]) {
        warningMessages[message.id].edit(logMessage);
      } else {
        modLogChannel.send(logMessage).then(warningMessage => {
          warningMessages[message.id] = warningMessage;
        });
      }
    }
  },
  "👎": (bot, reaction, message, member) => {
    if (cooldown.hasCooldown(member.id, "thumbsdown")) {
      return;
    }
    cooldown.addCooldown(member.id, "thumbsdown", 60); // 1 minute

    const reactions = thumbsDownEmojis.reduce(
      (acc, emoji) => {
        if (message.reactions.get(emoji)) {
          acc.count += message.reactions.get(emoji).count;

          // todo: figure out how to do this
          // acc.users.push(Object.values(message.reactions.get(emoji).users));
        }

        return acc;
      },
      {
        count: 0,
        users: []
      }
    );

    const numberOfTotalReactions = reactions.count;

    const modLogChannel = bot.channels.find(
      channel => channel.name === "mod-log"
    );

    let logMessage = "";
    const logMessageEnding = [
      "\n\n",
      `\`${message.content}\``,
      "\n\n",
      `Link: https://discordapp.com/channels/${message.guild.id}/${message.channel.id}/${message.id}`
    ]
      .filter(Boolean)
      .join("");

    if (numberOfTotalReactions >= config.thumbsDownThreshold) {
      logMessage = `@moderator - <@${message.author.id}> has met the warning threshold in <#${message.channel.id}> for the message:`;
    }

    if (logMessage) {
      logMessage += logMessageEnding;

      if (warningMessages[message.id]) {
        warningMessages[message.id].edit(logMessage);
      } else {
        modLogChannel.send(logMessage).then(warningMessage => {
          warningMessages[message.id] = warningMessage;
        });
      }
    }
  }
};

const emojiMod = bot => ({
  handleReaction: ({ reaction, user }) => {
    const { message } = reaction;
    const { member } = message;
    if (user.id === bot.user.id) {
      return;
    }
    if (message.author.id === bot.user.id) {
      return;
    }
    let emoji = reaction.emoji.toString();

    if (thumbsDownEmojis.includes(emoji)) {
      emoji = "👎";
    }

    const reactionHandler = reactionHandlers[emoji];
    if (reactionHandler) {
      reactionHandler(
        bot,
        reaction,
        message,
        message.guild.members.get(user.id)
      );
    }
  }
});

module.exports = {
  default: emojiMod
};
