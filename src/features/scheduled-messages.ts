import type * as discord from "discord.js";
import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { guildId as defaultGuildId } from "../constants";
import { CHANNELS } from "../constants/channels";
import { logger } from "./log";
import { scheduleTask, SPECIFIED_TIMES } from "../helpers/schedule";

const HOURLY = 60 * 60 * 1000;
// By keeping these off 24 hr, we can make sure they show up at all timezones. If
// it were 24 hours, for instance, it would consistently show up in the middle of
// the night for some timezones.
const DAILY = 20 * HOURLY;
const FREQUENCY = {
  often: 9 * HOURLY,
  daily: DAILY,
  moreThanWeekly: 3 * DAILY,
  weekly: 6 * DAILY,
};

type MessageConfig = {
  postTo: {
    guildId?: discord.Snowflake;
    interval: number | SPECIFIED_TIMES;
    channelId: discord.Snowflake;
  }[];
  message:
    | discord.MessageOptions
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
      { interval: SPECIFIED_TIMES.midnight, channelId: CHANNELS.gaming },
    ],
    message: async (channel) => {
      const WORDLE_ON_MAR_31 = 285;
      const mar31 = new Date("2022-03-31");
      const midnight = parseISO(format(Date.now(), "yyyy-MM-dd"));
      const wordleCount =
        WORDLE_ON_MAR_31 + differenceInCalendarDays(midnight, mar31);

      // Send a message
      const message = await channel.send({
        content: `Daily wordle thread #${wordleCount}, ${format(
          midnight,
          "yyyy-MM-dd",
        )} https://www.nytimes.com/games/wordle/index.html`,
      });
      // Start a thread
      const thread = await message.startThread({
        name: `Wordle ${format(midnight, "yyyy-MM-dd")}`,
      });
      // Ping members
      thread.send("<@&954499699870666842>");
    },
  },
  {
    postTo: [{ interval: FREQUENCY.daily, channelId: CHANNELS.jobBoard }],
    message: {
      content: `Messages must start with [FORHIRE]/[HIRING]. Check the channel description for a full list of tags and rules!

* Job postings may only be posted every 7 days.
* Posts should be reasonably descriptive.
* Jobs are paid — unpaid, equity-only, or similar are not allowed.
* We don't allow "small gigs".

Moderators may remove posts at any time, with or without warning. Repeat violators of these rules will be removed from the server permanently.
`,
    },
  },
  {
    postTo: [{ interval: FREQUENCY.often, channelId: CHANNELS.helpJs }],
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

#help-js For questions about pure Javscript problems.
#help-styling For questions about CSS or other visual problems.
#help-backend For questions about issues with your server code.
#code-review Get deeper review of a snippet of code.
#jobs-advice If you have a question about your job or career, ask it in here.
#general-tech Discussion of non-JS code, or that new laptop you're deciding on.
#tooling for questions about building, linting, generating, or otherwise processing your code.

Looking for work? Trying to hire? Check out #job-board, or <https://reactiflux.com/jobs>

Has someone been really helpful? Shoutout who and what in #thanks! We keep an eye in there as one way to find new MVPs. Give us all the reactions in there too!

Please remember our Code of Conduct: <https://reactiflux.com/conduct>
and our guidelines for promotion: <https://reactiflux.com/promotion>

If you see anything that violates our rules, help alert the mods by reacting to it with 👎
`,
    },
  },
  {
    postTo: [{ interval: FREQUENCY.weekly, channelId: CHANNELS.random }],
    message: {
      content: `Have you read our Code of Conduct? <https://reactiflux.com/conduct>

Let us know if anything crosses a line: give it a 👎, or if you'd prefer to remain anonymous, let mods know with the form at <https://reactiflux.com/contact>`,
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
    if (!channel.isText()) {
      logger.log(
        "scheduled",
        `Failed to send a scheduled message: channel ${channelId} in guild ${guildId} is not a text channel.`,
      );
      return;
    }

    scheduleTask(interval, () => {
      if (typeof message === "function") {
        message(channel);
        return;
      }
      channel.send(message);
    });
  });
};
