import { GuildMember, MessageReaction, TextChannel, User } from "discord.js";
import { ChannelHandlers } from "../../types";
import { sleep } from "../../helpers/misc";

const RECENT_CHATTERS = new Set<string>();

let timedOutUserId: string | null = null;
let isProcessingPlea = false;
let isWorthy = true;
let dissenter: GuildMember | null = null;
let conformer: GuildMember | null = null;

const TIMEOUT_DURATION_MINS = 10;
const VOTING_DURATION_MINS = 2;
const NUM_RECENT_CHATTERS_TO_TRIGGER_CHAOS = 10;

const getRandomReactorId = (
  reactions: MessageReaction,
  botId: string,
): User | null => {
  const users = reactions.users.cache;
  const usersArray = Array.from(users.values());
  const randomUser = usersArray[Math.floor(Math.random() * usersArray.length)];

  if (usersArray.length === 1 && randomUser.id === botId) {
    return null;
  }

  while (randomUser.id === botId) {
    console.log("Trying to get a random user again");
    return getRandomReactorId(reactions, botId);
  }

  return randomUser;
};

/**
 * This feature allows the community to vote on whether a user should be timed out.
 * If the user gets timed out, they have to write a pleading message in a certain channel and the AI gods have to deem them worthy enough to be untimedout.
 * If they are deemed worthy, it randomly times one of the community voters out for an hour and they can't plead.
 */
export default {
  handleMessage: async ({ msg: maybeMessage, bot }) => {
    const msg = maybeMessage.partial
      ? await maybeMessage.fetch()
      : maybeMessage;

    if (msg.author.bot) {
      return;
    }

    if (timedOutUserId === msg.author.id) {
      if (isProcessingPlea || !isWorthy) {
        await msg.delete();
        return;
      }

      isProcessingPlea = true;
      await msg.reply("Let's see if the AI gods deem you worthy....");
      await sleep(3 + Math.floor(Math.random() * 7));
      isProcessingPlea = false;
      isWorthy = Math.random() > 0.5;

      if (isWorthy) {
        await msg.reply(
          "The AI gods have deemed you worthy. You are free to go.",
        );
        timedOutUserId = null;

        if (conformer) {
          try {
            await conformer.timeout(TIMEOUT_DURATION_MINS * 60 * 1000);
          } catch (error) {
            console.error(error);
          }
          const channel = msg.channel as TextChannel;
          await channel.send(`Chaos reigns upon <@${conformer.id}> instead.`);
        }
        return;
      }

      await msg.reply(
        "The AI gods have deemed you unworthy. You will remain timed out.",
      );

      sleep(TIMEOUT_DURATION_MINS * 60).then(() => {
        // If the person is still timed out, remove the timeout
        // Otherwise, somebody else has been timed out so we just let it go
        if (timedOutUserId === msg.author.id) {
          timedOutUserId = null;
        }
      });

      return;
    }

    RECENT_CHATTERS.add(msg.author.id);

    if (RECENT_CHATTERS.size >= NUM_RECENT_CHATTERS_TO_TRIGGER_CHAOS) {
      // Get a random user from recent chatters
      const userIds = Array.from(RECENT_CHATTERS);
      const randomUser = userIds[Math.floor(Math.random() * userIds.length)];
      const user = await msg.client.users.fetch(randomUser);
      if (!user) return;

      const channel = msg.channel as TextChannel;
      const message = await channel.send(
        `Chaos is here. React with 👍 to time out <@${user.id}> or 👎 to let them live.`,
      );

      const filter = (reaction: MessageReaction, user: User) =>
        user.id !== message.author.id && user.id !== bot.user?.id;

      const collector = message.createReactionCollector({
        filter,
        time: 1000 * 60 * VOTING_DURATION_MINS,
      });

      await message.react("👍");
      await message.react("👎");

      collector.on("end", async () => {
        const yesReactions = message.reactions.cache.find(
          (reaction) => reaction.emoji.name === "👍",
        );
        const noReactions = message.reactions.cache.find(
          (reaction) => reaction.emoji.name === "👎",
        );

        if (!yesReactions || !noReactions) {
          return;
        }

        const randomConformerId = bot?.user?.id
          ? getRandomReactorId(yesReactions, bot.user.id)
          : null;
        conformer = randomConformerId
          ? await message.guild?.members.fetch(randomConformerId)
          : null;

        const randomDissenterId = bot?.user?.id
          ? getRandomReactorId(noReactions, bot.user.id)
          : null;
        dissenter = randomDissenterId
          ? await message.guild?.members.fetch(randomDissenterId)
          : null;

        if (
          yesReactions?.count &&
          yesReactions.count > (noReactions?.count ?? 0)
        ) {
          await channel.send(
            `The community has spoken. <@${user.id}> has been timed out. <@${user.id}>, your next message is your one attempt to plead your case. If the AI gods deem you worthy, you will be spared and chaos will reign on somebody else.`,
          );

          timedOutUserId = user.id;
        } else {
          await channel.send(
            `The community has spared <@${user.id}>. Do not let this happen again.`,
          );

          if (dissenter) {
            await dissenter.timeout(TIMEOUT_DURATION_MINS * 60 * 1000);
            await channel.send(`Chaos reigns upon <@${dissenter.id}> instead.`);
          }
        }
      });

      RECENT_CHATTERS.clear();
    }
  },
} as ChannelHandlers;
