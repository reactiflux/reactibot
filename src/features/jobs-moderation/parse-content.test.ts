import { describe, expect, expectTypeOf, it } from "vitest";
import { parseContent } from "./parse-content";

describe("parseContent", () => {
  describe("tags", () => {
    it("basics", () => {
      let parsed = parseContent(
        "| Company | Job Title | Location | Compensation | Job Type |",
      );
      expectTypeOf(parsed).toBeArray();
      expect(parsed[0]).toMatchObject({
        tags: ["company", "jobtitle", "location", "compensation", "jobtype"],
      });

      // "for hire" standardization. All forms should end as "for hire".
      const validForHireTags = [
        "[for hire]",
        "[FOR HIRE]",
        "[FORHIRE]",
        "[forhire]",
        "for hire|",
        "|for hire|",
        "[f o r h i r e]",
        "|FoRhIrE|",
      ];
      validForHireTags.forEach((tag) => {
        const [parsed] = parseContent(tag);
        expect(parsed).toMatchObject({ tags: ["forhire"] });
      });
      parsed = parseContent("for hire");
      expect(parsed[0]).toMatchObject({ tags: [] });

      // "hiring" standardization. All forms should end as "for hire".
      const validHiringTags = [
        "[hiring]",
        "[HIRING]",
        "[hire]",
        "[HIRE]",
        "hiring|",
        "|h i r i n g|",
        "|HiRiNg|",
      ];
      validHiringTags.forEach((tag) => {
        const [parsed] = parseContent(tag);
        expect(parsed).toMatchObject({ tags: ["hiring"] });
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
  });
  it("isn’t tricked by empty lines", () => {
    const parsed = parseContent(`[hiring]
    
    
    `);
    expect(parsed[0]).toMatchObject({ tags: ["hiring"], description: "" });
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
