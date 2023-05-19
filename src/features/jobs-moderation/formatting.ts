import { Message } from "discord.js";
import cooldown from "../cooldown";

const tags = ["forhire", "for hire", "hiring", "remote", "local"];

export const normalizeContent = (content: string) => {
  return content.replace(/\n+/g, "\n").trim();
};

const enum VALIDATION_ERROR {
  tooManyLines,
  missingType,
  invalidContact,
  tooManyEmojis,
  unknownLocation,
  invalidPostType,
}

export const validateMessageContent = (content: string) => {
  const normalized = normalizeContent(content);
  if (
    !normalized.includes("|") ||
    !(normalized.includes("hiring") || normalized.includes("for hire"))
  ) {
    return false;
  }
  return true;
};
interface Post {
  tags: string[];
  description: string;
  contact: string;
  validationErrors?: VALIDATION_ERROR[];
}
interface HiringPost extends Post {
  type: "hiring";
}
interface WorkingPost extends Post {
  type: "working";
}
export const parseContent = (inputString: string): Post[] => {
  const lines = inputString.trim().split("\n");
  const posts = lines.reduce<Post[]>((acc, line) => {
    if (line.includes("|")) {
      // This line contains tags, so we're starting a new post
      acc.push({
        tags: parseTags(line),
        description: "",
        contact: "",
      });
    } else {
      // This line belongs to the current post
      const currentPost = acc[acc.length - 1];
      if (currentPost.description === "") {
        currentPost.description = line;
      } else if (currentPost.contact === "") {
        currentPost.description += "\n" + line;
        currentPost.contact = "";
      } else {
        currentPost.contact += "\n" + line;
      }
    }
    return acc;
  }, []);
  return posts.map((post) => {
    return { ...post };
  });
};

const parseTags = (tags: string) => {
  return tags
    .split("|")
    .map((tag) => tag.trim())
    .filter((tag) => tag !== "");
};

/**
 * parseHiring takes in a message containing 1 or more job posts, where each job post is formatted similarly to "Who is Hiring?" posts on Hacker News.
 * Each job post starts with a line of the tags separated by a '|' character, followed by a line break, followed by the job description, followed by the contact information. The job description may be multiple lines. The contact information must be an email address, a URL, or a string containing "DM".
 * The tags, separated by '|' characters, are case-insensitive and can be in any order. The required tags are:
 * - company name
 * - job title
 * - job description
 * - a list of acceptable locations or regions
 * - compensation rate
 * - job type (full-time, part-time, fixed-term contract, month-to-month contract, project-based contract, or other)
 * It returns an object of the company name, job title, job description, a list of acceptable locations or regions, compensation rate, job type (full-time, part-time, fixed-term contract, month-to-month contract, project-based contract, or other), parsed from the first line of each job description.
 * @param content
 */
const parseHiring = (content: string) => {};
const parseForHire = (content: string) => {};

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
