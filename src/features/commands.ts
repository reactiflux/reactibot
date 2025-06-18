/* eslint-disable @typescript-eslint/no-use-before-define */
import fetch from "node-fetch";
import {
  APIEmbed,
  ChannelType,
  EmbedType,
  Message,
  TextChannel,
} from "discord.js";
import cooldown from "./cooldown.js";
import type { ChannelHandlers } from "../types/index.d.ts";
import { isStaff } from "../helpers/discord.js";
import {
  extractSearchKey,
  getReactDocsContent,
  getReactDocsSearchKey,
} from "../helpers/react-docs.js";
import dedent from "dedent";

export const EMBED_COLOR = 7506394;

type Categories = "Reactiflux" | "Communication" | "Web" | "React/Redux";

type Command = {
  words: string[];
  help: string;
  category: Categories;
  handleMessage: (msg: Message) => void;
  cooldown?: number;
};

const sortedCategories: Categories[] = [
  "Reactiflux",
  "Communication",
  "Web",
  "React/Redux",
];

const commandsList: Command[] = [
  {
    words: [`!commands`],
    help: `lists all available commands`,
    category: "Reactiflux",
    handleMessage: (msg) => {
      const commandsMessage = createCommandsMessage();

      msg.reply({
        embeds: [
          {
            title: "Available Help Commands",
            type: EmbedType.Rich,
            description: commandsMessage,
            color: EMBED_COLOR,
          },
        ],
      });
    },
  },
  {
    words: [`!conduct`],
    help: `informs user's of code of conduct`,
    category: "Reactiflux",
    handleMessage: (msg) => {
      msg.reply({
        embeds: [
          {
            title: "Code of Conduct",
            type: EmbedType.Rich,
            description: `Reactiflux is the largest chat community of React developers. We make a deliberate effort to have a light touch when it comes to moderating, but we do have some expectations of how our members will behave. Please read the [full Reactiflux Code of Conduct](https://www.reactiflux.com/conduct)`,
            color: EMBED_COLOR,
          },
        ],
      });
    },
  },
  {
    words: [`!contribution`],
    help: `informs user's of contributing to React codebase`,
    category: "Communication",
    handleMessage: (msg) => {
      msg.reply({
        embeds: [
          {
            title: "Contributing to React",
            type: EmbedType.Rich,
            description: `
            React is a very large and complex project. It has a steep learning curve, involves a lot of internal tooling and architecture, and often requires deep context to make meaningful contributions.
If you’re looking to gain experience in open source, we recommend starting with projects that are more beginner-friendly but still widely used and respected in the React ecosystem. Great alternatives include:
            `,
            fields: [
              {
                name: "Open Source Alternatives",
                value: `
- [TanStack](https://github.com/tanstack)
- [Preact](https://github.com/preactjs/preact)
- [Remix](https://github.com/remix-run/remix)
- [SolidJS](https://github.com/solidjs/solid)
- [React Hook Form](https://github.com/react-hook-form/react-hook-form)
- [freeCodeCamp](https://github.com/freeCodeCamp/freeCodeCamp)
- [Daily.dev](https://github.com/dailydotdev/daily)
                                `,
                inline: true,
              },
            ],
          },
        ],
      });
    },
  },
  {
    words: [`!crosspost`],
    help: `provides a no cross-post message`,
    category: "Communication",
    handleMessage: (msg) => {
      msg.channel.send({
        embeds: [
          {
            title: "Please Avoid Cross-Posting",
            type: EmbedType.Rich,
            description:
              "Just a friendly reminder: please avoid posting the same message in multiple channels. Choose the channel that best fits your question and allow some time for a response. If you don’t hear back after a while, feel free to bump your message.",
            color: EMBED_COLOR,
          },
        ],
      });
    },
  },
  {
    words: [`!promotion`],
    help: `informs user's of self-promotion guidelines`,
    category: "Reactiflux",
    handleMessage: (msg) => {
      msg.reply({
        embeds: [
          {
            title: "Self Promotion",
            type: EmbedType.Rich,
            description: `Reactiflux is a peer group, not an advertising channel or a free audience. Please review [our guidelines around self-promotion](https://www.reactiflux.com/promotion)`,
            color: EMBED_COLOR,
          },
        ],
      });
    },
  },
  {
    words: [`!rrlinks`],
    help: `shares a repository of helpful links regarding React and Redux`,
    category: "React/Redux",
    handleMessage: (msg) => {
      msg.channel.send({
        embeds: [
          {
            title: "Helpful links",
            type: EmbedType.Rich,
            description: `Reactiflux's Mark Erikson has put together [a curated list of useful React & Redux links](https://github.com/markerikson/react-redux-links) for developers of all skill levels.`,
            color: EMBED_COLOR,
          },
        ],
      });
    },
  },
  {
    words: [`!xy`],
    help: `explains the XY problem`,
    category: "Communication",
    handleMessage: (msg) => {
      msg.channel.send({
        embeds: [
          {
            title: "The XY Issue",
            type: EmbedType.Rich,
            description: `You may be experiencing an [XY problem](http://xyproblem.info/). Try to explain your end goal, instead of the error you got stuck on. Maybe there's a better way to approach the problem.`,
            color: EMBED_COLOR,
          },
        ],
      });
    },
  },
  {
    words: [`!ymnnr`],
    help: `links to the You Might Not Need Redux article`,
    category: "React/Redux",
    handleMessage: (msg) => {
      msg.channel.send({
        embeds: [
          {
            title: "You Might Not Need Redux",
            type: EmbedType.Rich,
            description: `People often choose Redux before they need it. “What if our app doesn’t scale without it?"

Read more about this in the [article "You Might Not Need Redux" by Dan Abramov](https://medium.com/@dan_abramov/you-might-not-need-redux-be46360cf367)`,
            color: EMBED_COLOR,
          },
        ],
      });
    },
  },
  {
    words: [`!derived`],
    help: `Links to the React docs advice to avoid copying props to state`,
    category: "React/Redux",
    handleMessage: (msg) => {
      msg.channel.send({
        embeds: [
          {
            title:
              "You might not need getDerivedStateFrom props or state at all!",
            type: EmbedType.Rich,
            description: `Copying data from React props to component state is usually not necessary, and should generally be avoided. The React team offered advice on when "derived state" may actually be needed in their [article "You Probably Don't Need Derived State"](https://legacy.reactjs.org/blog/2018/06/07/you-probably-dont-need-derived-state.html)`,
            color: EMBED_COLOR,
          },
        ],
      });
    },
  },
  {
    words: [`!su`, `!stateupdates`],
    help: `Explains the implications involved with state updates being asynchronous`,
    category: "React/Redux",
    handleMessage: (msg) => {
      msg.channel.send({
        embeds: [
          {
            title: "State Updates May Be Asynchronous",
            type: EmbedType.Rich,
            description: `Often times you run into an issue like this
\`\`\`js
const handleEvent = e => {
setState(e.target.value);
console.log(state);
}
\`\`\`
where \`state\` is not the most up to date value when you log it. This is caused by state updates being asynchronous.

Check out these resources for more information:
- [React.dev: Queueing a Series of State Updates](https://react.dev/learn/queueing-a-series-of-state-updates)
- [ReactJS.org: State Updates May Be Asynchronous](https://legacy.reactjs.org/docs/state-and-lifecycle.html#state-updates-may-be-asynchronous)
- [Blogged Answers: Render Batching and Timing](https://blog.isquaredsoftware.com/2020/05/blogged-answers-a-mostly-complete-guide-to-react-rendering-behavior/#render-batching-and-timing)`,
            color: EMBED_COLOR,
          },
        ],
      });
    },
  },
  {
    words: [`!bind`],
    help: `explains how and why to bind in React applications`,
    category: "React/Redux",
    handleMessage: (msg) => {
      msg.channel.send({
        embeds: [
          {
            title: "Binding functions",
            type: EmbedType.Rich,
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

Check out [this article on "Why and how to bind methods in your React component classes?"](https://reactkungfu.com/2015/07/why-and-how-to-bind-methods-in-your-react-component-classes/) for more information.`,
            color: EMBED_COLOR,
          },
        ],
      });
    },
  },
  {
    words: [`!lift`],
    help: `links to the React docs regarding the common need to "lift" state`,
    category: "React/Redux",
    handleMessage: (msg) => {
      msg.channel.send({
        embeds: [
          {
            title: "Lifting State Up",
            type: EmbedType.Rich,
            description: `Often, several components need to reflect the same changing data. We recommend lifting the shared state up to their closest common ancestor.

Learn more about lifting state in the [React.dev article about "Sharing State Between Components"](https://react.dev/learn/sharing-state-between-components).`,
            color: EMBED_COLOR,
          },
        ],
      });
    },
  },

  {
    words: [`!ask`],
    help: `explains how to ask questions`,
    category: "Reactiflux",
    handleMessage: (msg) => {
      msg.channel.send({
        embeds: [
          {
            title: "Asking to ask",
            type: EmbedType.Rich,
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

Have a look at these resources on how to ask good questions:
- [Coding Killed the Cat: "How to Ask for Programming Help"](http://wp.me/p2oIwo-26)
- [Stack Overflow: "How do I ask a good question?"](https://stackoverflow.com/help/how-to-ask)
- [Eric S. Raymond; "How To Ask Questions The Smart Way"](https://git.io/JKscV)
`,
            color: EMBED_COLOR,
          },
        ],
      });
    },
  },
  {
    words: [`!code`, `!gist`],
    help: `explains how to attach code`,
    category: "Reactiflux",
    handleMessage: (msg) => {
      msg.channel.send({
        embeds: [
          {
            title: "Attaching Code",
            image: {
              url: "https://media1.tenor.com/images/a23c33a91cb8d026b83488f1673495fd/tenor.gif?itemid=27632534",
            },
            type: EmbedType.Rich,
            description: `
Please don't post code in screenshots or post unformatted code. Instead, use one of these preferred methods to share code:

\\\`\\\`\\\`js
// short code snippets go here
\\\`\\\`\\\`

Please look at the gif attached below
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
    words: [`!ping`],
    help: `explains how to ping politely`,
    category: "Reactiflux",
    handleMessage: (msg) => {
      msg.channel.send({
        embeds: [
          {
            title: "Don’t ping or DM other devs you aren’t actively talking to",
            type: EmbedType.Rich,
            description: `It’s very tempting to try to get more attention to your question by @-mentioning one of the high profile(or recently active) members of Reactiflux, but please don’t. They may not actually be online, they may not be able to help, and they may be in a completely different timezone–nobody likes push notifications at 3am from an impatient stranger.

Similarly, don’t DM other members without asking first. All of the same problems as @-mentioning apply, and private conversations can’t help anyone else. Your questions are likely not unique, and other people can learn from them when they’re kept public.`,
            color: EMBED_COLOR,
          },
        ],
      });
    },
  },
  {
    words: [`!inputs`],
    help: `provides links to uncontrolled vs controlled components`,
    category: "React/Redux",
    handleMessage: (msg) => {
      msg.channel.send({
        embeds: [
          {
            title: "Uncontrolled vs Controlled components",
            type: EmbedType.Rich,
            description: `In React, inputs can either be uncontrolled (traditional input) or be controlled via state.
Here's an article explaining the difference between the two: https://goshakkk.name/controlled-vs-uncontrolled-inputs-react/
          `,
            color: EMBED_COLOR,
          },
        ],
      });
    },
  },
  {
    words: [`!move`],
    help: `allows you to move the conversation to another channel \n\t(usage: \`!move #toChannel @person1 @person2 @person3\`)`,
    category: "Reactiflux",
    handleMessage: (msg) => {
      const [, newChannel] = msg.content.split(" ");

      try {
        const targetChannel = msg.guild?.channels.cache.get(
          newChannel.replace("<#", "").replace(">", ""),
        ) as TextChannel;

        if (!msg.mentions.members) return;

        targetChannel.send(
          `${msg.author} has opened a portal from ${
            msg.channel
          } summoning ${msg.mentions.members.map((i) => i).join(" ")}`,
        );
      } catch (e) {
        console.log("Something went wrong when summoning a portal: ", e);
      }
    },
  },
  {
    words: [`!mdn`],
    help: `allows you to search something on MDN, usage: !mdn Array.prototype.map`,
    category: "Web",
    handleMessage: async (msg) => {
      const [, ...args] = msg.content.split(" ");
      const query = args.join(" ");
      const [fetchMsg, res] = await Promise.all([
        msg.channel.send(`Fetching "${query}"...`),
        fetch(
          `https://developer.mozilla.org/api/v1/search?highlight=false&locale=en-us&q=${query}`,
        ),
      ]);

      const { documents } = (await res.json()) as {
        documents: (
          | { title: string; excerpt: string; mdn_url: string }
          | undefined
        )[];
      };
      const [topResult] = documents;

      if (!topResult) {
        fetchMsg.edit(`Could not find anything on MDN for '${query}'`);
        return;
      }

      const { title, excerpt: description, mdn_url: mdnUrl } = topResult;

      await msg.channel.send({
        content: "-# also did you know there's `/mdn` too",
        embeds: [
          {
            author: {
              name: "MDN",
              url: "https://developer.mozilla.org",
              icon_url:
                "https://developer.mozilla.org/favicon-48x48.cbbd161b.png",
            },
            title,
            description,
            color: 0x83d0f2,
            url: `https://developer.mozilla.org${mdnUrl}`,
          },
        ],
      });

      fetchMsg.delete();
    },
  },
  {
    words: ["!react-docs", "!docs"],
    help: "Allows you to search the React docs, usage: !docs useState",
    category: "Web",
    handleMessage: async (msg) => {
      const search = extractSearchKey(msg.content);
      const searchKey = getReactDocsSearchKey(search);

      if (!searchKey) {
        msg.channel.send({
          embeds: generateReactDocsErrorEmbeds(search),
        });
        return;
      }

      const [fetchMsg, content] = await Promise.all([
        msg.channel.send(`Looking up documentation for **'${search}'**...`),
        getReactDocsContent(searchKey),
      ]);

      if (!content) {
        fetchMsg.edit({
          embeds: generateReactDocsErrorEmbeds(search),
        });
        return;
      }

      await msg.channel.send({
        embeds: [
          {
            title: `${searchKey}`,
            type: EmbedType.Rich,
            description: content,
            color: EMBED_COLOR,
            url: `https://react.dev/reference/${searchKey}`,
            author: {
              name: "React documentation",
              icon_url:
                "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/React-icon.svg/1150px-React-icon.svg.png",
              url: "https://react.dev/",
            },
          },
        ],
      });

      fetchMsg.delete();
    },
  },
  {
    words: [`!appideas`],
    help: `provides a link to the best curated app ideas for beginners to advanced devs`,
    category: "Web",
    handleMessage: (msg) => {
      msg.channel.send({
        embeds: [
          {
            title: "Florinpop17s Curated App Ideas!",
            type: EmbedType.Rich,
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
    words: [`!cors`],
    help: `provides a link to what CORS is and how to fix it`,
    category: "Web",
    handleMessage: (msg) => {
      msg.channel.send({
        embeds: [
          {
            title: "Understanding CORS",
            type: EmbedType.Rich,
            description: `Cross-Origin Resource Sharing (CORS) is a mechanism that lets remote servers restrict which origin (i.e your website) can access it.

Read more:
- [BTM's "Understanding CORS"](https://medium.com/@baphemot/understanding-cors-18ad6b478e2b)
- [A Guide to Cross-Origin Resource Sharing](https://auth0.com/blog/cors-tutorial-a-guide-to-cross-origin-resource-sharing/)
- [How to win at CORS](https://jakearchibald.com/2021/cors/)
          `,
            color: EMBED_COLOR,
          },
        ],
      });
    },
  },
  {
    words: [`!imm`, `!immutability`],
    help: `provides resources for helping with immutability`,
    category: "React/Redux",
    handleMessage: (msg) => {
      msg.channel.send({
        embeds: [
          {
            title: "Immutable updates",
            type: EmbedType.Rich,
            description: `Immutable updates involve modifying data by creating new, updated objects instead of modifying the original object directly.
You should not modify existing data directly in React or Redux, as mutating data can lead to bugs.

- [Immutability in React and Redux](https://daveceddia.com/react-redux-immutability-guide/)
- [React Docs: Updating Objects in State](https://react.dev/learn/updating-objects-in-state)
- [React Docs: Updating Arrays in State](https://react.dev/learn/updating-arrays-in-state)
- [Redux Toolkit, Immutability and Redux](https://redux-toolkit.js.org/usage/immer-reducers#immutability-and-redux)
          `,
            color: EMBED_COLOR,
          },
        ],
      });
    },
  },
  {
    words: [`!redux`],
    help: `Info and when and why to use Redux`,
    category: "React/Redux",
    handleMessage: (msg) => {
      msg.channel.send({
        embeds: [
          {
            title: "When should you use Redux?",
            type: EmbedType.Rich,
            description: `Redux is still the most widely used state management tool for React, but it's important to always ask "what problems am I trying to solve?", and choose tools that solve those problems.  Redux, Context, React Query, and Apollo all solve different problems, with some overlap.

See these articles for advice on what Redux does and when it makes sense to use it:

[Redux - Not Dead Yet! (2018)](https://blog.isquaredsoftware.com/2018/03/redux-not-dead-yet/)
[Why React Context is Not a "State Management" Tool](https://blog.isquaredsoftware.com/2021/01/context-redux-differences/)
[When (and when not) to reach for Redux](https://changelog.com/posts/when-and-when-not-to-reach-for-redux)
[Idiomatic Redux](https://blog.isquaredsoftware.com/2017/05/idiomatic-redux-tao-of-redux-part-1/)
          `,
            color: EMBED_COLOR,
          },
        ],
      });
    },
  },
  {
    words: ["!context"],
    help: `Differences between Redux and Context`,
    category: "React/Redux",
    handleMessage: (msg) => {
      msg.channel.send({
        embeds: [
          {
            title: "What are the differences between Redux and Context?",
            type: EmbedType.Rich,
            description: `Redux and Context are different tools that solve different problems, with some overlap.

Context is a Dependency Injection tool for a single value.

Redux is a tool for predictable state management outside React.

See these articles for more details on the differences:
- [Blogged Answers: Why React Context is Not a "State Management" Tool](https://blog.isquaredsoftware.com/2021/01/context-redux-differences/)
- [Blogged Answers: React, Redux, and Context Behavior](https://blog.isquaredsoftware.com/2020/01/blogged-answers-react-redux-and-context-behavior/)
- [Blogged Answers: Redux - Not Dead Yet!](https://blog.isquaredsoftware.com/2018/03/redux-not-dead-yet/)
- [When (and when not) to reach for Redux - Mark Erikson](https://changelog.com/posts/when-and-when-not-to-reach-for-redux)
          `,
            color: EMBED_COLOR,
          },
        ],
      });
    },
  },
  {
    words: [`!render`],
    help: `Explanation of how React rendering behavior works`,
    category: "React/Redux",
    handleMessage: (msg) => {
      msg.channel.send({
        embeds: [
          {
            title: "How does React rendering behavior work?",
            type: EmbedType.Rich,
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
    words: [`!jwt`],
    help: `Describes reasoning for and against the use of JWT tokens againt using standard sessions`,
    category: "Web",
    handleMessage: (msg) => {
      msg.channel.send({
        embeds: [
          {
            title:
              "Is JWT the right approach for my application's authentication?",
            type: EmbedType.Rich,
            description: `
Most of the time, JWTs aren't the best approach for working with backend authentication, despite the multitude of tutorials that use JWT. Sessions have been used for decades, with a lot of back end frameworks supporting them out of the box.

That said there are also scenarios when using a JWT token is the best approach:

- When using a third party auth service ( OpenID, Auth0, Firestore)
- Service to service calls
- Distributed architectures ( i.e Microservices)

See below to help you decide which works best for you:

- [JWT is a Bad Default - Evert Pot](https://evertpot.com/jwt-is-a-bad-default)
- [JWT are Dangerous for User Sessions - Raja Rao](https://redis.com/blog/json-web-tokens-jwt-are-dangerous-for-user-sessions)
- [Authentication Cheat Sheet - OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [Session Management Cheat Sheet - OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [JSON Web Token Cheat Sheet for Java - OWASP](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)
- [Gist - samsch](https://gist.github.com/samsch/a5c99b9faaac9f131967e8a6d61682b0)
            `,
            color: EMBED_COLOR,
          },
        ],
      });
    },
  },
  {
    words: [`!formatting`, `!prettier`],
    help: `describes Prettier and explains how to use it to format code`,
    category: "Reactiflux",
    handleMessage: (msg) => {
      msg.channel.send({
        embeds: [
          {
            title: "Formatting code with Prettier",
            type: EmbedType.Rich,
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
    words: [`!gender`],
    help: `reminds users to use gender-neutral language`,
    category: "Communication",
    handleMessage: (msg) => {
      msg.channel.send({
        embeds: [
          {
            title: "Please use gender neutral language by default",
            type: EmbedType.Rich,
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
    words: [`!reactts`],
    help: `Resources and tips for using React + TypeScript together`,
    category: "React/Redux",
    handleMessage: (msg) => {
      msg.channel.send({
        embeds: [
          {
            title: "Resources for React + TypeScript",
            type: EmbedType.Rich,
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
    words: [`!hooks`, `!learn`],
    help: `Resources for Learning React`,
    category: "React/Redux",
    handleMessage: (msg) => {
      msg.channel.send({
        embeds: [
          {
            title: "Learning React",
            type: EmbedType.Rich,
            description: `The [official React docs](https://react.dev) are the best resource for learning React.

The [Reactiflux "Learning Resources" page](https://www.reactiflux.com/learning) has curated links for learning JS, React, Redux, and TS:`,
          },
        ],
      });
    },
  },
  {
    words: [`!nw`, `!notworking`],
    help: `gives some tips on how to improve your chances at getting an answer`,
    category: "Communication",
    handleMessage: (msg) => {
      msg.channel.send({
        embeds: [
          {
            title: "State your problem",
            type: EmbedType.Rich,
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
    words: [`!laptop`],
    help: `gives some advice about what laptop to use for web development`,
    category: "Reactiflux",
    handleMessage: (msg) => {
      msg.channel.send({
        embeds: [
          {
            title: "",
            type: EmbedType.Rich,
            description: `Web development is generally not a highly taxing process, so the laptop you get may matter less than you think. Any operating system is fine for general web development.

A few things to consider when getting a laptop:
- Memory may be important if you plan on running containers (common as part of typical development flows) or emulators for mobile devices. Look for a laptop with at least 16GB of memory.
- Consumer-targeted laptops tend to be less repairable and receive less support over long periods of time than business laptops.

Here are a few recommendations for laptops:
- Dell Latitude or XPS
- Lenovo Thinkpad
- Apple Macbook (avoid models with butterfly keyboards)

These lines are popular so there's generally a lot of resources for working on them; their makers have refurbished stores and they are also widely available used if you're on a budget.
`,
            color: EMBED_COLOR,
          },
        ],
      });
    },
  },
  {
    words: ["!lock"],
    help: "",
    category: "Communication",
    handleMessage: async (msg) => {
      if (!msg.guild || !isStaff(msg.member)) {
        return;
      }

      // permission overwrites can only be applied on Guild Text Channels
      if (msg.channel.type === ChannelType.GuildText) {
        const { channel: guildTextChannel } = msg;
        await guildTextChannel.permissionOverwrites.create(
          guildTextChannel.guild.roles.everyone,
          {
            SendMessages: false,
            CreatePublicThreads: false,
            CreatePrivateThreads: false,
            SendMessagesInThreads: false,
          },
        );
        guildTextChannel.send("This channel has been locked by a moderator");
      }
    },
  },
  {
    words: ["!unlock"],
    help: "",
    category: "Communication",
    handleMessage: async (msg) => {
      if (!msg.guild || !isStaff(msg.member)) {
        return;
      }

      // permission overwrites can only be applied on Guild Text Channels
      if (msg.channel.type === ChannelType.GuildText) {
        const { channel: guildTextChannel } = msg;
        guildTextChannel.permissionOverwrites.create(
          guildTextChannel.guild.roles.everyone,
          {
            SendMessages: null, // null will inherit the permission from the parent channel category
          },
        );
      }
    },
  },
  {
    words: [`!const`],
    help: `explains that const values are not immutable`,
    category: "Web",
    handleMessage: (msg) => {
      msg.channel.send({
        embeds: [
          {
            title: "Using const variables",
            type: EmbedType.Rich,
            description: `As its name suggests, you cannot reassign a const variable.
\`\`\`js
const a = 'hello';
a = 'world'; // ❌ Uncaught TypeError: Assignment to constant variable.
\`\`\`
However, that does not mean the value of a const variable is immutable.
For example, you could mutate an object's property
\`\`\`js
const obj = {
  hello: 'world'
};
obj.hello = 'reactiflux'; // ✅
\`\`\`
or you could mutate an array's elements
\`\`\`js
const arr = ['hello'];
arr.push('world'); // ✅
arr[1] = 'reactiflux'; // ✅
console.log(arr); // ['hello', 'reactiflux']
\`\`\`

https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/const#description
https://exploringjs.com/es6/ch_variables.html#_pitfall-const-does-not-make-the-value-immutable
          `,
          },
        ],
      });
    },
  },
  {
    words: ["!remote", "!remotework"],
    help: "provides resources for the remote work job search",
    category: "Web",
    handleMessage: (msg) => {
      msg.channel.send({
        embeds: [
          {
            title: "Acquiring a remote position",
            type: EmbedType.Rich,
            description: `
Below is a list of resources we commonly point to as an aid in a search for remote jobs.

NOTE: If you are looking for your first job in the field or are earlier in your career, then getting a remote job at this stage is incredibly rare. We recommend prioritizing getting a job local to the area you are in or possibly moving to an area for work if options are limited where you are.

If you are feeling confident or are further along in career, feel free to make use of the following resources to start your search:

https://hnhiring.com/
https://whoishiring.io/
https://weworkremotely.com/
https://remoteok.io/
https://remotive.io/remote-jobs/software-dev
            `,
            color: EMBED_COLOR,
          },
        ],
      });
    },
  },
  {
    words: ["!junior", "!jobmarket"],
    help: "provides resources for the remote work job search",
    category: "Web",
    handleMessage: (msg) => {
      msg.channel.send({
        embeds: [
          {
            title: "It's a rough market",
            type: EmbedType.Rich,
            description: `The job market right now sucks for folks just starting out, but it's never been easy for folks to get their first job. There are always ways in, but right now there are fewer and there's more competition. Layoffs mean that there are more experienced people job hunting than there have been in years.

The experienced members of the server don't have experience with navigating a market like this as a newer developer, which limits our ability to give help. If you find something that works for you, please share it! That information helps us give better answers to the next person who asks.

Remote work has the most competition, and thus is likely to be more difficult to land a role. We generally recommend going local, networking at meetups or conferences that you can find.`,
            color: EMBED_COLOR,
          },
        ],
      });
    },
  },
  {
    words: [`!keys`],
    help: `Explains the importance of keys when rendering lists in React`,
    category: "React/Redux",
    handleMessage: (msg) => {
      msg.channel.send({
        embeds: [
          {
            title: "The importance of keys when rendering lists in React",
            type: EmbedType.Rich,
            description: `
React depends on the use of stable and unique keys to identify items in a list so that it can perform correct and performant DOM updates.

Keys are particularly important if the list can change over time. React will use the index in the array by default if no key is specified. You can use the index in the array if the list doesn't change and you don't have a stable and unique key available.

Please see these resources for more information:

https://react.dev/learn/rendering-lists#keeping-list-items-in-order-with-key
https://kentcdodds.com/blog/understanding-reacts-key-prop
          `,
            color: EMBED_COLOR,
          },
        ],
      });
    },
  },
  {
    words: ["!frameworks", "!framework"],
    help: "Provides a list of popular backend- and meta-frameworks",
    category: "Web",
    handleMessage: (msg) => {
      msg.channel.send({
        embeds: [
          {
            title: "",
            type: EmbedType.Rich,
            description: `
Making a choice of which framework to use is a difficult one and there are many options to choose from. Below are four lists of both frontend- and backend-frameworks including meta-frameworks, last but not least is a list of popular non-js http libraries.
_ _
_ _
            `,
            fields: [
              {
                name: "Frontend Frameworks",
                value: `
- [React](https://react.dev/)
- [Svelte](https://svelte.dev/)
- [Solid](https://www.solidjs.com/)
- [Vue](https://vuejs.org/)
- [Angular](https://angular.io/)
- [Qwik](https://qwik.builder.io/)
- [Lume](https://lume.land/)
                                `,
                inline: true,
              },
              {
                name: "Backend Frameworks",
                value: `
- [Express](https://expressjs.com/)
- [Koa](https://koajs.com/)
- [Fastify](https://www.fastify.io/)
- [Elysia.js](https://elysiajs.com/)
- [Hono](https://hono.dev/)
- [NestJS](https://nestjs.com/)
- [Oak](https://deno.land/x/oak)
- [Feathers](https://feathersjs.com/)
- [AdonisJS](https://adonisjs.com/)
- [Sails](https://sailsjs.com/)
                                `,
                inline: true,
              },
              {
                name: "Meta Frameworks",
                value: `
- [Next.js](https://nextjs.org/)
- [Remix](https://remix.run/)
- [Astro](https://astro.build/)
- [SvelteKit](https://kit.svelte.dev/)
- [Nuxt](https://nuxtjs.org/)
- [Fresh](https://fresh.deno.dev/)
- [Blitz](https://blitzjs.com/)
                `,
                inline: true,
              },
              {
                name: "Other http frameworks",
                value: `
- [.NET](https://dotnet.microsoft.com/en-us/)
- [Rocket](https://rocket.rs/)
- [FastAPI](https://fastapi.tiangolo.com/)
- [Spring Boot](https://spring.io/projects/spring-boot)
                `,
                inline: true,
              },
              {
                name: "_ _",
                value: `
- [Laravel](https://laravel.com/)
- [Actix](https://actix.rs/)
- [Flask](https://flask.palletsprojects.com/en/3.0.x/)
- [Gin](https://gin-gonic.com/)
                `,
                inline: true,
              },
              {
                name: "_ _",
                value: `
- [Django](https://www.djangoproject.com/)
- [Axum](https://github.com/tokio-rs/axum)
- [Ruby on Rails](https://rubyonrails.org/)
- [Fiber](https://gofiber.io/)
                `,
                inline: true,
              },
            ],
            color: EMBED_COLOR,
          },
        ],
      });
    },
  },
  {
    words: ["!ui"],
    category: "Web",
    help: `A list of popular tools related to UI development`,
    handleMessage: (msg) => {
      //
      msg.channel.send({
        embeds: [
          {
            title: "UI Development Libraries & Tools (React)",
            type: EmbedType.Rich,
            description: `User interfaces can be a tricky thing to get right, luckily there are a lot of tools out there to help you out. Here are some of the popular ones:
_ _
_ _
`,
            fields: [
              {
                name: "Libraries",
                value: `
- [Radix UI](https://www.radix-ui.com/)
- [Mantine](https://mantine.dev/)
- [NextUI](https://nextui.org/)
- [Chakra UI](https://chakra-ui.com/)
- [React Bootstrap](https://react-bootstrap.netlify.app/)
`,
                inline: true,
              },
              {
                name: "_ _",
                value: `
- [Headless UI](https://headlessui.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Material UI](https://mui.com/)
- [Ant Design](https://ant.design/)
- [Flowbite](https://flowbite.com/)
                `,
                inline: true,
              },
              {
                name: "Tools",
                value: `
- [Tailwind CSS](https://tailwindcss.com/)
- [UnoCSS](https://unocss.dev/)
- [Storybook](https://storybook.js.org/)
- [Sass](https://sass-lang.com/)
- [Styled-components](https://styled-components.com/)
- [Vanilla-extract](https://vanilla-extract.style/)
- [Panda CSS](https://panda-css.com/)
                `,
                inline: true,
              },
            ],
            color: EMBED_COLOR,
          },
        ],
      });
    },
  },
  {
    words: ["!apply"],
    help: "a quick list of 'good to know' items for job applications",
    category: "Web",
    handleMessage: (msg) => {
      msg.channel.send({
        embeds: [
          {
            title: "A quick list of 'good to know' items for job applications",
            type: EmbedType.Rich,
            description: dedent`
              - Your resume and interview performance are more important than your projects.
              - If you struggle to get interviews, polish your resume. You may submit your resume in #resume-review for review.
              - If you get invited to interviews reliably but constantly get rejected/ghosted afterward, practice interviewing.
              - Job descriptions are like a wishlist. It is common for a candidate to not tick every checkbox but still get the job. Just apply for the position regardless.
              - Junior remote jobs are very rare. For more, see \`!remote\`.
              - Depending on where you are, it is not uncommon for a junior to apply for 30+ jobs a week. See \`!junior\` for more details.
              - Working in large companies and smaller companies/start-ups has its advantages and disadvantages.
              - Freelancing and starting a start-up is very challenging compared to being an employee. It requires more than just your technical skills. e.g. acquiring customers, marketing, etc.
            `,
            color: EMBED_COLOR,
          },
        ],
      });
    },
  },
  {
    words: ["!auth", "!authentication"],
    help: "Provides a list of popular backend- and meta-frameworks",
    category: "Web",
    handleMessage: (msg) => {
      const firstMention = msg.mentions.users.first();
      const embed = {
        title: "",
        type: EmbedType.Rich,
        description: `
Authentication is a critical part of most web applications. Here are some resources to help you get started.
- [JSON Web Tokens (JWT) are Dangerous for User Sessions](https://redis.io/blog/json-web-tokens-jwt-are-dangerous-for-user-sessions/)
- [JWT should not be your default for sessions](https://evertpot.com/jwt-is-a-bad-default/)
        `,
        fields: [
          {
            name: "Authentication Resources",
            value: `
- [TheCopenhagenBook](https://thecopenhagenbook.com/)
- [OWASP Auth Cheatsheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP Session Cheatsheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
`,
            inline: true,
          },
          {
            name: "Authentication Libraries",
            value: `
- [Lucia](https://lucia-auth.com/)
- [Auth.js](https://authjs.dev/)
- [Passport](http://www.passportjs.org/)
`,
            inline: true,
          },
          {
            name: "Auth as a service",
            value: `
- [Supabase](https://supabase.io/)
- [Clerk](https://clerk.com/)
- [Auth0](https://auth0.com/)
`,
            inline: true,
          },
        ],
        color: EMBED_COLOR,
      };

      if (firstMention && firstMention.id !== msg.mentions.repliedUser?.id) {
        embed.description = `Hey ${firstMention}, ${embed.description}`;
      }

      msg.channel.send({
        embeds: [embed],
      });
    },
  },
  {
    words: ["!cra", "!create-react-app"],
    help: "Provides alternatives to Create React App, which is no longer recommended.",
    category: "Web",
    handleMessage: (msg) => {
      msg.channel.send({
        embeds: [
          {
            title: "create-react-app is deprecated",
            type: EmbedType.Rich,
            description: `
create-react-app is deprecated and no longer recommended for use. It is not maintained and has a large number of security vulnerabilities. Please use [Vite](https://vitejs.dev/) or [Next.js](https://nextjs.org/) instead. The [React docs](https://react.dev/learn/start-a-new-react-project#can-i-use-react-without-a-framework) has more to say about using React without the use of a framework like Next or Remix.
            `,
            color: EMBED_COLOR,
          },
        ],
      });
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
      // Only check the first line of the message
      return a.words[0].split("\n", 1)[0].localeCompare(b.words[0]);
    });

    const boldTitle = `**${category}**`;
    const commandDescriptions = commands
      .map((command) => {
        const formattedWords = command.words.map((word) => `**\`${word}\`**`);
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
    if (!maybeMessage.guild && maybeMessage.channel.type !== ChannelType.DM) {
      return;
    }
    const msg = maybeMessage.partial
      ? await maybeMessage.fetch()
      : maybeMessage;

    commandsList.forEach((command) => {
      const keyword = command.words.find((word) => {
        return msg.content.toLowerCase().includes(word);
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

const generateReactDocsErrorEmbeds = (search: string): APIEmbed[] => {
  return [
    {
      type: EmbedType.Rich,
      description: `Could not find anything on React documentation for **'${search}'**`,
      color: EMBED_COLOR,
      author: {
        name: "React documentation",
        icon_url:
          "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/React-icon.svg/1150px-React-icon.svg.png",
        url: "https://react.dev/",
      },
    },
  ];
};

export default commands;
