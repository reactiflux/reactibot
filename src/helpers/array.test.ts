import { describe, expect, it } from "vitest";
import { partition } from "./array.js";

describe("partition", () => {
  it("matches regular emoji", () => {
    expect(partition((x) => x > 4, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9])).toEqual([
      [5, 6, 7, 8, 9],
      [0, 1, 2, 3, 4],
    ]);
  });
});
