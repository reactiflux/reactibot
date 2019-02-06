const WIT_ROLE_ID = "542091699447529492";

const witInvite = {
  handleMessage: ({ msg, user }) => {
    if (
      msg.channel.id === "541673256596537366" &&
      msg.content.startsWith("!add") &&
      msg.member.roles.has(WIT_ROLE_ID)
    ) {
      msg.mentions.users.forEach(user => {
        msg.member.guild.member(user).addRole(WIT_ROLE_ID);
        msg.channel.send(
          `Added <@${user.id}> to <#${msg.channel.id}>! Welcome :)`
        );
      });
    }
  }
};

module.exports = {
  default: witInvite
};
