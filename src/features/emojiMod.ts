import { MessageReaction, Message, GuildMember, Guild } from "discord.js";
import cooldown from "./cooldown";
import { ChannelHandlers } from "../types";
import { ReportReasons } from "../constants";
import { CHANNELS, getChannel } from "../constants/channels";
import { constructLog, reportUser } from "../helpers/modLog";
import { fetchReactionMembers, isStaff } from "../helpers/discord";
import { partition } from "../helpers/array";

const modLog = getChannel(CHANNELS.modLog);

const AUTO_SPAM_THRESHOLD = 5;
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
  "⚠️": async ({ author, reactor, message, reaction, usersWhoReacted }) => {
    // Skip if the post is from someone from the staff
    if (isStaff(author)) {
      return;
    }
    // If the user that reacted isn't in the staff, remove the reaction, send a
    if (!isStaff(reactor)) {
      reaction.users.remove(reactor.id);
      reactor.send(`Hey there! 👋
The ⚠️ reaction is reserved for staff usage as part of our moderation system.  If you would like to mark a message as needing moderator attention, you can use react with 👎 instead.
Thanks!
`);
      return;
    }

    const reactionCount = usersWhoReacted.length;
    const staff = usersWhoReacted
      .filter(isStaff)
      .map((member) => member?.user.username || "X");

    if (reactionCount < config.warningThreshold) {
      return;
    }

    reportUser(message, constructLog(ReportReasons.mod, [], staff, message));
  },
  "💩": async ({ guild, author, reactor, message, usersWhoReacted }) => {
    // Skip if the post is from someone from the staff or reactor is not staff
    if (isStaff(author) || !isStaff(reactor)) {
      return;
    }

    const [members, staff] = partition(isStaff, usersWhoReacted);

    message.delete();
    const warnings = reportUser(
      message,
      constructLog(
        ReportReasons.spam,
        members.map(({ user }) => user.username),
        staff.map(({ user }) => user.username),
        message,
      ),
    );

    if (warnings >= AUTO_SPAM_THRESHOLD) {
      guild.members.fetch(message.author.id).then((member) => {
        member.kick("Autokicked for spamming");
        modLog.send(`Automatically kicked <@${message.author.id}> for spam`);
      });
    }
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
    let trigger = ReportReasons.userWarn;
    if (totalReacts >= config.deletionThreshold) {
      trigger = ReportReasons.userDelete;
    }

    const staffReactionCount = usersWhoReacted.filter(isStaff).length;
    const [members, staff] = partition(isStaff, usersWhoReacted);
    const meetsDeletion = staffReactionCount >= config.deletionThreshold;

    if (meetsDeletion) {
      message.delete();
    }

    reportUser(
      message,
      constructLog(
        trigger,
        members.map(({ user }) => user.username),
        staff.map(({ user }) => user.username),
        message,
      ),
    );
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
