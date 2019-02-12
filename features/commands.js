const cooldown = require("./cooldown").default;
const fetch = require("node-fetch");
const { JSDOM } = require("jsdom");
const { MDN } = require("./MDN");
const fs = require("fs");

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
      words: [`!ask`],
      help: `explains how to ask questions`,
      handleMessage: msg => {
        msg.channel.send({
          embed: {
            title: "Asking to ask",
            type: "rich",
            description: `Instead of asking to ask, ask your question instead. People can help you better if they know your question.

Example:

Bad: "Hey can anyone help me with some JS?"
Bad: "Anyone good with JS?"
Good: "I'm having trouble adding a class to a div using JS. Can I have some help?"

Please also provide any code that might help us using the following syntax:

\\\`\\\`\\\`js
// your code goes here
\\\`\\\`\\\``,
            color: 7506394
          }
        });
      }
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
        const { fuse } = await MDN.getStore();
        const [topResult, ...rest] = fuse.search(args.join(" "));
        const stringDOM = await fetch(
          `${MDN.baseUrl}${topResult.item.href}`
        ).then(res => res.text());
        const { document } = new JSDOM(stringDOM).window;
        const title = document.querySelector(".document-title").textContent;
        const description = document.querySelector("#wikiArticle p")
          .textContent;

        msg.channel.send({
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
      }
    }
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

var content = JSON.parse(fs.readFileSync('./commands.json'));

if(content) content.forEach(command => {
  command.handleMessage = msg => {
    msg.channel.send(command.message)
  }
  commands.triggers.push(command);
})

module.exports = {
  default: commands
};
