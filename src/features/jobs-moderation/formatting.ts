import { extractEmoji, simplifyString } from "../../helpers/string";
import {
  JobPostValidator,
  Post,
  PostFailures,
  POST_FAILURE_REASONS,
} from "./job-mod-helpers";

export const normalizeContent = (content: string) => {
  return content.replace(/\n+/g, "\n").trim();
};

// export const validateMessageContent = (content: string) => {
//   const normalized = normalizeContent(content);
//   if (
//     !normalized.includes("|") ||
//     !(normalized.includes("hiring") || normalized.includes("forhire"))
//   ) {
//     return false;
//   }
//   return true;
// };
export const parseContent = (inputString: string): Post[] => {
  const lines = inputString.trim().split("\n");
  const posts = lines.reduce<Post[]>((acc, line) => {
    if (line === "") return acc;
    if (line.includes("|") || line.includes("[")) {
      // This line contains tags, so we're starting a new post
      acc.push({
        tags: parseTags(line),
        description: "",
        // contact: "",
      });
    } else {
      // This line belongs to the current post
      const currentPost = acc[acc.length - 1];
      // If there are no tags, we should still parse correctly
      if (!currentPost) {
        acc.push({ tags: [], description: line });
        // } else if (currentPost.contact === "") {
        // currentPost.contact = "";
        // } else {
        // currentPost.contact += "\n" + line;
      } else if (currentPost.description === "") {
        currentPost.description += line;
      } else {
        currentPost.description += "\n" + line;
      }
    }
    return acc;
  }, []);
  return posts.map((post) => {
    return { ...post };
  });
};

type SimplifiedTag = string;
type StandardTag = string;
// The tag map exists as an abstraction point to hopefully make it easier in the
// future to expand this into things like, "APAC/EMEA/etc" for region,
// interpreting compensation, all sorts of fun follow ons.
const tagMap = new Map<string, (s: SimplifiedTag) => StandardTag>([
  ["forhire", () => "forhire"],
  ["hiring", () => "hiring"],
  ["hire", () => "hiring"],
]);

const standardizeTag = (tag: string) => {
  const simpleTag = simplifyString(tag).replace(/\W/g, "");
  const standardTagBuilder = tagMap.get(simpleTag);
  return standardTagBuilder?.(simpleTag) ?? simpleTag;
};

const parseTags = (tags: string) => {
  return tags
    .split(/[|[\]]/g)
    .map((tag) => standardizeTag(tag.trim()))
    .filter((tag) => tag !== "");
};

const NEWLINE = /\n/g;
export const formatting: JobPostValidator = (posts, message) => {
  // Handle missing tags;
  const hasTags = posts.every(
    ({ tags }) => tags.length > 0 || tags.includes("hiring") || tags.includes,
  );
  const errors: PostFailures[] = [];

  if (!hasTags) {
    errors.push({ type: POST_FAILURE_REASONS.missingType });
  }
  // If > 1 in 150 chars is an emoji
  const emojiCount = extractEmoji(message.content).length;
  if (emojiCount / message.content.length > 1 / 150) {
    errors.push({ type: POST_FAILURE_REASONS.tooManyEmojis });
  }
  const lineCount = message.content.match(NEWLINE)?.length || 0;
  if (lineCount > 18) {
    errors.push({ type: POST_FAILURE_REASONS.tooManyLines });
  }

  return errors;
};
