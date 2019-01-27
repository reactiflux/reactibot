const stdoutLog = (type, text) => {
  const d = new Date();
  console.log(
    `[${d.toLocaleDateString()} ${d.toLocaleTimeString()}] [${type}] ${text}`
  );
};

const channelLog = (bot, channelID) => (type, text) => {
  try {
    bot.channels.get(channelID).send(`[${type}] ${text}`);
  } catch (e) {}
};

const logger = (function() {
  this.loggers = [];

  return {
    add: logger => this.loggers.push(logger),
    log: (...arguments) => this.loggers.map(logger => logger(...arguments))
  };
})();

module.exports = {
  logger,
  stdoutLog,
  channelLog
};
