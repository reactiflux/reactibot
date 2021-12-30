import { ChannelHandlers } from "../types";
import { isStaff } from "../helpers/discord";
import cooldown from "./cooldown";

const tags = ["forhire", "for hire", "hiring", "remote", "local"];

const jobs: ChannelHandlers = {
  handleMessage: async ({ msg: maybeMessage }) => {
    let hasTags = false;

    if (!maybeMessage.member || isStaff(maybeMessage.member)) return;

    const msg = maybeMessage.partial
      ? await maybeMessage.fetch()
      : maybeMessage;
    const content = msg.content.toLowerCase();

    tags.forEach((tag) => {
      if (content.includes(`[${tag}]`)) hasTags = true;
    });

    if (!hasTags && msg.mentions.members?.size === 0) {
      if (cooldown.hasCooldown(msg.author.id, "user.jobs")) return;

      cooldown.addCooldown(msg.author.id, "user.jobs");
      msg.author
        .send(`Hello there! It looks like you just posted a message to the #jobs channel on our server.

I noticed that you've not added any tags - please consider adding some of the following tags to the start of your message to make your offer easier to find:

[FOR HIRE] - you are looking for a job
[HIRING] - you are looking to hire someone
[INTERN] - this is an intern position, no experience required
[REMOTE] - only remote work is possible
[LOCAL] - only local work is possible (please remember to provide the country / city!)
[VISA] - Your company will help with the visa process in case of successful hire

Thank you :)

:robot: This message was sent by a bot, please do not respond to it - in case of additional questions / issues, please contact one of our mods!`);
    }
  },
};

export default jobs;
