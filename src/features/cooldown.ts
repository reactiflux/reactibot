type Cooldowns = {
  [id: string]: boolean;
};

const cooldowns: Cooldowns = {};

const cooldown = {
  addCooldown: (id: string, type = "user", timeInSeconds = 30) => {
    const key = `${id}.${type}`;

    cooldowns[key] = true;

    setTimeout(() => {
      cooldown.removeCooldown(id, type);
    }, timeInSeconds * 1000);
  },

  removeCooldown: (id: string, type: string) => {
    const key = `${id}.${type}`;
    cooldowns[key] = false;
  },

  hasCooldown: (id: string, type = "user") => {
    const key = `${id}.${type}`;
    return cooldowns[key] === true;
  },
};

export default cooldown;
