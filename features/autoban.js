const autoban = {
	tags: [
		'sex dating',
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
      msg.delete();
      msg.guild.ban(msg.author.id);	
		}
	}
}

module.exports = {
  default: autoban
}