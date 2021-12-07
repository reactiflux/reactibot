import type * as discord from "discord.js";
import cron from "node-cron";
import { logger } from "./log";

// By keeping these at odd divisions, we can make sure they show up at all timezones. If it were */24, for instance, it would consistently show up in the middle of the night for some timezones.
const enum FREQUENCY {
  "often" = "0 */10 * * *",
  "daily" = "0 14 * * *",
  "moreThanWeekly" = "0 14 * * 0,2,5",
  "weekly" = "0 14 * * 3",
}

type MessageConfig = {
  cronExpression: string;
  postTo: { guildId?: discord.Snowflake; channelId: discord.Snowflake }[];
  message: discord.MessageOptions;
};
export const MESSAGE_SCHEDULE: MessageConfig[] = [
  /*  Example:
  {
    cronExpression: "0,30 * * * *",  // https://crontab.guru/#0,30_*_*_*_*
    postTo: [
      {
        // getting these IDs: https://support.discord.com/hc/en-us/articles/206346498-Where-can-I-find-my-User-Server-Message-ID-
        id: "102860784329052160",  // Reactiflux's server ID, optional
        channelIds: ["103696749012467712"]  // #help-react
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
    cronExpression: FREQUENCY.daily,
    postTo: [{ channelId: CHANNELS.jobBoard }],
    message: {
      content: `Messages must start with [FORHIRE] or [HIRING]. Lead with the location of the position and include LOCAL, REMOTE, INTERN, VISA, etc. and keep the message reasonably formatted & a reasonable length.

Please only post jobs once a week.

Jobs are paid. Unpaid jobs, one-off gigs, and equity-only positions may not be posted here.

Job postings here do not go through an approval process. Please be diligent and approach with caution — if it doesn't feel right, it probably isn't. Protect yourself.
`,
    },
  },
  {
    cronExpression: FREQUENCY.often,
    postTo: [{ channelId: CHANNELS.helpJs }],
    message: {
      content: `This channel is good for specific questions about syntax, debugging a small (< ~50 lines of code) snippet of JS, without React involved. Question not getting answered? Maybe it's hard to answer, check out these resources for how to ask a good question:

How to ask for programming help http://wp.me/p2oIwo-26
How do I ask a good question https://stackoverflow.com/help/how-to-ask
`,
    },
  },
  {
    cronExpression: FREQUENCY.often,
    postTo: [{ channelId: CHANNELS.helpReact }],
    message: {
      content: `This channel is good for specific questions about React, how React's features work, or debugging a small (< ~50 lines of code) snippet of JS that uses React. Question not getting answered? Maybe it's hard to answer, check out these resources for how to ask a good question:

How to ask for programming help http://wp.me/p2oIwo-26
How do I ask a good question https://stackoverflow.com/help/how-to-ask
`,
    },
  },
  {
    cronExpression: FREQUENCY.moreThanWeekly,
    postTo: [{ channelId: CHANNELS.helpReact }],
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
    cronExpression: FREQUENCY.moreThanWeekly,
    postTo: [{ channelId: CHANNELS.random }],
    message: {
      content: `Have you read our Code of Conduct? <https://www.reactiflux.com/conduct> Is that joke you want to make really in keeping with it? Don't make dad angry.

If something crosses a line, give it a 👎, or if you'd prefer to remain anonymous, let mods know with the form at <https://reactiflux.com/contact>`,
    },
  },
];

export const messages: MessageConfig[] = [];

export const scheduleMessages = (
  bot: discord.Client,
  messageConfigs: MessageConfig[],
) => {
  const scheduledTasks = messageConfigs.map((messageConfig) =>
    scheduleMessage(bot, messageConfig),
  );
  return scheduledTasks;
};

export const scheduleMessage = (
  bot: discord.Client,
  messageConfig: MessageConfig,
) => {
  return cron.schedule(messageConfig.cronExpression, () =>
    sendMessage(bot, messageConfig),
  );
};

const sendMessage = async (
  bot: discord.Client,
  messageConfig: MessageConfig,
) => {
  messageConfig.postTo.forEach(
    async ({ guildId = "102860784329052160", channelId }) => {
      const guild = await bot.guilds.fetch(guildId);

      const channel = guild.channels.resolve(channelId);

      if (channel === null) {
        logger.log(
          "scheduled",
          `Failed to send a scheduled message: channel ${channelId} does not exist in guild ${guildId}.`,
        );
        return;
      }
      if (!isTextChannel(channel)) {
        logger.log(
          "scheduled",
          `Failed to send a scheduled message: channel ${channelId} in guild ${guildId} is not a text channel.`,
        );
        return;
      }
      channel.send(messageConfig.message);
    },
  );
};

const isTextChannel = (
  channel: discord.Channel,
): channel is discord.TextChannel | discord.DMChannel | discord.NewsChannel => {
  return (
    channel.type === "text" ||
    channel.type === "news" ||
    channel.type === "store"
  );
};
