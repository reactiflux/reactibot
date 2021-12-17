import {
  MessageReaction,
  Message,
  GuildMember,
  TextChannel,
  PartialMessage,
} from "discord.js";
import cooldown from "./cooldown";
import { isStaff, truncateMessage } from "../utils";
import { ChannelHandlers } from "../types";

const config = {
  // This is how many ️️warning reactions a post must get until it's considered an official warning
  warningThreshold: 1,
  // This is how many ️️warning reactions a post must get until mods are alerted
  thumbsDownThreshold: 2,
  // This is how many ️️warning reactions a post must get the message is deleted
  deletionThreshold: Infinity,
};

type WarningMessages = {
  [messageId: string]: Message;
};

const warningMessages: WarningMessages = {};

const thumbsDownEmojis = ["👎", "👎🏻", "👎🏼", "👎🏽", "👎🏾", "👎🏿"];

type ReactionHandlers = {
  [emoji: string]: (
    reaction: MessageReaction,
    message: Message | PartialMessage,
    member: GuildMember
  ) => void;
};

const reactionHandlers: ReactionHandlers = {
  "⚠️": async (reaction, message, member) => {
    // Skip if the user that reacted isn't in the staff or the post is from someone
    // from the staff
    if (
      !message.guild ||
      !message.author ||
      !isStaff(member) ||
      isStaff(message.guild.members.cache.get(message.author.id))
    ) {
      return;
    }

    const usersWhoReacted = reaction.users.cache.map((user) =>
      message.guild?.members.cache.get(user.id)
    );
    const numberOfTotalReactions = usersWhoReacted.length;
    const numberOfStaffReactions = usersWhoReacted.filter(isStaff).length;

    const modLogChannel = message.guild?.channels.cache.find(
      (channel) =>
        channel.name === "mod-log" || channel.id === "257930126145224704"
    ) as TextChannel;

    const userNames = usersWhoReacted
      .filter((user) => !isStaff(user))
      .map((member) => member?.user.username)
      .join(", ");

    const staffNames = usersWhoReacted
      .filter(isStaff)
      .map((member) => member?.user.username)
      .join(", ");

    try {
      const fullMessage = await message.fetch();

      let logMessage = "";

      const logMessageEnding = [
        "\n\n",
        `\`${truncateMessage((fullMessage as unknown as Message).content)}\``,
        "\n\n",
        `Link: https://discord.com/channels/${fullMessage.guild?.id}/${fullMessage.channel.id}/${fullMessage.id}`,
        "\n\n",
        userNames && `Reactors: \`${userNames}\``,
        staffNames && userNames && "\n",
        staffNames && `Staff: \`${staffNames}\``,
      ]
        .filter(Boolean)
        .join("");

      if (numberOfTotalReactions >= config.warningThreshold) {
        logMessage = `<@${fullMessage.author.id}> has met the warning threshold in <#${fullMessage.channel.id}> for the message:`;
      }

      if (numberOfStaffReactions >= config.deletionThreshold) {
        logMessage = `<@${fullMessage.author.id}> has met the deletion threshold in <#${fullMessage.channel.id}> for the message:`;

        fullMessage.delete();
      }

      if (logMessage) {
        logMessage += logMessageEnding;

        if (warningMessages[fullMessage.id]) {
          warningMessages[fullMessage.id].edit(logMessage);
        } else {
          modLogChannel.send(logMessage).then((warningMessage) => {
            warningMessages[fullMessage.id] = warningMessage;
          });
        }
      }
    } catch (error) {
      console.log("Something went wrong when fetching the message: ", error);
    }
  },
  "👎": async (reaction, message, member) => {
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
        users: [],
      }
    );

    const numberOfTotalReactions = reactions.count;

    const modLogChannel = message.guild.channels.cache.find(
      (channel) =>
        channel.name === "mod-log" || channel.id === "257930126145224704"
    ) as TextChannel;

    try {
      const fullMessage = await message.fetch();

      let logMessage = "";
      const logMessageEnding = [
        "\n\n",
        `${truncateMessage(fullMessage.content)}`,
        "\n\n",
        `Link: https://discord.com/channels/${fullMessage.guild!.id}/${
          fullMessage.channel.id
        }/${fullMessage.id}`,
      ]
        .filter(Boolean)
        .join("");

      if (numberOfTotalReactions >= config.thumbsDownThreshold) {
        logMessage = `<@&102870499406647296> - <@${fullMessage.author.id}> has met the warning threshold in <#${fullMessage.channel.id}> for the message:`;
      }

      if (logMessage) {
        logMessage += logMessageEnding;

        if (warningMessages[message.id]) {
          warningMessages[fullMessage.id].edit(logMessage);
        } else {
          modLogChannel.send(logMessage).then((warningMessage) => {
            warningMessages[fullMessage.id] = warningMessage;
          });
        }
      }
    } catch (error) {
      console.log("Something went wrong when fetching the message: ", error);
    }
  },
};

const emojiMod: ChannelHandlers = {
  handleReaction: ({ reaction, user, bot }) => {
    const { message } = reaction;

    if (!message.guild || message.author?.id === bot.user?.id) {
      return;
    }

    let emoji = reaction.emoji.toString();

    if (thumbsDownEmojis.includes(emoji)) {
      emoji = "👎";
    }

    const member = message.guild.members.cache.get(user.id);
    if (!member) return;

    const reactionHandler = reactionHandlers[emoji];
    if (reactionHandler) {
      reactionHandler(reaction, message, member);
    }
  },
};

export default emojiMod;
