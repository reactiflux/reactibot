/* eslint-disable @typescript-eslint/no-use-before-define */
import { CommandInteraction, GuildMember, Message } from "discord.js";
import cooldown from "./cooldown";
import { ChannelHandlers } from "../types";
import { isStaff } from "../helpers/discord";

export const EMBED_COLOR = 7506394;

type Categories = "Reactiflux" | "Communication" | "Web" | "React/Redux";

type Command = {
  words: string[];
  help: string;
  category: Categories;
  handleMessage: (msg: Message | CommandInteraction) => void;
  cooldown?: number;
};

const sortedCategories: Categories[] = [
  "Reactiflux",
  "Communication",
  "Web",
  "React/Redux",
];

async function isStaffMsg(msg: Message | CommandInteraction) {
  return Boolean(
    msg.guild &&
      msg.member &&
      isStaff(
        msg.member instanceof GuildMember
          ? msg.member
          : await msg.guild.members.fetch(msg.member.user.id),
      ),
  );
}

export const commandsList: Command[] = [
  {
    words: [`commands`],
    help: `lists all available commands`,
    category: "Reactiflux",
    handleMessage: (msg) => {
      const commandsMessage = createCommandsMessage();

      msg.reply({
        embeds: [
          {
            title: "Available Help Commands",
            type: "rich",
            description: commandsMessage,
            color: EMBED_COLOR,
          },
        ],
      });
    },
  },
  {
    words: [`rrlinks`],
    help: `shares a repository of helpful links regarding React and Redux`,
    category: "React/Redux",
    handleMessage: (msg) => {
      msg.channel?.send({
        embeds: [
          {
            title: "Helpful links",
            type: "rich",
            description: `Reactiflux's Mark Erikson has put together a curated list of useful React & Redux links for developers of all skill levels. Check out https://github.com/markerikson/react-redux-links`,
            color: EMBED_COLOR,
          },
        ],
      });
    },
  },
  {
    words: [`xy`],
    help: `explains the XY problem`,
    category: "Communication",
    handleMessage: (msg) => {
      msg.channel?.send({
        embeds: [
          {
            title: "The XY Issue",
            type: "rich",
            description: `You may be experiencing an XY problem: http://xyproblem.info/ .  Try to explain your end goal, instead of the error you got stuck on. Maybe there's a better way to approach the problem.`,
            color: EMBED_COLOR,
          },
        ],
      });
    },
  },
  {
    words: [`ymnnr`],
    help: `links to the You Might Not Need Redux article`,
    category: "React/Redux",
    handleMessage: (msg) => {
      msg.channel?.send({
        embeds: [
          {
            title: "You Might Not Need Redux",
            type: "rich",
            description: `People often choose Redux before they need it. “What if our app doesn’t scale without it?

https://medium.com/@dan_abramov/you-might-not-need-redux-be46360cf367`,
            color: EMBED_COLOR,
          },
        ],
      });
    },
  },
  {
    words: [`derived`],
    help: `Links to the React docs advice to avoid copying props to state`,
    category: "React/Redux",
    handleMessage: (msg) => {
      msg.channel?.send({
        embeds: [
          {
            title:
              "You might not need getDerivedStateFrom props or state at all!",
            type: "rich",
            description: `Copying data from React props to component state is usually not necessary, and should generally be avoided. The React team offered advice on when "derived state" may actually be needed:

https://reactjs.org/blog/2018/06/07/you-probably-dont-need-derived-state.html`,
            color: EMBED_COLOR,
          },
        ],
      });
    },
  },
  {
    words: [`su`, `stateupdates`],
    help: `Explains the implications involved with state updates being asynchronous`,
    category: "React/Redux",
    handleMessage: (msg) => {
      msg.channel?.send({
        embeds: [
          {
            title: "State Updates May Be Asynchronous",
            type: "rich",
            description: `Often times you run into an issue like this
\`\`\`js
const handleEvent = e => {
setState(e.target.value);
console.log(state);
}
\`\`\`
where \`state\` is not the most up to date value when you log it. This is caused by state updates being asynchronous.

Check out these resources for more information:
https://gist.github.com/bpas247/e177a772b293025e5324219d231cf32c
https://reactjs.org/docs/state-and-lifecycle.html#state-updates-may-be-asynchronous
https://blog.isquaredsoftware.com/2020/05/blogged-answers-a-mostly-complete-guide-to-react-rendering-behavior/#render-batching-and-timing`,
            color: EMBED_COLOR,
          },
        ],
      });
    },
  },
  {
    words: [`bind`],
    help: `explains how and why to bind in React applications`,
    category: "React/Redux",
    handleMessage: (msg) => {
      msg.channel?.send({
        embeds: [
          {
            title: "Binding functions",
            type: "rich",
            description: `In JavaScript, a class function will not be bound to the instance of the class, this is why you often see messages saying that you can't access something of undefined.

In order to fix this, you need to bind your function, either in constructor:

\`\`\`js
class YourComponent extends React.Component {
constructor(props) {
  super(props);
  this.handleClick = this.handleClick.bind(this);
}

handleClick() {
  // you can access \`this\` here, because we've
  // bound the function in constructor
}
}
\`\`\`

or by using class properties babel plugin (it works in create-react-app by default!)

\`\`\`js
class YourComponent extends React.Component {
handleClick = () => {
  // you can access \`this\` here just fine
}
}
\`\`\`

Check out https://reactkungfu.com/2015/07/why-and-how-to-bind-methods-in-your-react-component-classes/ for more informations`,
            color: EMBED_COLOR,
          },
        ],
      });
    },
  },
  {
    words: [`lift`],
    help: `links to the React docs regarding the common need to "lift" state`,
    category: "React/Redux",
    handleMessage: (msg) => {
      msg.channel?.send({
        embeds: [
          {
            title: "Lifting State Up",
            type: "rich",
            description: `Often, several components need to reflect the same changing data. We recommend lifting the shared state up to their closest common ancestor. Let’s see how this works in action.

https://reactjs.org/docs/lifting-state-up.html`,
            color: EMBED_COLOR,
          },
        ],
      });
    },
  },

  {
    words: [`ask`],
    help: `explains how to ask questions`,
    category: "Reactiflux",
    handleMessage: (msg) => {
      msg.channel?.send({
        embeds: [
          {
            title: "Asking to ask",
            type: "rich",
            description: `Instead of asking to ask, ask your question instead. People can help you better if they know your question.

Bad: "hey can anyone help me?"
Bad: "anyone good with redux?"
Good:
> I'm trying to fire a redux action from my component, but it's not getting to the reducer.
> \`\`\`js
> // snippet of code
> \`\`\`
> I'm seeing an error, but I don't know if it's related.
> \`Uncaught TypeError: undefined is not a function\`

How to ask for programming help: http://wp.me/p2oIwo-26
How do I ask a good question https://stackoverflow.com/help/how-to-ask
How To Ask Questions The Smart Way https://git.io/JKscV
`,
            color: EMBED_COLOR,
          },
        ],
      });
    },
  },
  {
    words: [`code`, `gist`],
    help: `explains how to attach code`,
    category: "Reactiflux",
    handleMessage: (msg) => {
      msg.channel?.send({
        embeds: [
          {
            title: "Attaching Code",
            type: "rich",
            description: `\\\`\\\`\\\`js
// short code snippets go here
\\\`\\\`\\\`

Link a Gist to upload entire files: https://gist.github.com
Link a Code Sandbox to share runnable examples: https://codesandbox.io/s
Link a Code Sandbox to an existing GitHub repo: https://codesandbox.io/s/github/<username>/<reponame>
Link a TypeScript Playground to share types: https://www.typescriptlang.org/play
Link a Snack to share React Native examples: https://snack.expo.io
`,
            color: EMBED_COLOR,
          },
        ],
      });
    },
  },
  {
    words: [`ping`],
    help: `explains how to ping politely`,
    category: "Reactiflux",
    handleMessage: (msg) => {
      msg.channel?.send({
        embeds: [
          {
            title: "Don’t ping or DM other devs you aren’t actively talking to",
            type: "rich",
            description: `It’s very tempting to try to get more attention to your question by @-mentioning one of the high profile(or recently active) members of Reactiflux, but please don’t. They may not actually be online, they may not be able to help, and they may be in a completely different timezone–nobody likes push notifications at 3am from an impatient stranger.

Similarly, don’t DM other members without asking first. All of the same problems as @-mentioning apply, and private conversations can’t help anyone else. Your questions are likely not unique, and other people can learn from them when they’re kept public.`,
            color: EMBED_COLOR,
          },
        ],
      });
    },
  },
  {
    words: [`inputs`],
    help: `provides links to uncontrolled vs controlled components`,
    category: "React/Redux",
    handleMessage: (msg) => {
      msg.channel?.send({
        embeds: [
          {
            title: "Uncontrolled vs Controlled components",
            type: "rich",
            description: `In React, inputs can either be uncontrolled (traditional input) or be controlled via state.
Here's an article explaining the difference between the two: https://goshakkk.name/controlled-vs-uncontrolled-inputs-react/
          `,
            color: EMBED_COLOR,
          },
        ],
      });
    },
  },
  // {
  //   words: [`move`],
  //   help: `allows you to move the conversation to another channel \n\t(usage: \`!move #toChannel @person1 @person2 @person3\`)`,
  //   category: "Reactiflux",
  //   handleMessage: (msg) => {
  //     const [, newChannel] = msg.content.split(" ");

  //     try {
  //       const targetChannel = msg.guild?.channels.cache.get(
  //         newChannel.replace("<#", "").replace(">", ""),
  //       ) as TextChannel;

  //       if (!msg.mentions.members) return;

  //       targetChannel.send(
  //         `${msg.author} has opened a portal from ${
  //           msg.channel
  //         } summoning ${msg.mentions.members.map((i) => i).join(" ")}`,
  //       );
  //     } catch (e) {
  //       console.log("Something went wrong when summoning a portal: ", e);
  //     }
  //   },
  // },
  // {
  //   words: [`mdn`],
  //   help: `allows you to search something on MDN, usage: !mdn Array.prototype.map`,
  //   category: "Web",
  //   handleMessage: async (msg) => {
  //     const [, ...args] = msg.content.split(" ");
  //     const query = args.join(" ");
  //     const [fetchMsg, res] = await Promise.all([
  //       msg.channel.send(`Fetching "${query}"...`),
  //       fetch(
  //         `https://developer.mozilla.org/api/v1/search/en-US?highlight=false&q=${query}`,
  //       ),
  //     ]);

  //     const { documents } = await res.json();
  //     const [topResult] = documents;

  //     if (!topResult) {
  //       fetchMsg.edit(`Could not find anything on MDN for '${query}'`);
  //       return;
  //     }

  //     const { title, excerpt: description, mdn_url: mdnUrl } = topResult;

  //     await msg.channel?.send({
  //       embeds: [
  //         {
  //           author: {
  //             name: "MDN",
  //             url: "https://developer.mozilla.org",
  //             icon_url:
  //               "https://developer.mozilla.org/static/img/opengraph-logo.72382e605ce3.png",
  //           },
  //           title,
  //           description,
  //           color: 0x83d0f2,
  //           url: `https://developer.mozilla.org${mdnUrl}`,
  //         },
  //       ],
  //     });

  //     fetchMsg.delete();
  //   },
  // },
  {
    words: [`appideas`],
    help: `provides a link to the best curated app ideas for beginners to advanced devs`,
    category: "Web",
    handleMessage: (msg) => {
      msg.channel?.send({
        embeds: [
          {
            title: "Florinpop17s Curated App Ideas!",
            type: "rich",
            description: `Sometimes it's tough finding inspiration, luckily this guy listed a bunch of stuff for you to pick from for your next project!  Well sorted progression to confidence in web dev.

          https://github.com/florinpop17/app-ideas
          `,
            color: EMBED_COLOR,
          },
        ],
      });
    },
  },
  {
    words: [`cors`],
    help: `provides a link to what CORS is and how to fix it`,
    category: "Web",
    handleMessage: (msg) => {
      msg.channel?.send({
        embeds: [
          {
            title: "Understanding CORS",
            type: "rich",
            description: `
          Cross-Origin Resource Sharing (CORS) is a mechanism that lets remote servers restrict which origin (i.e your website) can access it.

          Read more at:
          https://medium.com/@baphemot/understanding-cors-18ad6b478e2b
          https://auth0.com/blog/cors-tutorial-a-guide-to-cross-origin-resource-sharing/
          https://jakearchibald.com/2021/cors/
          `,
            color: EMBED_COLOR,
          },
        ],
      });
    },
  },
  {
    words: [`imm`, `immutability`],
    help: `provides resources for helping with immutability`,
    category: "React/Redux",
    handleMessage: (msg) => {
      msg.channel?.send({
        embeds: [
          {
            title: "Immutable updates",
            type: "rich",
            description: `Immutable updates involve modifying data by creating new, updated objects instead of modifying the original object directly.
          You should not modify existing data directly in React or Redux, as mutating data can lead to bugs.

          https://daveceddia.com/react-redux-immutability-guide/
          https://redux.js.org/recipes/structuring-reducers/immutable-update-patterns
          `,
            color: EMBED_COLOR,
          },
        ],
      });
    },
  },
  {
    words: [`redux`],
    help: `Info and when and why to use Redux`,
    category: "React/Redux",
    handleMessage: (msg) => {
      msg.channel?.send({
        embeds: [
          {
            title: "When should you use Redux?",
            type: "rich",
            description: `Redux is still the most widely used state management tool for React, but it's important to always ask "what problems am I trying to solve?", and choose tools that solve those problems.  Redux, Context, React Query, and Apollo all solve different problems, with some overlap.

          See these articles for advice on what Redux does and when it makes sense to use it:

          https://blog.isquaredsoftware.com/2018/03/redux-not-dead-yet/
          https://blog.isquaredsoftware.com/2021/01/context-redux-differences/
          https://changelog.com/posts/when-and-when-not-to-reach-for-redux
          https://blog.isquaredsoftware.com/2017/05/idiomatic-redux-tao-of-redux-part-1/
          `,
            color: EMBED_COLOR,
          },
        ],
      });
    },
  },
  {
    words: [`reduxvscontext`, "context"],
    help: `Differences between Redux and Context`,
    category: "React/Redux",
    handleMessage: (msg) => {
      msg.channel?.send({
        embeds: [
          {
            title: "What are the differences between Redux and Context?",
            type: "rich",
            description: `Redux and Context are different tools that solve different problems, with some overlap.

          Context is a Dependency Injection tool for a single value.

          Redux is a tool for predictable state management outside React.

          See these articles for more details on the differences:

          https://blog.isquaredsoftware.com/2018/03/redux-not-dead-yet/
          https://blog.isquaredsoftware.com/2021/01/context-redux-differences/
          https://changelog.com/posts/when-and-when-not-to-reach-for-redux
          https://blog.isquaredsoftware.com/2020/01/blogged-answers-react-redux-and-context-behavior/
          `,
            color: EMBED_COLOR,
          },
        ],
      });
    },
  },
  {
    words: [`render`],
    help: `Explanation of how React rendering behavior works`,
    category: "React/Redux",
    handleMessage: (msg) => {
      msg.channel?.send({
        embeds: [
          {
            title: "How does React rendering behavior work?",
            type: "rich",
            description: `There are several common misunderstandings about how React renders components. It's important to know that:

          - React re-renders components recursively by default
          - State updates must be immutable
          - Updates are usually batched together
          - Context updates always cause components to re-render

          See this post for a detailed explanation of how React rendering actually works:

          https://blog.isquaredsoftware.com/2020/05/blogged-answers-a-mostly-complete-guide-to-react-rendering-behavior/
          `,
            color: EMBED_COLOR,
          },
        ],
      });
    },
  },
  {
    words: [`formatting`, `prettier`],
    help: `describes Prettier and explains how to use it to format code`,
    category: "Reactiflux",
    handleMessage: (msg) => {
      msg.channel?.send({
        embeds: [
          {
            title: "Formatting code with Prettier",
            type: "rich",
            description: `Inconsistent indentation and syntax can make it more difficult to understand code, create churn from style debates, and cause logic and syntax errors.

Prettier is a modern and well-supported formatter that completely reformats your code to be more readable and follow best practices.

To format some code without installing anything, use the playground: https://prettier.io/playground/
To enforce its style in your projects, use the CLI: https://prettier.io/docs/en/install.html
To integrate it into your editor: https://prettier.io/docs/en/editors.html`,
            color: EMBED_COLOR,
          },
        ],
      });
    },
  },
  {
    words: [`gender`],
    help: `reminds users to use gender-neutral language`,
    category: "Communication",
    handleMessage: (msg) => {
      msg.channel?.send({
        embeds: [
          {
            title: "Please use gender neutral language by default",
            type: "rich",
            description: `Unless someone has made their pronouns known, please use gender neutral language.

- Instead of "hey guys," try "hey folks", "hey all", or similar
- Use "they/them/theirs" if you aren't sure of someone's pronouns
- "thanks friend" instead of "thanks man"`,
            color: EMBED_COLOR,
          },
        ],
      });
    },
  },
  {
    words: [`reactts`],
    help: `Resources and tips for using React + TypeScript together`,
    category: "React/Redux",
    handleMessage: (msg) => {
      msg.channel?.send({
        embeds: [
          {
            title: "Resources for React + TypeScript",
            type: "rich",
            description: `The best resource for how to use TypeScript and React together is the React TypeScript CheatSheet. It has advice on how to type function components, hooks, event handlers, and much more:

          https://react-typescript-cheatsheet.netlify.app/

          Also, we advise against using the \`React.FC\` type for function components. Instead, declare the type of \`props\` directly, like:
          \`function MyComp(props: MyCompProps) {}\`:
          See this issue for details on why to avoid \`React.FC\`:

          https://github.com/facebook/create-react-app/pull/8177
          `,
            color: EMBED_COLOR,
          },
        ],
      });
    },
  },
  {
    words: [`hooks`, `learn`],
    help: `Resources for Learning React`,
    category: "React/Redux",
    handleMessage: (msg) => {
      msg.channel?.send({
        embeds: [
          {
            title: "Learning React",
            type: "rich",
            description: `
          The official (beta) React docs are the best resource for learning React:
          https://beta.reactjs.org

          The official (stable) React docs still teach classes for the examples, but the concepts are still valid:
          https://reactjs.org/docs/getting-started.html
          `,
          },
        ],
      });
    },
  },
  {
    words: [`nw`, `notworking`],
    help: `gives some tips on how to improve your chances at getting an answer`,
    category: "Communication",
    handleMessage: (msg) => {
      msg.channel?.send({
        embeds: [
          {
            title: "State your problem",
            type: "rich",
            description: `To improve your chances at getting help, it's important to describe the behavior you're seeing and how it differs from your expectations. Simply saying something "doesn't work" requires too many assumptions on the helper's part, and could lead both of you astray.

Instead:
- Tell us what you're trying to do.
- Show us what you did with code.
- Tell us what happened. Show us errors. Describe what unexpected behavior you're seeing.`,
            color: EMBED_COLOR,
          },
        ],
      });
    },
  },
  {
    words: ["lock"],
    help: "",
    category: "Communication",
    handleMessage: async (msg) => {
      if (!isStaffMsg(msg)) {
        return;
      }

      // permission overwrites can only be applied on Guild Text Channels
      if (msg.channel?.type === "GUILD_TEXT") {
        const { channel: guildTextChannel } = msg;
        await guildTextChannel.permissionOverwrites.create(
          guildTextChannel.guild.roles.everyone,
          {
            SEND_MESSAGES: false,
          },
        );
        guildTextChannel.send("This channel has been locked by a moderator");
      }
    },
  },
  {
    words: ["unlock"],
    help: "",
    category: "Communication",
    handleMessage: async (msg) => {
      if (!isStaffMsg(msg)) {
        return;
      }

      // permission overwrites can only be applied on Guild Text Channels
      if (msg.channel?.type === "GUILD_TEXT") {
        const { channel: guildTextChannel } = msg;
        guildTextChannel.permissionOverwrites.create(
          guildTextChannel.guild.roles.everyone,
          {
            SEND_MESSAGES: null, // null will inherit the permission from the parent channel category
          },
        );
      }
    },
  },
];

const createCommandsMessage = () => {
  const groupedMessages: { [key in Categories]: Command[] } = {
    Reactiflux: [],
    Communication: [],
    Web: [],
    "React/Redux": [],
  };

  // Omit any commands that are internal, like the `@here` warning
  const visibleCommands = commandsList.filter((command) => !!command.help);

  visibleCommands.forEach((command) => {
    groupedMessages[command.category].push(command);
  });

  const categoryDescriptions = sortedCategories.map((category) => {
    const commands = groupedMessages[category];
    // Mutating in map(), but whatever
    commands.sort((a, b) => {
      // Assume there's at least one trigger word per command
      return a.words[0].localeCompare(b.words[0]);
    });

    const boldTitle = `**${category}**`;
    const commandDescriptions = commands
      .map((command) => {
        const formattedWords = command.words.map((word) => `**\`!${word}\`**`);
        return `${formattedWords.join(", ")}: ${command.help}`;
      })
      .join("\n");

    const categoryDescription = `${boldTitle}\n${commandDescriptions}`;
    return categoryDescription;
  });

  return categoryDescriptions.join("\n\n").trim();
};

const commands: ChannelHandlers = {
  handleMessage: async ({ msg: maybeMessage }) => {
    if (!maybeMessage.guild && maybeMessage.channel.type !== "DM") {
      return;
    }
    const msg = maybeMessage.partial
      ? await maybeMessage.fetch()
      : maybeMessage;

    commandsList.forEach((command) => {
      const keyword = command.words.find((word) => {
        return msg.content.toLowerCase().includes(`!${word}`);
      });

      if (keyword) {
        if (cooldown.hasCooldown(msg.author.id, `commands.${keyword}`)) return;
        cooldown.addCooldown(
          msg.author.id,
          `commands.${keyword}`,
          command.cooldown,
        );
        command.handleMessage(msg);
      }
    });
  },
};

export default commands;
