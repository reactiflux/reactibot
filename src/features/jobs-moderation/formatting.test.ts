import { describe, expect, expectTypeOf, it } from "vitest";
import { parseContent } from "./formatting";

describe("parseContent", () => {
  it("parses tags", () => {
    const content = `| Company | Job Title | Location | Compensation | Job Type  |`;
    const parsed = parseContent(content);
    expectTypeOf(parsed).toBeArray();
    expect(parsed[0]).toEqual({
      contact: "",
      description: "",
      tags: ["Company", "Job Title", "Location", "Compensation", "Job Type"],
    });
  });
  it("parses description", () => {
    const content = `|

Lorem ipsum dolor sit amet`;
    const parsed = parseContent(content);
    expectTypeOf(parsed).toBeArray();
    expect(parsed[0]).toEqual({
      contact: "",
      description: "Lorem ipsum dolor sit amet",
      tags: [],
    });
  });
  it("parses contact", () => {
    const makePost = (contact: string) => `|

Lorem ipsum dolor sit amet

${contact}`;
    const dm = makePost("DM me");
    let parsed = parseContent(dm);
    expectTypeOf(parsed).toBeArray();
    expect(parsed[0]).toEqual({
      contact: "DM",
      description: "Lorem ipsum dolor sit amet",
      tags: [],
    });
    const email = makePost("DM me");
    parsed = parseContent(email);
    expectTypeOf(parsed).toBeArray();
    expect(parsed[0]).toEqual({
      contact: "DM",
      description: "Lorem ipsum dolor sit amet",
      tags: [],
    });
    const apply = makePost("DM me");
    parsed = parseContent(apply);
    expectTypeOf(parsed).toBeArray();
    expect(parsed[0]).toEqual({
      contact: "DM",
      description: "Lorem ipsum dolor sit amet",
      tags: [],
    });
  });
});
