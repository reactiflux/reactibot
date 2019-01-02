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
			if(msg.content.toLowerCase().indexOf(`[${token}]`) !== -1) hasToken = true;
		});
		if(hasToken) {
      msg.guild.ban(msg.author.id)
      .then(user => console.log(`Banned ${user.username || user.id || user} from ${guild}`))
      .catch(console.error);			
		}
	}
}

module.exports = {
  default: autoban
}