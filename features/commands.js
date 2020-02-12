const cooldown = require("./cooldown").default;
const fetch = require("node-fetch");
const { JSDOM } = require("jsdom");
const { MDN } = require("./MDN");

const commands = {
  triggers: [
    {
      words: [`!commands`],
      help: `lists all available commands`,
      handleMessage: msg => {
        const payload = commands.triggers
          .map(trigger => {
            return `${trigger.words.join(", ")} - ${trigger.help}`;
          })
          .join("\n")
          .trim();

        msg.channel.send(
          `We have a few commands available: \`\`\`${payload}\`\`\``,
          {
            reply: msg.author
          }
        );
      }
    },
    {
      words: [`!rrlinks`],
      help: `shares a repository of helpful links regarding React and Redux`,
      handleMessage: msg => {
        msg.channel.send({
          embed: {
            title: "Helpful links",
            type: "rich",
            description: `Reactiflux's Mark Erikson has put together a curated list of useful React & Redux links for developers of all skill levels. Check out https://github.com/markerikson/react-redux-links`,
            color: 7506394
          }
        });
      }
    },
    {
      words: [`!xy`],
      help: `explains the XY problem`,
      handleMessage: msg => {
        msg.channel.send({
          embed: {
            title: "Helpful links",
            type: "rich",
            description: `You may be experiencing an XY problem: http://xyproblem.info/ - basically, try to explain your end goal, instead of the error you got stuck on. Maybe there's a better way to approach the problem.`,
            color: 7506394
          }
        });
      }
    },
    {
      words: [`!ymnnr`],
      help: `links to the You Might Not Need Redux article`,
      handleMessage: msg => {
        msg.channel.send({
          embed: {
            title: "You Might Not Need Redux",
            type: "rich",
            description: `People often choose Redux before they need it. “What if our app doesn’t scale without it?

https://medium.com/@dan_abramov/you-might-not-need-redux-be46360cf367`,
            color: 7506394
          }
        });
      }
    },
    {
      words: [`!derived`],
      help: `links to the React docs regarding the getDerivedStateFromProps function (ab)use`,
      handleMessage: msg => {
        msg.channel.send({
          embed: {
            title:
              "You might not need getDerivedStateFrom props or state at all!",
            type: "rich",
            description: `React 16.4 included a bugfix for getDerivedStateFromProps which caused some existing bugs in React components to reproduce more consistently. If this release exposed a case where your application was using an anti-pattern and didn’t work properly after the fix...

https://reactjs.org/blog/2018/06/07/you-probably-dont-need-derived-state.html`,
            color: 7506394
          }
        });
      }
    },
    {
      words: [`!stateupdates`, `!su`],
      help: `Explains the implications involved with state updates being asynchronous`,
      handleMessage: msg => {
        msg.channel.send({
          embed: {
            title:
              "State Updates May Be Asynchronous",
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
https://reactjs.org/docs/state-and-lifecycle.html#state-updates-may-be-asynchronous`,
            color: 7506394
          }
        });
      }
    },
    {
      words: [`!bind`],
      help: `explains how and why to bind in React applications`,
      handleMessage: msg => {
        msg.channel.send({
          embed: {
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
            color: 7506394
          }
        });
      }
    },
    {
      words: [`!lift`],
      help: `links to the React docs regarding the common need to "lift" state`,
      handleMessage: msg => {
        msg.channel.send({
          embed: {
            title: "Lifting State Up",
            type: "rich",
            description: `Often, several components need to reflect the same changing data. We recommend lifting the shared state up to their closest common ancestor. Let’s see how this works in action.

https://reactjs.org/docs/lifting-state-up.html`,
            color: 7506394
          }
        })
      }
    },

    {
      words: [`!ask`],
      help: `explains how to ask questions`,
      handleMessage: msg => {
        msg.channel.send({
          embed: {
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
> \`Uncaught TypeError: undefined is not a function\``,
            color: 7506394
          }
        });
      }
    },
    {
      words: [`!code`, `!gist`],
      help: `explains how to attach code`,
      handleMessage: msg => {
        msg.channel.send({
          embed: {
            title: "Attaching Code",
            type: "rich",
            description: `When asking a question, try to include as much relevant code as you can.

You can paste small bits of code directly in chat with syntax highlighting:

\\\`\\\`\\\`js
// your code goes here
\\\`\\\`\\\`

Or you can upload larger blocks of code (or files) to a service such as https://gist.github.com.

We are also big fans of https://codesandbox.io/s/new where you can set up a working example of your code (or reproduce your bug). You can even link it to an existing GitHub repo so that others can try out your code live and help you solve your problems.
`,
            color: 7506394
          }
        });
      }
    },
    {
      words: [`!ping`],
      help: `explains how to ping politely`,
      handleMessage: msg => {
        msg.channel.send({
          embed: {
            title: "Don’t ping or DM other devs you aren’t actively talking to",
            type: "rich",
            description: `It’s very tempting to try to get more attention to your question by @-mentioning one of the high profile(or recently active) members of Reactiflux, but please don’t. They may not actually be online, they may not be able to help, and they may be in a completely different timezone–nobody likes push notifications at 3am from an impatient stranger.

Similarly, don’t DM other members without asking first. All of the same problems as @-mentioning apply, and private conversations can’t help anyone else. Your questions are likely not unique, and other people can learn from them when they’re kept public.`,
            color: 7506394
          }
        });
      }
    },
    {
      words: [
        `!inputs`,
      ],
      help: `provides links to uncontrolled vs controlled components`,
      handleMessage: (msg) => {
        msg.channel.send({
          embed: {
            title: 'Uncontrolled vs Controlled components',
            type: 'rich',
            description: `In React, inputs can either be uncontrolled (traditional input) or be controlled via state.
Here's an article explaining the difference between the two: https://goshakkk.name/controlled-vs-uncontrolled-inputs-react/
            `,
            color: 7506394,
          }
        });
      },
    },
    {
      words: [`!move`],
      help: `allows you to move the conversation to another channel, usage: !move #toChannel @person1 @person2 @person3 ...`,
      handleMessage: msg => {
        const [_, newChannel] = msg.content.split(" ");
        const { author, channel, mentions } = msg;

        try {
          msg.guild.channels
            .get(newChannel.replace("<#", "").replace(">", ""))
            .send(
              `${author} has opened a portal from ${channel} summoning ${mentions.members
                .map(i => i)
                .join(" ")}`
            );
        } catch (e) {}
      }
    },
    {
      words: [`!mdn`],
      help: `allows you to search something on MDN, usage: !mdn Array.prototype.map`,
      handleMessage: async msg => {
        const [command, ...args] = msg.content.substring(1).split(/[\s.]/g);
        const fetchMsg = await msg.channel.send(`Fetching "${args.join(" ")}"...`);

        const { fuse } = await MDN.getStore();
        const [topResult, ...rest] = fuse.search(args.join(" "));
        const stringDOM = await fetch(
          `${MDN.baseUrl}${topResult.item.href}`
        ).then(res => res.text());
        const { document } = new JSDOM(stringDOM).window;
        const title = document.querySelector(".title").textContent;
        const description = document.querySelector("#wikiArticle > p")
          .textContent;

        await msg.channel.send({
          embed: {
            type: "rich",
            author: {
              name: "MDN",
              url: `${MDN.baseUrl}`,
              icon_url:
                "https://developer.mozilla.org/static/img/opengraph-logo.72382e605ce3.png"
            },
            title,
            description,
            color: 0x83d0f2,
            url: `${MDN.baseUrl}${topResult.item.href}`
          }
        });

        fetchMsg.delete();
      }
		},
		{
      words: [
        `!appIdeas`,
      ],
      help: `provides a link to the best curated app ideas for beginners to advanced devs`,
      handleMessage: (msg) => {
        msg.channel.send({
          embed: {
            title: 'Florinpop17s Curated App Ideas!',
            type: 'rich',
						description: `Sometimes it's tough finding inspiration, luckily this guy listed a bunch of stuff for you to pick from for your next project!  Well sorted progression to confidence in web dev.
						
						https://github.com/florinpop17/app-ideas
            `,
            color: 7506394,
          }
        });
      },
    },
  ],
  handleMessage: ({ msg, user }) => {
    Object.keys(commands.triggers).map(trigger => {
      const keyword = commands.triggers[trigger].words.find(word => {
        return msg.content.toLowerCase().indexOf(word) === 0;
      });

      if (keyword) {
        if (cooldown.hasCooldown(msg.author.id, `commands.${keyword}`)) return;
        cooldown.addCooldown(msg.author.id, `commands.${keyword}`);
        commands.triggers[trigger].handleMessage.call(this, msg);
      }
    });
  }
};

module.exports = {
  default: commands
};
