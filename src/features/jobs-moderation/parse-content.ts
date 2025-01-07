import { simplifyString } from "../../helpers/string";
import { Post, PostType } from "../../types/jobs-moderation";

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

const splitTagsFromDescription = (
  inputString: string,
): { heading: string; body: string[] } => {
  const [tagsLine, ...lines] = inputString.trim().split("\n");

  if (tagsLine.includes("[")) {
    const cleanedTags = tagsLine.replace(/\]\w+\[/, "][");
    const match = cleanedTags.match(/(.*)\](.*)/);
    const trailingText = match?.[2] || "";
    lines.unshift(trailingText.trim());
    return { heading: match?.[1] || "", body: lines };
  }
  return { heading: tagsLine, body: lines };
};

export const parseContent = (inputString: string): Post[] => {
  const { heading, body } = splitTagsFromDescription(inputString);
  // TODO: Replace above .split() with some more logic around detecting tags
  // If |, treat the complete line as tags
  // if [], check for trailing text with no wrapper and add it to the description

  return [
    {
      tags: parseTags(heading),
      description: body.reduce((description, line) => {
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
