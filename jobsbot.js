require('dotenv').config()

const discord = require("discord.js");
const fetch = require('node-fetch');
const mysql = require('mysql');

const sql = mysql.createConnection({
	host     : 'localhost',
	user     : process.env.DB_USER,
	password : process.env.DB_PASS,
	database : process.env.DB_DATABASE,
	supportBigNumbers: true	
});
sql.connect();


const bot = new discord.Client();
bot.login(process.env.DISCORD_HASH);

const normalizeUrl = (url) => {	
	url = url.trim();
	const ssl = url.indexOf('https:');
	url = url.replace('http://www.', '');
	url = url.replace('https://www.', '');
	url = url.replace('http://', '');
	url = url.replace('https://', '');
	if(url.substr(-1) === '/') url = url.substr(0, url.length - 1);
	
	
	return (ssl ? 'https://' : 'http://') + url;
}

const stdoutLog = (type, text) => {
	const d = new Date();
	console.log(`[${d.toLocaleDateString()} ${d.toLocaleTimeString()}] [${type}] ${text}`);
}

const channelLog = (channelID) => (type, text) => {
	try {
		bot.channels.get(channelID).send(`[${type}] ${text}`);
	} catch (e) {
		// not yet connected to discord
	}
}

const logger = (function() {
	this.loggers = [];

	return {
		add: (logger) => this.loggers.push(logger),
		log: (...arguments) => this.loggers.map(logger => logger(...arguments))
	}
})()
logger.add(stdoutLog);
logger.add(channelLog('479862475047567361'));

bot.on("message", (msg) => {
	// ignore messages sent by the bot
	if(msg.author.id === bot.user.id) return;
	

	if(msg.channel.type === 'text') {
		const payload = [
			msg.id,
			parseInt(msg.createdTimestamp / 1000),
			msg.author.username,
			msg.author.id,
			msg.channel.name,
			msg.cleanContent
		];
		sql.query('INSERT INTO `messages` SET `messageId` = ?, `createdAt` = FROM_UNIXTIME(?), `authorName` = ?, `authorId` = ?, `channelName` = ?, `content` = ?', payload, (er, res, fields) => {
			if(er) {
				logger.log('ERROR', er);
			}
		});
		
		/**
		* find URLs
		*/
		const links = msg.content.match(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g);
		if(links && links.length > 0) {
			links.map((link) => {			
				const linkPayload = [
					normalizeUrl(link),
					parseInt(msg.createdTimestamp / 1000),
					msg.author.username,
					msg.author.id,
					msg.channel.name
				];
				
				sql.query('INSERT INTO `links` SET `link` = ?, `postedAt` = FROM_UNIXTIME(?), `authorName` = ?, `authorId` = ?, `channelName` = ?', linkPayload, (er) => {
					
				});
			})
		}
	}
});

bot.on('messageUpdate', (old, msg) => {	
	if(msg.channel.type === 'text') {
		const payload = [
			parseInt(msg.createdTimestamp / 1000),
			msg.author.username,
			msg.author.id,
			msg.channel.name,
			msg.cleanContent,
			msg.id
		];
		sql.query('UPDATE `messages` SET `createdAt` = FROM_UNIXTIME(?), `authorName` = ?, `authorId` = ?, `channelName` = ?, `content` = ? WHERE `messageId` = ? ', payload, (er, res, fields) => {
			if(er) {
				logger.log('ERROR', er);
			}
		})
	}
});

logger.log('INI','Bootstrap complete')
bot.on('ready', () => {
	logger.log('INI','Bot connected to Discord server');
});
bot.on('error', (err) => {
	logger.log('ERR', err);
});
