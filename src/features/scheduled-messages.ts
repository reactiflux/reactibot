import type * as discord from "discord.js";
import { guildId as defaultGuildId } from "../helpers/env.js";
import { CHANNELS } from "../constants/channels.js";
import { logger } from "./log.js";
import {
  FREQUENCY,
  scheduleTask,
  SPECIFIED_TIMES,
} from "../helpers/schedule.js";
import { ChannelType } from "discord.js";

type MessageConfig = {
  postTo: {
    guildId?: discord.Snowflake;
    interval: number | SPECIFIED_TIMES;
    channelId: discord.Snowflake;
  }[];
  message:
    | discord.MessageCreateOptions
    | ((channel: discord.TextBasedChannel) => void);
};
const MESSAGE_SCHEDULE: MessageConfig[] = [
  /*  Example:
  {
    // Find Discord channel IDs: https://support.discord.com/hc/en-us/articles/206346498-Where-can-I-find-my-User-Server-Message-ID-
    postTo: [
      {
        id: defaultGuildId, // Reactiflux's server ID, optional
        interval: FREQUENCY.weekly, // Frequency the bot should post by
        channelIds: [ CHANNELS.helpReact ]  // Add channel IDs to constants first!
      }
    ],
    message: {
      content: "A message to post, any type of message discord.js understands"
    }
  }
  */
  {
    postTo: [
      { interval: FREQUENCY.moreThanWeekly, channelId: CHANNELS.jobBoard },
    ],
    message: async (channel) => {
      if (channel.type !== ChannelType.GuildText) {
        return;
      }
      const msg = await channel.send({
        content: `Messages must start with [FORHIRE]/[HIRING]. Check the channel description for a full list of tags and rules!

* Posts should be reasonably descriptive.
* Jobs are paid — unpaid, equity-only, or similar are not allowed.
* We don't allow "small gigs," like pay-for-help or one-off work of only a few hours.

Moderators may remove posts at any time, with or without warning. Repeat violators of these rules will be removed from the server permanently, with or without warning. We have more information on our Promotion Guidelines: https://www.reactiflux.com/promotion#job-board. If you believe you have been removed in error, you can dispute at \`hello@reactiflux.com\`.

`,
        embeds: [
          {
            description: `📋 Quick poll ⤵ React if you've…

💼 gotten work by applying to a [hiring] post
👨‍💻 gotten work by posting [forhire]
🤷‍♀️ never gotten work from this channel, but post [forhire]
😔 never gotten work after applying to [hiring] posts`,
          },
        ],
      });
      await Promise.all([
        msg.react("💼"),
        msg.react("👨‍💻"),
        msg.react("🤷‍♀️"),
        msg.react("😔"),
      ]);
    },
  },
  {
    postTo: [
      { interval: FREQUENCY.moreThanWeekly, channelId: CHANNELS.helpJs },
    ],
    message: {
      content: `This channel is good for specific questions about syntax, debugging a small (< ~50 lines of code) snippet of JS, without React involved. Question not getting answered? Maybe it's hard to answer, check out these resources for how to ask a good question:

How to ask for programming help <http://wp.me/p2oIwo-26>
How do I ask a good question <https://stackoverflow.com/help/how-to-ask>
`,
    },
  },
  {
    postTo: [{ interval: FREQUENCY.often, channelId: CHANNELS.helpReact }],
    message: {
      content: `This channel is good for specific questions about React, how React's features work, or debugging a small (< ~50 lines of code) snippet of JS that uses React. Question not getting answered? Maybe it's hard to answer, check out these resources for how to ask a good question:

How to ask for programming help <http://wp.me/p2oIwo-26>
How do I ask a good question <https://stackoverflow.com/help/how-to-ask>
`,
    },
  },
  {
    postTo: [
      { interval: FREQUENCY.moreThanWeekly, channelId: CHANNELS.helpReact },
    ],
    message: {
      content: `Check our the other channels too! This is our highest-traffic channel, which may mean your question gets missed as other discussions happen.

<#565213527673929729> For questions about pure Javscript problems.
<#105765765117935616> For questions about CSS or other visual problems.
<#145170347921113088> For questions about issues with your server code.
<#105765859191975936> Get deeper review of a snippet of code.
<#287623405946011648> If you have a question about your job or career, ask it in here.
<#547620660482932737> Discussion of non-JS code, or that new laptop you're deciding on.
<#108428584783220736> for questions about building, linting, generating, or otherwise processing your code.

Looking for work? Trying to hire? Check out <#103882387330457600>, or <https://reactiflux.com/jobs>

Has someone been really helpful? Shoutout who and what in <#798567961468076072>! We keep an eye in there as one way to find new MVPs. Give us all the reactions in there too!

Please remember our Code of Conduct: <https://reactiflux.com/conduct>
and our guidelines for promotion: <https://reactiflux.com/promotion>

If you see anything that violates our rules, help alert the mods by reacting to it with 👎 or reporting it anonymously (right click > Apps > report message).
`,
    },
  },
  {
    postTo: [{ interval: FREQUENCY.weekly, channelId: CHANNELS.random }],
    message: {
      content: `Have you read our Code of Conduct? <https://reactiflux.com/conduct>

Let us know if anything crosses a line: give it a 👎, or if you'd prefer to remain anonymous, let mods know from the message context menu (right click > Apps > report message) or with the form at <https://reactiflux.com/contact>`,
    },
  },
];

export const messages: MessageConfig[] = [];

export const scheduleMessages = (bot: discord.Client) => {
  bot.on("ready", () => {
    MESSAGE_SCHEDULE.forEach((messageConfig) =>
      sendMessage(bot, messageConfig),
    );
  });
};

const sendMessage = async (
  bot: discord.Client,
  messageConfig: MessageConfig,
) => {
  const { message, postTo } = messageConfig;
  postTo.forEach(async ({ guildId = defaultGuildId, channelId, interval }) => {
    const channel = await bot.channels.fetch(channelId);

    if (channel === null) {
      logger.log(
        "scheduled",
        `Failed to send a scheduled message: channel ${channelId} does not exist in guild ${guildId}.`,
      );
      return;
    }
    if (channel.type !== ChannelType.GuildText) {
      logger.log(
        "scheduled",
        `Failed to send a scheduled message: channel ${channelId} in guild ${guildId} is not a text channel.`,
      );
      return;
    }

    scheduleTask("scheduled message", interval, () => {
      if (typeof message === "function") {
        message(channel);
        return;
      }
      channel.send({
        ...message,
        allowedMentions: { users: [], roles: [] },
      });
    });
  });
};
