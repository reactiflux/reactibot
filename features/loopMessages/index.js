/**
 * ------------------------------
 * Loop Messages
 * ------------------------------
 * The bot will keep a message as the last one in a channel, with an interval between each post,
 * to keep important information more visible to users
 *
 * How it works:
 * At startup and repeatedly by a given interval, for each loop message, the bot will:
 * 1. Get the target channel of the loop message
 * 2. Fetch the last 50 messages of the channel
 * 3. If the last message is already the message we want to loop, do nothing (we don't want to spam the channel)
 * 4. Delete all loop messages (so the channel isn't filled with bot messages)
 * 5. Send the loop message
 */

const loopMessages = require("./messages.js");

// time between each check to send a new loop message
const INTERVAL_TIME = 40 * 60 * 1000; // 40 minutes (ms)

function getContent(loopMessage) {
  return loopMessage.trim();
}

function isMessageFromBot(bot, message) {
  return message.author.id === bot.user.id;
}

function isLoopMessage(messageToCheck, loopMessage, bot) {
  return (
    isMessageFromBot(bot, messageToCheck) &&
    messageToCheck.content.trim() === getContent(loopMessage.content)
  );
}

async function sendLoopMessage(client, loopMessage) {
  const channel = client.channels.get(loopMessage.channelId);
  const channelMessages = await channel.fetchMessages({ limit: 50 });

  // if the last message in the channel is from the bot, we don't need to send it again
  if (isLoopMessage(channelMessages.first(), loopMessage, client)) {
    return;
  }

  // search through all the last messages for the loop message, so we can delete it
  channelMessages.forEach(message => {
    if (isLoopMessage(message, loopMessage, client)) {
      message.delete();
    }
  });

  // now we can send the loop message in the channel
  channel.send(getContent(loopMessage.content));
}

module.exports = {
  register: (client, logger) => {
    client.on("ready", () => {
      const sendLoopMessages = () => {
        loopMessages.forEach(message => {
          sendLoopMessage(client, message);
        });
      };

      setInterval(() => {
        sendLoopMessages();
      }, INTERVAL_TIME);

      sendLoopMessages();

      logger.log("INI", "Registered Loop Messages");
    });
  }
};
