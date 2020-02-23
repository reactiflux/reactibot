const cooldown = {
  cooldowns: {},

  addCooldown: (id, type = "user", time = 30) => {
    const key = `${id}.${type}`;
    cooldown.cooldowns[key] = true;
    setTimeout(() => {
      cooldown.removeCooldown(id, type);
    }, time * 1000);
  },

  removeCooldown: (id, type) => {
    const key = `${id}.${type}`;
    cooldown.cooldowns[key] = false;
  },

  hasCooldown: (id, type = "user") => {
    const key = `${id}.${type}`;
    return cooldown.cooldowns[key] === true;
  }
};

module.exports = {
  default: cooldown
};
