import { describe, expect, it } from "vitest";
import { PostType, POST_FAILURE_REASONS } from "../../types/jobs-moderation";
import { links, formatting } from "./validate";

const makePost = (type: PostType, description: string) => [
  { tags: [type], description },
];

describe("emoji", () => {
  it("isn't too crazy about emoji", () => {
    const noFailure = [
      "for some role and stuff\nDM me to apply ✨",
      "for some role and stuff\nDM me to apply ✨",
      "👉 stuff: some more details afterwards and whatever shenanigans\n👉 stuff: some more details afterwards and whatever shenanigans\n👉 stuff: some more details afterwards and whatever shenanigans\n👉 stuff: some more details afterwards and whatever shenanigans\n👉 stuff: some more details afterwards and whatever shenanigans\n",
    ];
    for (const content of noFailure) {
      expect(
        formatting(
          makePost(PostType.forHire, content),
          // @ts-expect-error testing override
          { content: `[forhire]\n${content}` },
        ),
      ).not.toContainEqual({ type: POST_FAILURE_REASONS.tooManyEmojis });
    }
  });
  it("stops obnoxious emoji usage", () => {
    const noFailure = [
      "for ✨ some role and stuff\nDM ✨ me ✨ to ✨ apply ✨",
      "for some role and stuff\nDM me to apply ✨✨✨✨✨✨",
      "👉 stuff: some more ✨✨ details afterwards and whatever shenanigans\n👉 stuff: some more ✨✨ details afterwards and whatever shenanigans\n👉 stuff: some more ✨✨ details afterwards and whatever shenanigans\n👉 stuff: some more ✨✨ details afterwards and whatever shenanigans\n👉 stuff: some more ✨✨ details afterwards and whatever shenanigans\n",
    ];
    for (const content of noFailure) {
      expect(
        formatting(
          makePost(PostType.forHire, content),
          // @ts-expect-error testing override
          { content: `[forhire]\n${content}` },
        ),
      ).toContainEqual({ type: POST_FAILURE_REASONS.tooManyEmojis });
    }
  });
});
describe("links", () => {
  it("requires links", () => {
    expect(
      links(
        makePost(
          PostType.hiring,
          "Hiring for some role and stuff\nDM me to apply",
        ),
        undefined,
      ),
    ).toContainEqual({ type: POST_FAILURE_REASONS.linkRequired });
    expect(
      links(
        makePost(
          PostType.hiring,
          "Hiring for some role and stuff\nDM me to apply\nhttps://example.com",
        ),
        undefined,
      ),
    ).toHaveLength(0);
    expect(
      links(
        makePost(PostType.forHire, "advertising my own skills for hire"),
        undefined,
      ),
    ).toHaveLength(0);
  });
  it("doesn't choke on weird urls", () => {
    const urls = [
      "https://www.example.com",
      "https://subdomain.example.com",
      "https://www.sub.example.com",
      "https://www.example.com/path/to/page",
      "https://www.example.com/?query=param",
      "https://www.example.com/path/to/page?query=param",
      "https://www.example.com/#section",
      "https://www.example.com/path/to/page#section",
      "https://www.example.com/path/to/page?query=param#section",
      "https://xn--bcher-kva.example/",
      "https://192.168.0.1",
      "https://[2001:db8::ff00:42:8329]",
      "https://www.example.co.uk",
      "https://www.example.travel",
      "https://www.example.com:8080",
      "https://www.example.com:8443",
      "https://www.example.com/images/pic.jpg",
      "https://www.example.com/files/document.pdf",
      "https://www.example.com/path%20with%20spaces",
    ];
    expect.assertions(urls.length);
    urls.forEach((url) => {
      expect(
        links(
          makePost(
            PostType.hiring,
            `Hiring for some role and stuff\nDM me to apply\n${url}`,
          ),
          undefined,
        ),
      ).toHaveLength(0);
    });
  });
});
