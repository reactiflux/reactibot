import { simplifyString } from "../../helpers/string";

export interface Post {
  tags: string[];
  description: string;
  // contact: string;
}

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

export const parseTags = (tags: string) => {
  return tags
    .split(/[|[\]]/g)
    .map((tag) => standardizeTag(tag.trim()))
    .filter((tag) => tag !== "");
};

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
