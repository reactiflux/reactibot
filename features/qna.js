const qna = {
  pending: 1,
  answered: 2,
  allowedRoles: ["moderator", "Moderator", "admin", "Admin"],

  list: {},
  counter: 0,

  prevMessage: [],

  counterAsWord: q => {
    if (q === 0) return ":zero:";
    if (q === 1) return ":one:";
    if (q === 2) return ":two:";
    if (q === 3) return ":three:";
    else return "more than three";
  },

  flush: msg => {
    qna.prevMessage.forEach(oldId =>
      msg.channel.fetchMessage(oldId).then(msg => msg.delete())
    );
    qna.prevMessage = [];
  },

  prompt: msg => {
    if (qna.counter < 3) {
      msg.channel
        .send(
          `:robot: Please ask your question now. Our guest has ${qna.counterAsWord(
            qna.counter
          )} questions queued. As a reminder - we limit the queue to 3 questions at a time. Please remember to start your question with [Q&A] - thank you!`
        )
        .then(msg => {
          qna.flush(msg);
          qna.prevMessage.push(msg.id);
        });
    } else {
      msg.channel
        .send(
          `:robot: Please stop your questions for now. Our guest has ${qna.counterAsWord(
            qna.counter
          )} questions queued.`
        )
        .then(msg => {
          qna.flush(msg);
          qna.prevMessage.push(msg.id);
        });
    }
  },

  triggers: {
    "🇶": (msg, user) => {
      qna.list[msg.id] = qna.pending;
      qna.counter++;
      qna.prompt(msg);
    },
    "🇦": (msg, user) => {
      qna.list[msg.id] = qna.answered;
      if (qna.counter === 0) return;
      qna.counter--;
      qna.prompt(msg);
    },
    "❌": (msg, user) => {
      msg.author
        .send(`Hello there! Your message has been removed from the Question and Answers channel by a moderator.
			
Most likely the message was removed, because we try to limit the current unanswered messages count to about 3, our guest(s) might need more time to answer all the questions.
			
Please feel free to ask your question again when a slot becomes open. I've copied the question bellow for you:
			
\`\`\`
${msg.content}
\`\`\`
			
:robot: This message was sent by a bot, please do not respond to it - in case of additional questions / issues, please contact one of our mods!`);
      msg.delete();
    }
  },

  commands: [
    {
      words: [`!qa:reset`],
      handleMessage: msg => {
        qna.counter = 0;
      }
    },
    {
      words: [`!qa:count`],
      handleMessage: msg => {
        qna.prompt(msg);
      }
    }
  ],

  handleMessage: ({ msg, user }) => {
    Object.keys(qna.commands).map(trigger => {
      let hasWord = false;
      const words = qna.commands[trigger].words;
      words.map(word => {
        if (msg.content.toLowerCase().includes(word)) {
          hasWord = word;
        }
      });

      if (hasWord) {
        msg.guild.fetchMember(user.id).then(user => {
          if (qna.allowedRoles.find(role => user.roles.find("name", role))) {
            qna.commands[trigger].handleMessage.call(this, msg);
          }
        });
      }
    });
  },

  handleReaction: ({ reaction, user }) => {
    if (qna.list[reaction.message.id]) return;
    const emoji = reaction.emoji.toString();
    if (qna.triggers[emoji]) {
      reaction.message.guild.fetchMember(user.id).then(user => {
        if (qna.allowedRoles.find(role => user.roles.find("name", role))) {
          qna.triggers[emoji].call(this, reaction.message, user);
        }
      });
    }
  }
};

module.exports = {
  default: qna
};
