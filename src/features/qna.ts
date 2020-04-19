import { Message, TextChannel, DMChannel, NewsChannel } from "discord.js";
import { ChannelHandlers } from "../types";

const ALLOWED_ROLES = ["moderator", "Moderator", "admin", "Admin"];

enum QnAMessageType {
  Question,
  Answer
}

type QnAMessages = {
  [messageId: string]: QnAMessageType;
};

const qnaMessages: QnAMessages = {};
let counter = 0;
let prevMessagesIds: string[] = [];

const counterAsWord = (q: number) => {
  if (q === 0) return ":zero:";
  if (q === 1) return ":one:";
  if (q === 2) return ":two:";
  if (q === 3) return ":three:";
  else return "more than three";
};

const flush = (channel: TextChannel | DMChannel | NewsChannel) => {
  prevMessagesIds.forEach(oldId =>
    channel.messages.fetch(oldId).then(msg => msg.delete())
  );
  prevMessagesIds = [];
};

const prompt = (msg: Message) => {
  if (counter < 3) {
    msg.channel
      .send(
        `:robot: Please ask your question now. Our guest has ${counterAsWord(
          counter
        )} questions queued. As a reminder - we limit the queue to 3 questions at a time. Please remember to start your question with [Q&A] - thank you!`
      )
      .then(msg => {
        flush(msg.channel);
        prevMessagesIds.push(msg.id);
      });
  } else {
    msg.channel
      .send(
        `:robot: Please stop your questions for now. Our guest has ${counterAsWord(
          counter
        )} questions queued.`
      )
      .then(msg => {
        flush(msg.channel);
        prevMessagesIds.push(msg.id);
      });
  }
};

type Commands = {
  [trigger: string]: (msg: Message) => void;
};

const reactionCommands: Commands = {
  "🇶": msg => {
    qnaMessages[msg.id] = QnAMessageType.Question;
    counter++;
    prompt(msg);
  },
  "🇦": msg => {
    qnaMessages[msg.id] = QnAMessageType.Answer;
    if (counter === 0) return;
    counter--;
    prompt(msg);
  },
  "❌": msg => {
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
};

const messageCommands: Commands = {
  "!qa:reset": () => {
    counter = 0;
  },
  "!qa:count": msg => {
    prompt(msg);
  }
};

const qna: ChannelHandlers = {
  handleMessage: ({ msg }) => {
    const command = messageCommands[msg.content.toLowerCase()];
    if (!command) return;

    const author = msg.guild?.member(msg.author);
    const allowed = ALLOWED_ROLES.some(allowedRole => {
      return author?.roles.cache.has(allowedRole);
    });

    if (allowed) {
      command(msg);
    }
  },

  handleReaction: ({ reaction, user }) => {
    // We already handled this message, skip it
    if (qnaMessages[reaction.message.id]) return;

    const command = reactionCommands[reaction.emoji.toString()];
    if (!command) return;

    const author = reaction.message.guild?.member(user.id);
    const allowed = ALLOWED_ROLES.some(allowedRole => {
      return author?.roles.cache.has(allowedRole);
    });

    if (allowed) {
      command(reaction.message);
    }
  }
};

export default qna;
