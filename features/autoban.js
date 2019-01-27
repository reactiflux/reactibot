const autoban = {
  tags: [
    "http://discord.amazingsexdating.com",
    "http://gambldiscord.bestoffersx.com",
    "http://discordbetfaq.whatsappx.com/",
    "http://discord.bestdatingforall.com/"
  ],
  handleMessage: ({ msg, user }) => {
    let hasToken = false;
    autoban.tags.forEach(token => {
      if (msg.content.toLowerCase().includes(token)) hasToken = true;
    });
    if (hasToken) {
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
