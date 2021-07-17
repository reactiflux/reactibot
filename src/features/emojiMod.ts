import { GuildMember, Message, MessageReaction, TextChannel } from "discord.js";
import { ChannelHandlers } from "../types";
import { isStaff, truncateMessage } from "../utils";
import cooldown from "./cooldown";

const config = {
  // This is how many ️️warning reactions a post must get until it's considered an official warning
  warningThreshold: 1,
  // This is how many ️️warning reactions a post must get until mods are alerted
  thumbsDownThreshold: 2,
  // This is how many ️️warning reactions a post must get the message is deleted
  deletionThreshold: Infinity
};

type WarningMessages = {
  [messageId: string]: Message;
};

const warningMessages: WarningMessages = {};

const thumbsDownEmojis = ["👎", "👎🏻", "👎🏼", "👎🏽", "👎🏾", "👎🏿"];

type ReactionHandlers = {
  [emoji: string]: (
    reaction: MessageReaction,
    message: Message,
    member: GuildMember,
    isBot: boolean
  ) => void;
};

export const reactionHandlers: ReactionHandlers = {
  "⚠️": (reaction, message, member, botBoolean) => {
    // Skip if the user that reacted isn't in the staff or the post is from someone
    // from the staff but not when it's done by the bot itself;

    if (
      !message.guild ||
      !message.author ||
      !isStaff(member) ||
      (botBoolean ? true : isStaff(message.guild.member(message.author.id)))
    ) {
      return;
    }
    console.log("bot reached after the verification");

    const usersWhoReacted = reaction.users.cache.map(user =>
      message.guild?.member(user.id)
    );
    const numberOfTotalReactions = usersWhoReacted.length;
    const numberOfStaffReactions = usersWhoReacted.filter(isStaff).length;

    const modLogChannel = message.guild?.channels.cache.find(
      channel =>
        channel.name === "mod-log" || channel.id === "865641297599004713"
    ) as TextChannel;

    const userNames = usersWhoReacted
      .filter(user => !isStaff(user))
      .map(member => member?.user.username)
      .join(", ");

    const staffNames = usersWhoReacted
      .filter(isStaff)
      .map(member => member?.user.username)
      .join(", ");

    let logMessage = "";

    const logMessageEnding = [
      "\n\n",
      `\`${truncateMessage(message.content)}\``,
      "\n\n",
      `Link: https://discord.com/channels/${message.guild?.id}/${message.channel.id}/${message.id}`,
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
  "👎": (reaction, message, member) => {
    if (!message.guild || cooldown.hasCooldown(member.id, "thumbsdown")) {
      return;
    }

    cooldown.addCooldown(member.id, "thumbsdown", 60); // 1 minute

    const reactions = thumbsDownEmojis.reduce(
      (acc, emoji) => {
        if (message.reactions.cache.get(emoji)) {
          acc.count += message.reactions.cache.get(emoji)?.count || 0;

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

    const modLogChannel = message.guild.channels.cache.find(
      channel =>
        channel.name === "mod-log" || channel.id === "257930126145224704"
    ) as TextChannel;

    let logMessage = "";
    const logMessageEnding = [
      "\n\n",
      `${truncateMessage(message.content)}`,
      "\n\n",
      `Link: https://discord.com/channels/${message.guild.id}/${message.channel.id}/${message.id}`
    ]
      .filter(Boolean)
      .join("");

    if (numberOfTotalReactions >= config.thumbsDownThreshold) {
      logMessage = `<@&102870499406647296> - <@${message.author.id}> has met the warning threshold in <#${message.channel.id}> for the message:`;
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

const emojiMod: ChannelHandlers = {
  handleReaction: ({ reaction, user, bot }) => {
    const { message } = reaction;

    if (!message.guild) return;
    let emoji = reaction.emoji.toString();
    const member = message.guild.member(user.id);
    if (!member) return;
    const isReactionByBot = reaction.users.cache.some(user => user.bot);
    console.log("----------------------");
    console.log("is bot", isReactionByBot);

    if (emoji === "⚠️" && isReactionByBot) {
      console.log("found warning⚠️ ");
      return;
    }
    console.log("don't come here");

    if (thumbsDownEmojis.includes(emoji)) {
      emoji = "👎";
    }

    const reactionHandler = reactionHandlers[emoji];
    if (reactionHandler) {
      reactionHandler(reaction, message, member, false);
    }
  }
};

export default emojiMod;
