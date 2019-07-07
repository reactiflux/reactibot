const autoban = {
  naughty: [
    "dating", "naked", "pictures", "photos", "gambling", "betting", "whatsapp", "telegram"
  ],
  nice: ["react", "javascript", "hiring", "for hire"],
  handleMessage: ({ msg }) => {
    const messageContent = msg.content.toLowerCase();
    const matchWord = word => messageContent.includes(word);

    const isNewUser = (Date.now() - msg.author.createdTimestamp) < (48 * 3600 * 1000);
    const containsLink = /https?:\/\//.test(messageContent);
    const containsNaughtyWord = autoban.naughty.some(matchWord);
    const containsNiceWord = autoban.nice.some(matchWord);

    if (isNewUser && containsLink && containsNaughtyWord && !containsNiceWord) {
      msg.author.send(
        `Hello there! Our automated systems detected your message as a spam message and you have been banned from the server. If this is an error on our side, please feel free to contact one of the moderators.`
      );
      msg.delete();
      msg.guild.ban(msg.author.id);
    }
  }
};

module.exports = {
  default: autoban
};
