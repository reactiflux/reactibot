const autoban = {
	tags: [
		'sex dating > http://discord.amazingsexdating.com',
		'earnings on sports > http://discordbetfaq.whatsappx.com/',
		'make big money > http://discordbetfaq.whatsappx.com/'
	],
	handleMessage: ({
    msg,
    user, 
  }) => {
		let hasToken = false;
		autoban.tags.forEach(token => {
			if(msg.content.toLowerCase().indexOf(token) !== -1) hasToken = true;
		});
		if(hasToken) {
      msg.author.send(`Hello there! Our automated systems detected your message as a spam message and you have been banned from the server. If this is an error on our side, please feel free to contact one of the moderators.`);
      msg.delete();
      msg.guild.ban(msg.author.id);	
		}
	}
}

module.exports = {
  default: autoban
}
