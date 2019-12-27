const knex = require("../db");
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
  deletionThreshold: Infinity,

  // The number of days that the restriction role should last
  RESTRICTION_DAYS: 3
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
      logMessage = `\`<@${message.author.id}> has met the deletion threshold in <#${message.channel.id}> for the message:`;

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
  "👎": (bot, reaction, message) => {
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
  },
  "⛔": (bot, reaction, message, member) => {
    if (!isStaff(member)) {
      return;
    }

    const restrictedRole = message.guild.roles.find(
      role => role.name === "restricted"
    );
    const targetUser = message.guild.members.get(message.author.id);

    const modLogChannel = bot.channels.find(
      channel => channel.name === "mod-log"
    );

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + config.RESTRICTION_DAYS);

    let logMessage = `<@${message.author.id}> has been restricted for ${config.RESTRICTION_DAYS} days by <@${member.user.id}>.`;
    logMessage += "\n\n";
    logMessage += "```";
    logMessage += `Start Date: ${startDate.toLocaleString()}`;
    logMessage += "\n";
    logMessage += `End Date: ${endDate.toLocaleString()}`;
    logMessage += "```";

    targetUser.roles.add(restrictedRole);
    modLogChannel.send(logMessage);

    knex
      .table("restrictions")
      .insert({
        user_id: message.author.id,
        start_time: startDate,
        end_time: endDate
      })
      .then(() => {
        console.log(`Saved restriction for ${message.author.id}`);
      });
  }
};

const setupRestrictionsIntervals = async bot => {
  const expiredRestrictions = await knex("restrictions").where(
    "end_time",
    "<",
    new Date()
  );

  const guild = bot.guilds.find(g => g.name === "Reactiflux");

  expiredRestrictions.forEach(expiredRestriction => {
    const { id, user_id, start_time } = expiredRestriction;
    const startDate = new Date(start_time).toLocaleString();

    const modLogChannel = bot.channels.find(
      channel => channel.name === "mod-log"
    );

    let logMessage = `<@${user_id}>'s restriction from ${startDate} has been lifted.`;
    modLogChannel.send(logMessage);

    const restrictedRole = guild.roles.find(role => role.name === "restricted");
    const targetUser = guild.members.get(user_id);

    knex("restrictions")
      .where({ user_id })
      .delete();

    if (!targetUser) {
      // on the wrong server, not a problem
      return;
    }

    targetUser.roles.remove(restrictedRole);
  });
};

const emojiMod = bot => {
  setTimeout(() => {
    setupRestrictionsIntervals(bot);

    setInterval(() => {
      setupRestrictionsIntervals(bot);
    }, 12 * 60 * 60 * 1000); // 12 hours
  }, 10000);

  return {
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
    },
    handleJoin: async member => {
      const existingRestrictionsFromUser = await knex
        .table("restrictions")
        .where({
          user_id: member.user.id
        })
        .first();

      if (!existingRestrictionsFromUser) {
        return;
      }

      const restrictedRole = member.guild.roles.find(
        role => role.name === "restricted"
      );

      const modLogChannel = bot.channels.find(
        channel => channel.name === "mod-log"
      );

      const logMessage = `<@${member.user.id}> has been re-restricted since they rejoined the server.`;

      member.roles.add(restrictedRole);
      modLogChannel.send(logMessage);
    }
  };
};

module.exports = {
  default: emojiMod
};
