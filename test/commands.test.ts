import { describe, it, expect } from "vitest";
import { shouldTriggerCommand } from "../src/features/commands.js";

describe("shouldTriggerCommand", () => {
  describe("Basic command detection", () => {
    it("should trigger for exact command match", () => {
      expect(shouldTriggerCommand("!commands", "!commands")).toBe(true);
    });

    it("should trigger for command at start of message", () => {
      expect(shouldTriggerCommand("!commands me please", "!commands")).toBe(
        true,
      );
    });

    it("should trigger for command at end of message", () => {
      expect(
        shouldTriggerCommand("Please show me !commands", "!commands"),
      ).toBe(true);
    });

    it("should trigger for command in middle of message", () => {
      expect(
        shouldTriggerCommand("Can you !commands me with this?", "!commands"),
      ).toBe(true);
    });

    it("should be case insensitive", () => {
      expect(shouldTriggerCommand("!COMMANDS", "!commands")).toBe(true);
      expect(shouldTriggerCommand("!Commands", "!commands")).toBe(true);
      expect(shouldTriggerCommand("!commands", "!COMMANDS")).toBe(true);
    });
  });

  describe("Word boundary detection", () => {
    it("should not trigger for partial matches", () => {
      expect(shouldTriggerCommand("helping", "docs")).toBe(false);
      expect(shouldTriggerCommand("!docsful", "!docs")).toBe(false);
      expect(shouldTriggerCommand("undocsful", "docs")).toBe(false);
    });

    it("should trigger with word boundaries", () => {
      expect(shouldTriggerCommand("docs me", "docs")).toBe(true);
      expect(shouldTriggerCommand("need docs now", "docs")).toBe(true);
      expect(shouldTriggerCommand("docs!", "docs")).toBe(true);
      expect(shouldTriggerCommand("docs?", "docs")).toBe(true);
      expect(shouldTriggerCommand("docs.", "docs")).toBe(true);
    });

    it("should handle punctuation correctly", () => {
      expect(shouldTriggerCommand("!docs!", "!docs")).toBe(true);
      expect(shouldTriggerCommand("!docs?", "!docs")).toBe(true);
      expect(shouldTriggerCommand("!docs.", "!docs")).toBe(true);
      expect(shouldTriggerCommand("(!docs)", "!docs")).toBe(true);
      expect(shouldTriggerCommand("[!docs]", "!docs")).toBe(true);
      expect(shouldTriggerCommand("{!docs}", "!docs")).toBe(true);
    });
  });

  describe("Single backtick code blocks (inline)", () => {
    it("should NOT trigger inside single backticks", () => {
      expect(shouldTriggerCommand("`!docs`", "!docs")).toBe(false);
      expect(shouldTriggerCommand("Use `!docs` command", "!docs")).toBe(false);
      expect(shouldTriggerCommand("Try `!docs` or `!commands`", "!docs")).toBe(
        false,
      );
    });

    it("should trigger outside single backticks", () => {
      expect(shouldTriggerCommand("`code` !docs", "!docs")).toBe(true);
      expect(shouldTriggerCommand("!docs `code`", "!docs")).toBe(true);
      expect(shouldTriggerCommand("`code` !docs `more code`", "!docs")).toBe(
        true,
      );
    });

    it("should handle multiple inline code blocks correctly", () => {
      expect(shouldTriggerCommand("`code1` `code2` !docs", "!docs")).toBe(true);
      expect(shouldTriggerCommand("`!other` text !docs", "!docs")).toBe(true);
      expect(shouldTriggerCommand("`!docs` and `!commands`", "!docs")).toBe(
        false,
      );
    });

    it("should handle unmatched single backticks", () => {
      expect(shouldTriggerCommand("`unclosed !docs", "!docs")).toBe(false);
      expect(shouldTriggerCommand("unclosed` !docs", "!docs")).toBe(false);
      expect(shouldTriggerCommand("`!docs unclosed", "!docs")).toBe(false);
    });
  });

  describe("Triple backtick code blocks (multiline)", () => {
    it("should NOT trigger inside triple backticks", () => {
      expect(shouldTriggerCommand("```\n!docs\n```", "!docs")).toBe(false);
      expect(shouldTriggerCommand("```js\n!docs\n```", "!docs")).toBe(false);
      expect(shouldTriggerCommand("```\n!docs me\n```", "!docs")).toBe(false);
    });

    it("should trigger outside triple backticks", () => {
      expect(shouldTriggerCommand("```\ncode\n``` !docs", "!docs")).toBe(true);
      expect(shouldTriggerCommand("!docs ```\ncode\n```", "!docs")).toBe(true);
      expect(
        shouldTriggerCommand("```\ncode\n``` !docs ```\nmore\n```", "!docs"),
      ).toBe(true);
    });

    it("should handle language specifiers", () => {
      expect(shouldTriggerCommand("```javascript\n!docs\n```", "!docs")).toBe(
        false,
      );
      expect(shouldTriggerCommand("```typescript\n!docs\n```", "!docs")).toBe(
        false,
      );
      expect(shouldTriggerCommand("```python\n!docs\n```", "!docs")).toBe(
        false,
      );
    });

    it("should handle unmatched triple backticks", () => {
      expect(shouldTriggerCommand("```\n!docs", "!docs")).toBe(false);
      expect(shouldTriggerCommand("!docs\n```", "!docs")).toBe(true);
      expect(shouldTriggerCommand("```\n!docs\n``", "!docs")).toBe(false);
    });
  });

  describe("Mixed code block scenarios", () => {
    it("should handle both single and triple backticks correctly", () => {
      expect(
        shouldTriggerCommand("```\ncode\n``` `inline` !docs", "!docs"),
      ).toBe(true);
      expect(
        shouldTriggerCommand("```\n!docs\n``` `also !docs`", "!docs"),
      ).toBe(false);
      expect(
        shouldTriggerCommand("`inline !docs` ```\nblock\n```", "!docs"),
      ).toBe(false);
    });

    it("should handle nested-like scenarios", () => {
      expect(shouldTriggerCommand("```\n`!docs`\n```", "!docs")).toBe(false);
      expect(shouldTriggerCommand("`code ```\n!docs\n```", "!docs")).toBe(
        false,
      );
    });

    it("should handle multiple code blocks with commands between", () => {
      expect(
        shouldTriggerCommand("```\ncode1\n``` !docs ```\ncode2\n```", "!docs"),
      ).toBe(true);
      expect(shouldTriggerCommand("`code1` !docs `code2`", "!docs")).toBe(true);
    });
  });

  describe("Edge cases with whitespace and newlines", () => {
    it("should handle commands with surrounding whitespace", () => {
      expect(shouldTriggerCommand("  !docs  ", "!docs")).toBe(true);
      expect(shouldTriggerCommand("\n!docs\n", "!docs")).toBe(true);
      expect(shouldTriggerCommand("\t!docs\t", "!docs")).toBe(true);
    });

    it("should handle multiline messages", () => {
      expect(shouldTriggerCommand("line1\n!docs\nline3", "!docs")).toBe(true);
      expect(
        shouldTriggerCommand("```\nline1\n!docs\nline3\n```", "!docs"),
      ).toBe(false);
    });

    it("should handle mixed whitespace in code blocks", () => {
      expect(shouldTriggerCommand("``` \n !docs \n ```", "!docs")).toBe(false);
      expect(shouldTriggerCommand("`  !docs  `", "!docs")).toBe(false);
    });
  });

  describe("Complex real-world scenarios", () => {
    it("should handle typical Discord message with code", () => {
      const message = `Here's my code:
\`\`\`javascript
function test() {
  // !docs this doesn't work
  console.log("!commands");
}
\`\`\`
Can someone !ask me with this?`;
      expect(shouldTriggerCommand(message, "!ask")).toBe(true);
      expect(shouldTriggerCommand(message, "!docs")).toBe(false);
      expect(shouldTriggerCommand(message, "!commands")).toBe(false);
    });

    it("should handle inline code with explanation", () => {
      const message = `Try using \`!docs\` command or check the !commands`;
      expect(shouldTriggerCommand(message, "!docs")).toBe(false);
      expect(shouldTriggerCommand(message, "!commands")).toBe(true);
    });

    it("should handle long messages with multiple code blocks", () => {
      const message = `
First, try this:
\`\`\`js
// Don't use !ask here
console.log("test");
\`\`\`

Then check \`!commands\` list.

Finally, use !docs if needed.

\`\`\`
// Another block with !mdn
\`\`\`
`;
      expect(shouldTriggerCommand(message, "!docs")).toBe(true);
      expect(shouldTriggerCommand(message, "!commands")).toBe(false);
      expect(shouldTriggerCommand(message, "!ask")).toBe(false);
      expect(shouldTriggerCommand(message, "!mdn")).toBe(false);
    });

    it("should handle escaped backticks", () => {
      expect(shouldTriggerCommand("\\`!docs\\`", "!docs")).toBe(true);
      expect(shouldTriggerCommand("\\`\\`\\`\n!docs\n\\`\\`\\`", "!docs")).toBe(
        true,
      );
    });
  });

  describe("Performance edge cases", () => {
    it("should handle very long messages", () => {
      const longText = "a".repeat(10000);
      const message = `${longText} !docs ${longText}`;
      expect(shouldTriggerCommand(message, "!docs")).toBe(true);
    });

    it("should handle messages with many code blocks", () => {
      let message = "";
      for (let i = 0; i < 100; i++) {
        message += `\`code${i}\` `;
      }
      message += "!docs";
      expect(shouldTriggerCommand(message, "!docs")).toBe(true);
    });

    it("should handle large code blocks", () => {
      const largeCode = 'console.log("test");\n'.repeat(1000);
      const message = `\`\`\`js\n${largeCode}!docs\n\`\`\``;
      expect(shouldTriggerCommand(message, "!docs")).toBe(false);
    });
  });

  describe("Special characters and Unicode", () => {
    it("should handle Unicode characters", () => {
      expect(shouldTriggerCommand("🚀 !docs 🎉", "!docs")).toBe(true);
      expect(shouldTriggerCommand("`🚀 !docs 🎉`", "!docs")).toBe(false);
    });

    it("should handle special regex characters in command", () => {
      expect(shouldTriggerCommand("Use !test.+ command", "!test.+")).toBe(true);
      expect(shouldTriggerCommand("Use !test* command", "!test*")).toBe(true);
      expect(shouldTriggerCommand("Use !test? command", "!test?")).toBe(true);
    });

    it("should handle empty strings", () => {
      expect(shouldTriggerCommand("", "!docs")).toBe(false);
      expect(shouldTriggerCommand("!docs", "")).toBe(false);
      expect(shouldTriggerCommand("", "")).toBe(false);
    });
  });

  describe("Actual command examples from codebase", () => {
    it("should work with real command examples", () => {
      expect(shouldTriggerCommand("!commands", "!commands")).toBe(true);
      expect(shouldTriggerCommand("!conduct", "!conduct")).toBe(true);
      expect(shouldTriggerCommand("!mdn Array.prototype.map", "!mdn")).toBe(
        true,
      );
      expect(shouldTriggerCommand("!react-docs useState", "!react-docs")).toBe(
        true,
      );
      expect(shouldTriggerCommand("!docs useState", "!docs")).toBe(true);
      expect(shouldTriggerCommand("!ask", "!ask")).toBe(true);
      expect(shouldTriggerCommand("!code", "!code")).toBe(true);
      expect(shouldTriggerCommand("!gist", "!gist")).toBe(true);
      expect(shouldTriggerCommand("!xy", "!xy")).toBe(true);
    });

    it("should not trigger for commands in code examples", () => {
      const codeExample = `\`\`\`javascript
// Don't actually run !commands here
console.log("Use !ask for assistance");
\`\`\``;
      expect(shouldTriggerCommand(codeExample, "!commands")).toBe(false);
      expect(shouldTriggerCommand(codeExample, "!ask")).toBe(false);
    });
  });

  // Add this new describe block to your existing test file
  describe("Two-pointer backtick removal algorithm", () => {
    it("should handle nested backticks correctly", () => {
      expect(shouldTriggerCommand("```\n`!docs`\n```", "!docs")).toBe(false);
      expect(shouldTriggerCommand("`code ```\n!docs\n```", "!docs")).toBe(
        false,
      );
    });

    it("should handle multiple separate code blocks efficiently", () => {
      expect(
        shouldTriggerCommand("`code1` !docs `code2` !ask `code3`", "!docs"),
      ).toBe(true);
      expect(
        shouldTriggerCommand("`code1` !docs `code2` !ask `code3`", "!ask"),
      ).toBe(true);
      expect(
        shouldTriggerCommand(
          "```\nblock1\n``` !docs ```\nblock2\n``` !ask",
          "!docs",
        ),
      ).toBe(true);
    });

    it("should handle alternating backticks like palindrome logic", () => {
      expect(shouldTriggerCommand("`outer```inner```outer`", "!docs")).toBe(
        false,
      ); // No command, but tests the algorithm
      expect(shouldTriggerCommand("```outer`inner`outer```", "!docs")).toBe(
        false,
      ); // No command, but tests the algorithm
      expect(shouldTriggerCommand("`!docs```!ask```!help`", "!docs")).toBe(
        false,
      );
      expect(shouldTriggerCommand("`!docs```!ask```!help`", "!ask")).toBe(
        false,
      );
    });

    it("should efficiently process large content with many backticks", () => {
      let content = "";
      for (let i = 0; i < 50; i++) {
        content += `\`code${i}\` `;
      }
      content += "!docs ";
      for (let i = 50; i < 100; i++) {
        content += `\`\`\`\nblock${i}\n\`\`\` `;
      }

      expect(shouldTriggerCommand(content, "!docs")).toBe(true);
    });
  });

  describe("Interaction with Discord-specific syntax", () => {
    it("should trigger when next to a user mention", () => {
      expect(
        shouldTriggerCommand("hey <@123456789012345678>, use !docs", "!docs"),
      ).toBe(true);
      expect(shouldTriggerCommand("!docs <@123456789012345678>", "!docs")).toBe(
        true,
      );
    });

    it("should not trigger if inside a mention-like text", () => {
      // This is an unlikely edge case, but good for completeness
      expect(shouldTriggerCommand("some text<!docs>", "!docs")).toBe(false);
    });
  });

  describe("Commands within other text structures", () => {
    it("should NOT trigger when the command word is part of a URL", () => {
      expect(
        shouldTriggerCommand(
          "Check out https://example.com/!docs/guide",
          "!docs",
        ),
      ).toBe(false);
      expect(
        shouldTriggerCommand("Another link:https://somedocs.com", "docs"),
      ).toBe(false);
    });
  });

  describe("Commands with adjacent non-alphanumeric characters", () => {
    it("should trigger when immediately followed by an emoji", () => {
      expect(shouldTriggerCommand("!docs🚀", "!docs")).toBe(true);
      expect(shouldTriggerCommand("Can I get !help🙏", "!help")).toBe(true);
    });
  });

  describe("Commands with adjacent non-alphanumeric characters", () => {
    it("should trigger when immediately followed by an emoji", () => {
      expect(shouldTriggerCommand("!docs🚀", "!docs")).toBe(true);
      expect(shouldTriggerCommand("Can I get !help🙏", "!help")).toBe(true);
    });
  });
});
