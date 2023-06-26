import { simplifyString } from "../../helpers/string";

export interface Post {
  tags: string[];
  description: string;
  // contact: string;
}

export enum PostType {
  hiring = "hiring",
  forHire = "forhire",
}

type SimplifiedTag = string;
type StandardTag = string;
// The tag map exists as an abstraction point to hopefully make it easier in the
// future to expand this into things like, "APAC/EMEA/etc" for region,
// interpreting compensation, all sorts of fun follow ons.
const tagMap = new Map<string, (s: SimplifiedTag) => StandardTag>([
  ["forhire", () => PostType.forHire],
  ["hiring", () => PostType.hiring],
  ["hire", () => PostType.hiring],
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
  const [tagsLine, ...lines] = inputString.trim().split("\n");
  return [
    {
      tags: parseTags(tagsLine),
      description: lines.reduce((description, line) => {
        if (line === "") {
          return description;
        }
        if (description === "") {
          return (description += line);
        }
        return (description += "\n\n" + line);
      }, ""),
      // contact: "",
    },
  ];
};
