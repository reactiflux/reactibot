import type * as discord from "discord.js";
import { CHANNELS } from "../constants";
import { logger } from "./log";
import { scheduleTask } from "../helpers/schedule";

const HOURLY = 60 * 60 * 1000;
// By keeping these off 24 hr, we can make sure they show up at all timezones. If
// it were */24, for instance, it would consistently show up in the middle of the
// night for some timezones.
const DAILY = 20 * HOURLY;
const FREQUENCY = {
  often: 9 * HOURLY,
  daily: DAILY,
  moreThanWeekly: 2 * DAILY,
  weekly: 6 * DAILY,
};

type MessageConfig = {
  postTo: {
    guildId?: discord.Snowflake;
    interval: number;
    channelId: discord.Snowflake;
  }[];
  message: discord.MessageOptions;
};
const MESSAGE_SCHEDULE: MessageConfig[] = [
  /*  Example:
  {
    interval: FREQUENCY.weekly
    // Find Discord channel IDs: https://support.discord.com/hc/en-us/articles/206346498-Where-can-I-find-my-User-Server-Message-ID-
    postTo: [
      {
        id: "102860784329052160",  // Reactiflux's server ID, optional
        channelIds: [ CHANNELS.helpReact ]  // Add channel IDs to constants first!
      }
    ],
    message: {
      embed: {
        title: "Example Message",
        description: "This message is posted every 0th and 30th minute of the hour"
      }
    }
  }
  */
  {
    postTo: [{ interval: FREQUENCY.daily, channelId: CHANNELS.jobBoard }],
    message: {
      content: `Messages must start with [FORHIRE] or [HIRING]. Lead with the location of the position and include LOCAL, REMOTE, INTERN, VISA, etc. and keep the message reasonably formatted & a reasonable length.

Please only post jobs once a week.

Jobs are paid. Unpaid jobs, one-off gigs, and equity-only positions may not be posted here.

Job postings here do not go through an approval process. Please be diligent and approach with caution — if it doesn't feel right, it probably isn't. Protect yourself.
`,
    },
  },
  {
    postTo: [{ interval: FREQUENCY.often, channelId: CHANNELS.helpJs }],
    message: {
      content: `This channel is good for specific questions about syntax, debugging a small (< ~50 lines of code) snippet of JS, without React involved. Question not getting answered? Maybe it's hard to answer, check out these resources for how to ask a good question:

How to ask for programming help http://wp.me/p2oIwo-26
How do I ask a good question https://stackoverflow.com/help/how-to-ask
`,
    },
  },
  {
    postTo: [{ interval: FREQUENCY.often, channelId: CHANNELS.helpReact }],
    message: {
      content: `This channel is good for specific questions about React, how React's features work, or debugging a small (< ~50 lines of code) snippet of JS that uses React. Question not getting answered? Maybe it's hard to answer, check out these resources for how to ask a good question:

How to ask for programming help http://wp.me/p2oIwo-26
How do I ask a good question https://stackoverflow.com/help/how-to-ask
`,
    },
  },
  {
    postTo: [
      { interval: FREQUENCY.moreThanWeekly, channelId: CHANNELS.helpReact },
    ],
    message: {
      content: `Check our the other channels too! This is our highest-traffic channel, which may mean your question gets missed as other discussions happen.

#help-js For questions about pure Javscript problems.
#help-styling For questions about CSS or other visual problems.
#help-backend For questions about issues with your server code.
#code-review Get deeper review of a snippet of code.
#jobs-advice If you have a question about your job or career, ask it in here.
#general-tech Discussion of non-JS code, or that new laptop you're deciding on.
#tooling for questions about building, linting, generating, or otherwise processing your code.

Looking for work? Trying to hire? Check out #job-board, or <https://www.reactiflux.com/jobs>

Has someone been really helpful? Shoutout who and what in #thanks! We keep an eye in there as one way to find new MVPs. Give us all the reactions in there too!

Please remember our Code of Conduct: <https://www.reactiflux.com/conduct>
and our guidelines for promotion: <https://www.reactiflux.com/promotion>

If you see anything that violates our rules, help alert the mods by reacting to it with 👎
`,
    },
  },
  {
    postTo: [
      { interval: FREQUENCY.moreThanWeekly, channelId: CHANNELS.random },
    ],
    message: {
      content: `Have you read our Code of Conduct? <https://www.reactiflux.com/conduct> Is that joke you want to make really in keeping with it? Don't make dad angry.

If something crosses a line, give it a 👎, or if you'd prefer to remain anonymous, let mods know with the form at <https://reactiflux.com/contact>`,
    },
  },
];

export const messages: MessageConfig[] = [];

export const scheduleMessages = (bot: discord.Client) => {
  MESSAGE_SCHEDULE.forEach((messageConfig) => sendMessage(bot, messageConfig));
};

const sendMessage = async (
  bot: discord.Client,
  messageConfig: MessageConfig,
) => {
  const { message, postTo } = messageConfig;
  postTo.forEach(
    async ({ guildId = "102860784329052160", channelId, interval }) => {
      // const guild = await bot.guilds.fetch(guildId);
      const channel = await bot.channels.fetch(channelId);

      if (channel === null) {
        logger.log(
          "scheduled",
          `Failed to send a scheduled message: channel ${channelId} does not exist in guild ${guildId}.`,
        );
        return;
      }
      if (!channel.isText()) {
        logger.log(
          "scheduled",
          `Failed to send a scheduled message: channel ${channelId} in guild ${guildId} is not a text channel.`,
        );
        return;
      }
      // scheduleTask(interval, () => {
      try {
        channel.send(message);
      } catch (e) {
        console.log("butts", e);
      }
      // });
    },
  );
};
