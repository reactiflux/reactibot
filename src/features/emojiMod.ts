import { MessageReaction, Message, GuildMember, Guild } from "discord.js";
import cooldown from "./cooldown";
import { ChannelHandlers } from "../types";
import { ReportReasons, reportUser } from "../helpers/modLog";
import { fetchReactionMembers, isStaff } from "../helpers/discord";
import { partition } from "../helpers/array";
import { sleep } from "../helpers/misc";

const config = {
  // This is how many ️️warning reactions a post must get until it's considered an official warning
  warningThreshold: 1,
  // This is how many ️️warning reactions a post must get until mods are alerted
  thumbsDownThreshold: 2,
  // This is how many ️️warning reactions a post must get the message is deleted
  deletionThreshold: Infinity,
};

const thumbsDownEmojis = ["👎", "👎🏻", "👎🏼", "👎🏽", "👎🏾", "👎🏿"];

type ReactionHandlers = {
  [emoji: string]: (args: {
    guild: Guild;
    reaction: MessageReaction;
    message: Message;
    reactor: GuildMember;
    author: GuildMember;
    usersWhoReacted: GuildMember[];
  }) => void;
};

export const reactionHandlers: ReactionHandlers = {
  "⚠️": async ({ author, reactor, message }) => {
    // Skip if the post is from someone from the staff, or if the reaction isn't
    // from staff
    if (isStaff(author) || !isStaff(reactor)) {
      return;
    }

    const reply = await message.reply(
      'This has been replaced by a "Track" command in the message command options! Right click the message instead.',
    );
    await sleep(10);
    await reply.delete();
  },
  "👎": async ({ message, reactor, usersWhoReacted }) => {
    if (cooldown.hasCooldown(reactor.id, "thumbsdown")) {
      return;
    }

    cooldown.addCooldown(reactor.id, "thumbsdown", 60); // 1 minute

    const totalReacts = usersWhoReacted.length;

    if (totalReacts < config.thumbsDownThreshold) {
      return;
    }
    let reason = ReportReasons.userWarn;
    if (totalReacts >= config.deletionThreshold) {
      reason = ReportReasons.userDelete;
    }

    const staffReactionCount = usersWhoReacted.filter(isStaff).length;
    const [members, staff] = partition(isStaff, usersWhoReacted);
    const meetsDeletion = staffReactionCount >= config.deletionThreshold;

    if (meetsDeletion) {
      message.delete();
    }

    reportUser({ reason, message, staff, members });
  },
};

const emojiMod: ChannelHandlers = {
  handleReaction: async ({ reaction, user, bot }) => {
    const { message } = reaction;
    const { guild } = message;

    if (!guild) {
      return;
    }

    let emoji = reaction.emoji.toString();

    if (thumbsDownEmojis.includes(emoji)) {
      emoji = "👎";
    }

    if (!reactionHandlers[emoji]) {
      return;
    }

    const [fullReaction, fullMessage, reactor] = await Promise.all([
      reaction.partial ? reaction.fetch() : reaction,
      message.partial ? message.fetch() : message,
      guild.members.fetch(user.id),
    ]);
    const [usersWhoReacted, authorMember] = await Promise.all([
      fetchReactionMembers(guild, fullReaction),
      guild.members.fetch(fullMessage.author.id),
    ]);

    if (authorMember.id === bot.user?.id) return;

    if (authorMember.id === bot.user?.id) return;

    reactionHandlers[emoji]?.({
      guild,
      author: authorMember,
      reactor,
      message: fullMessage,
      reaction: fullReaction,
      usersWhoReacted: usersWhoReacted.filter((x): x is GuildMember =>
        Boolean(x),
      ),
    });
  },
};

export default emojiMod;
