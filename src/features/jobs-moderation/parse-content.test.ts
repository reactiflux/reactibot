import { describe, expect, expectTypeOf, it } from "vitest";
import { parseContent } from "./parse-content.js";
import { PostType } from "../../types/jobs-moderation.js";

describe("parseContent", () => {
  describe("tags", () => {
    it("basics", () => {
      const parsed = parseContent(
        "| Company | Job Title | Location | Compensation | Job Type |",
      );
      expectTypeOf(parsed).toBeArray();
      expect(parsed[0]).toMatchObject({
        tags: ["company", "job title", "location", "compensation", "job type"],
      });

      const emptyTags = ["|", "|||", "[]", " [ ] "];
      emptyTags.forEach((tag) => {
        const [parsed] = parseContent(tag);
        expect(parsed).toMatchObject({ tags: [] });
      });

      // "for hire" standardization. All forms should end as "for hire".
      const validForHireTags = [
        "[for hire]",
        "[FOR HIRE]",
        "[FORHIRE]",
        "[forhire]",
        "for hire|",
        "|for hire|",
        "|FoRhIrE|",
      ];
      validForHireTags.forEach((tag) => {
        const [parsed] = parseContent(tag);
        expect(parsed).toMatchObject({ tags: [PostType.forHire] });
      });

      // "hiring" standardization. All forms should end as "for hire".
      const validHiringTags = [
        "[hiring]",
        "[HIRING]",
        "[hire]",
        "[HIRE]",
        "hiring|",
        "|HiRiNg|",
      ];
      validHiringTags.forEach((tag) => {
        const [parsed] = parseContent(tag);
        expect(parsed).toMatchObject({ tags: [PostType.hiring] });
      });
    });
    it("fancy", () => {
      const parsed = parseContent(
        "Company | Job Title | Location | Compensation | Job Type | Part time / full time",
      );
      expectTypeOf(parsed).toBeArray();
      expect(parsed[0]).toMatchObject({
        tags: [
          "company",
          "job title",
          "location",
          "compensation",
          "job type",
          "part time",
          "full time",
        ],
      });
    });
  });
  it("parses description", () => {
    let parsed = parseContent(`[hiring]

Lorem ipsum dolor sit amet`);
    expectTypeOf(parsed).toBeArray();
    expect(parsed[0]).toMatchObject({
      description: "Lorem ipsum dolor sit amet",
    });

    parsed = parseContent(`[hiring]
Lorem ipsum dolor sit amet
test butts
many long lines of text many long lines of text many long lines of text many long lines of text many long lines of text many long lines of text many long lines of text many long lines of text many long lines of text many long lines of text many long lines of text many long lines of text many long lines of text many long lines of text`);
    expect(parsed[0]).toMatchObject({
      description: `Lorem ipsum dolor sit amet

test butts

many long lines of text many long lines of text many long lines of text many long lines of text many long lines of text many long lines of text many long lines of text many long lines of text many long lines of text many long lines of text many long lines of text many long lines of text many long lines of text many long lines of text`,
    });

    parsed = parseContent(`[hiring]

Lorem ipsum dolor sit amet

test butts

many long lines of text`);
    expect(parsed[0]).toMatchObject({
      description: `Lorem ipsum dolor sit amet

test butts

many long lines of text`,
    });
    parsed = parseContent(`[hiring]
Lorem ipsum dolor sit amet

test butts

many long lines of text`);
    expect(parsed[0]).toMatchObject({
      description: `Lorem ipsum dolor sit amet

test butts

many long lines of text`,
    });
  });
  it("isn’t tricked by empty lines", () => {
    const parsed = parseContent(`[hiring]
    
    
    `);
    expect(parsed[0]).toMatchObject({ tags: ["hiring"], description: "" });
  });

  it("correctly pulls description off tags line", () => {
    let parsed = parseContent(`[hiring]Lorem ipsum dolor sit amet`);
    expect(parsed[0]).toMatchObject({
      tags: ["hiring"],
      description: "Lorem ipsum dolor sit amet",
    });

    parsed = parseContent(`[hiring][remote][visa]Lorem ipsum dolor sit amet`);
    expect(parsed[0]).toMatchObject({
      tags: ["hiring", "remote", "visa"],
      description: "Lorem ipsum dolor sit amet",
    });

    parsed = parseContent(
      `[hiring] [remote]  [visa]   Lorem ipsum dolor sit amet`,
    );
    expect(parsed[0]).toMatchObject({
      tags: ["hiring", "remote", "visa"],
      description: "Lorem ipsum dolor sit amet",
    });
  });

  // Disable this, not relevant right now. Also broken as of May '23
  it.skip("parses contact", () => {
    const makePost = (contact: string) => `|

Lorem ipsum dolor sit amet

${contact}`;
    const dm = makePost("DM me");
    let parsed = parseContent(dm);
    expectTypeOf(parsed).toBeArray();
    expect(parsed[0]).toMatchObject({ contact: "DM" });
    const email = makePost("DM me");
    parsed = parseContent(email);
    expectTypeOf(parsed).toBeArray();
    expect(parsed[0]).toMatchObject({ contact: "DM" });
    const apply = makePost("DM me");
    parsed = parseContent(apply);
    expectTypeOf(parsed).toBeArray();
    expect(parsed[0]).toMatchObject({ contact: "DM" });
  });
});
