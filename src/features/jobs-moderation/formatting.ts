import { Message } from "discord.js";
import cooldown from "../cooldown";

const tags = ["forhire", "for hire", "hiring", "remote", "local"];

export const formatting = async (message: Message) => {
  // Handle missing tags
  const content = message.content.toLowerCase();
  const hasTags = tags.some((tag) => content.includes(`[${tag}]`));
  if (!hasTags && message.mentions.members?.size === 0) {
    if (cooldown.hasCooldown(message.author.id, "user.jobs")) return;

    cooldown.addCooldown(message.author.id, "user.jobs");
    // TODO: private threads, probably a discord helper for creating
    const thread = await message.startThread({
      name: message.author.username,
    });
    const content = `Your post to #job-board didn't have any tags - please consider adding some of the following tags to the start of your message to make your offer easier to find (and to index correctly on https://reactiflux.com/jobs):

      [FOR HIRE] - you are looking for a job
      [HIRING] - you are looking to hire someone
      [INTERN] - this is an intern position, no experience required
      [REMOTE] - only remote work is possible
      [LOCAL] - only local work is possible (please remember to provide the country / city!)
      [VISA] - Your company will help with the visa process in case of successful hire

      Thank you :)

      :robot: This message was sent by a bot, please do not respond to it - in case of additional questions / issues, please contact one of our mods!`;
    if (thread) {
      // Warning is sent in a newly created thread
      await thread.send(content);
    } else {
      // If thread creation fails, the warning is sent as a normal message
      await message.reply(content);
    }
  }
};
