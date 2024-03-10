import { describe, expect, test } from "vitest";
import { extractSearchKey, getReactDocsSearchKey } from "./react-docs";

describe("React documentation command", () => {
  test.each([
    ["Hello world, please look into !docs useState Hello", "react/useState"],
    ["!docs react/useState", "react/useState"],
    ["Foo !docs react/useState bar", "react/useState"],
    ["!react-docs react/useState", "react/useState"],
    ["Foo bar, !react-docs , useState", undefined],
    [
      "Hello world, check react dom docs, !docs createPortal hello",
      "react-dom/createPortal",
    ],
    ["!docs react-dom/createPortal", "react-dom/createPortal"],
  ])(`should match the command in the message`, (message, expected) => {
    const search = extractSearchKey(message);
    const searchKey = getReactDocsSearchKey(search);

    expect(searchKey).toBe(expected);
  });
});
