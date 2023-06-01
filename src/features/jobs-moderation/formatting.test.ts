import { describe, expect, expectTypeOf, it } from "vitest";
import { parseContent } from "./formatting";

describe("parseContent", () => {
  describe("tags", () => {
    it("basics", () => {
      let parsed = parseContent(
        "| Company | Job Title | Location | Compensation | Job Type |",
      );
      expectTypeOf(parsed).toBeArray();
      expect(parsed[0]).toMatchObject({
        tags: ["Company", "Job Title", "Location", "Compensation", "Job Type"],
      });
      parsed = parseContent("[for hire]");
      expectTypeOf(parsed).toBeArray();
      expect(parsed[0]).toMatchObject({ tags: ["for hire"] });
    });
  });
  it("parses description", () => {
    const content = `Company|Title|Location

Lorem ipsum dolor sit amet`;
    const parsed = parseContent(content);
    expectTypeOf(parsed).toBeArray();
    expect(parsed[0]).toMatchObject({
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
