import { describe, it, expect, vi, beforeEach } from "vitest";
import { Message, TextChannel, ChannelType, GuildMember } from "discord.js";
import { commandsList, shouldProcessCommand } from "../src/features/commands";
import { Collection } from "discord.js";

const mockMessage = {
  content: "",
  channel: {
    type: ChannelType.GuildText,
    send: vi.fn(),
  },
  guild: {
    channels: {
      cache: {
        get: vi.fn(),
      },
    },
    roles: {
      everyone: {},
    },
  },
  author: {
    id: "123456789",
  },
  mentions: {
    users: {
      first: vi.fn().mockReturnValue({ id: "123456789" }),
    },
    members: new Map(),
  },
  reply: vi.fn(),
} as unknown as Message;

const mockTextChannel = {
  type: ChannelType.GuildText,
  send: vi.fn(),
  permissionOverwrites: {
    create: vi.fn(),
  },
  guild: {
    roles: {
      everyone: {},
    },
  },
} as unknown as TextChannel;

const fetchMsg = {
  delete: vi.fn(),
  edit: vi.fn(),
};

describe("Discord Bot Commands", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMessage.channel.send = vi.fn().mockResolvedValue(fetchMsg);
    if (mockMessage.guild) {
      mockMessage.guild.channels.cache.get = vi
        .fn()
        .mockReturnValue(mockTextChannel);
    }
    (mockMessage as { member: GuildMember }).member = {
      roles: {
        cache: new Collection([["staff", { name: "staff" }]]),
        some: vi.fn().mockReturnValue(true),
      },
    } as unknown as GuildMember;
  });

  it("should handle !mdn command", async () => {
    mockMessage.content = "!mdn Array.prototype.map";
    await commandsList
      .find((cmd) => cmd.words.includes("!mdn"))
      ?.handleMessage(mockMessage);
    expect(mockMessage.channel.send).toHaveBeenCalled();
  });

  // Edge case tests for commands inside code blocks
  it("should ignore commands inside single backticks", () => {
    mockMessage.content = "`!mdn Array.prototype.map`";
    expect(shouldProcessCommand(mockMessage.content, "!mdn")).toBe(false);
  });

  it("should ignore commands inside triple backticks", () => {
    mockMessage.content = "```\n!mdn Array.prototype.map\n```";
    expect(shouldProcessCommand(mockMessage.content, "!mdn")).toBe(false);
  });

  it("should ignore commands inside nested backticks", () => {
    mockMessage.content =
      "```js\nconsole.log(`!mdn Array.prototype.map`);\n```";
    expect(shouldProcessCommand(mockMessage.content, "!mdn")).toBe(false);
  });

  it("should process commands outside code blocks", () => {
    mockMessage.content = "Hello, !mdn Array.prototype.map";
    expect(shouldProcessCommand(mockMessage.content, "!mdn")).toBe(true);
  });

  // Additional tests for other commands
  it("should handle !auth command", async () => {
    mockMessage.content = "!auth";
    await commandsList
      .find((cmd) => cmd.words.includes("!auth"))
      ?.handleMessage(mockMessage);
    expect(mockMessage.channel.send).toHaveBeenCalled();
  });

  it("should handle !react-docs command", async () => {
    mockMessage.content = "!react-docs useState";
    await commandsList
      .find((cmd) => cmd.words.includes("!react-docs"))
      ?.handleMessage(mockMessage);
    expect(mockMessage.channel.send).toHaveBeenCalled();
  });

  it("should handle !ping command", async () => {
    mockMessage.content = "!ping";
    await commandsList
      .find((cmd) => cmd.words.includes("!ping"))
      ?.handleMessage(mockMessage);
    expect(mockMessage.channel.send).toHaveBeenCalled();
  });

  // Edge case: Command inside deeply nested triple backticks (should NOT process)
  it("should ignore command inside deeply nested triple backticks", () => {
    mockMessage.content =
      "```\nSome random text\n```js\nconsole.log('!mdn Array.prototype.map');\n```\nMore text outside";

    expect(shouldProcessCommand(mockMessage.content, "!mdn")).toBe(false);
  });

  // Edge case: Command inside multiple levels of markdown blocks (should NOT process)
  it("should ignore command inside multiple markdown blocks", () => {
    mockMessage.content =
      "```\nCode block starts\n```\n```\nHere is another block with\n!mdn Array.prototype.map\n```\nOutside the block now.";

    expect(shouldProcessCommand(mockMessage.content, "!mdn")).toBe(false);
  });

  // Edge case: Command buried inside a long, deeply nested code block (should NOT process)
  it("should ignore command inside a long deeply nested code block", () => {
    mockMessage.content =
      "```\nSome setup information\n```\n```\nfunction test() {\n  console.log('Nested block start');\n  ```\n  Here is a deeply nested code block\n  !mdn Array.prototype.map\n  ```\n  console.log('Nested block end');\n}\n```";

    expect(shouldProcessCommand(mockMessage.content, "!mdn")).toBe(false);
  });

  // Edge case: Command inside mixed markdown and inline code blocks (should NOT process)
  it("should ignore command inside mixed markdown and inline code", () => {
    mockMessage.content =
      "```\nfunction example() {\n  return `Hello, world! ${'!mdn Array.prototype.map'}`;\n}\n```";

    expect(shouldProcessCommand(mockMessage.content, "!mdn")).toBe(false);
  });

  // Edge case: Command inside nested markdown inside block quotes (should NOT process)
  it("should ignore command inside nested markdown inside block quotes", () => {
    mockMessage.content =
      "> Here is a block quote\n>\n>```\nconst x = '!mdn Array.prototype.map';\nconsole.log(x);\n```";

    expect(shouldProcessCommand(mockMessage.content, "!mdn")).toBe(false);
  });

  // Edge case: Command inside multiple backtick styles in the same message (should NOT process)
  it("should ignore command when multiple backtick styles exist in the same message", () => {
    mockMessage.content =
      "`Inline command test: !mdn Array.prototype.map`\n```\nconsole.log('Multi-line block test');\n```";

    expect(shouldProcessCommand(mockMessage.content, "!mdn")).toBe(false);
  });

  // Edge case: Command inside deeply nested backticks mixed with text outside (should process only the correct one)
  it("should process command outside deeply nested backticks but ignore the inside one", () => {
    mockMessage.content =
      "Hey everyone, I need help with JavaScript! ```js\nfunction test() {\n  console.log('!mdn Array.prototype.map');\n}\n``` But I still need info on !mdn Object.keys.";

    expect(shouldProcessCommand(mockMessage.content, "!mdn")).toBe(true); // The one outside should be processed.
    expect(
      shouldProcessCommand(
        "```js\nconsole.log('!mdn Array.prototype.map');\n```",
        "!mdn",
      ),
    ).toBe(false); // Inside should be ignored.
  });

  // Edge case: Command buried inside multiple levels of text and markdown (should NOT process)
  it("should ignore command inside multi-level text and markdown blocks", () => {
    mockMessage.content =
      "This is a message with multiple levels:\n" +
      "```\nStart of first block\n```\n" +
      "```\nAnother block\n```js\nconsole.log('!mdn Array.prototype.map');\n```";

    expect(shouldProcessCommand(mockMessage.content, "!mdn")).toBe(false);
  });

  // Edge case: Command inside a massive block of markdown text (should NOT process)
  it("should ignore command inside a huge markdown block", () => {
    mockMessage.content =
      "```\n" +
      "This is a massive block\n".repeat(50) +
      "\n!mdn Array.prototype.map\n```";

    expect(shouldProcessCommand(mockMessage.content, "!mdn")).toBe(false);
  });

  // Edge case: Command inside a comment-like markdown section (should NOT process)
  it("should ignore command inside a comment-like markdown block", () => {
    mockMessage.content =
      "```\n# This is a comment block\n# !mdn Array.prototype.map should not be processed\n```";

    expect(shouldProcessCommand(mockMessage.content, "!mdn")).toBe(false);
  });

  // Edge case: Command buried in a long message
  it("should process command even when buried in a long message", () => {
    mockMessage.content =
      "Hey everyone, I was just wondering if someone could help me understand something about JavaScript. " +
      "I came across a method called Array.prototype.map and wanted to learn more about it. " +
      "I tried searching on MDN but wasn't sure how to use it. Can someone please explain? Also, !mdn Array.prototype.map";

    expect(shouldProcessCommand(mockMessage.content, "!mdn")).toBe(true);
  });

  // Edge case: Command surrounded by special characters and numbers
  it("should process command with random characters around it", () => {
    mockMessage.content = "###!!123!mdn Array.prototype.map@@@$$$";
    expect(shouldProcessCommand(mockMessage.content, "!mdn")).toBe(true);
  });

  // Edge case: Multiple commands in a single message
  it("should process multiple commands in a message", () => {
    mockMessage.content =
      "!mdn Array.prototype.map and then maybe later !mdn Object.keys";
    expect(shouldProcessCommand(mockMessage.content, "!mdn")).toBe(true);
  });

  // Edge case: Command split across multiple lines
  it("should process command even when split across lines", () => {
    mockMessage.content = "!mdn\nArray.prototype.map";
    expect(shouldProcessCommand(mockMessage.content, "!mdn")).toBe(true);
  });

  // Edge case: Command inside an embedded link (should NOT process)
  it("should ignore command if inside an embedded link", () => {
    mockMessage.content =
      "[Click here for !mdn Array.prototype.map](https://example.com)";
    expect(shouldProcessCommand(mockMessage.content, "!mdn")).toBe(false);
  });

  // Edge case: Command appearing multiple times in a message (should still be processed)
  it("should process command even when repeated multiple times", () => {
    mockMessage.content =
      "!mdn Array.prototype.map !mdn Object.keys !mdn String.prototype.split";
    expect(shouldProcessCommand(mockMessage.content, "!mdn")).toBe(true);
  });

  // Edge case: Command inside a deeply nested code block (should NOT process)
  it("should ignore command inside nested code blocks", () => {
    mockMessage.content =
      "```\nHere is some code:\n```js\nconsole.log('!mdn Array.prototype.map');\n```";
    expect(shouldProcessCommand(mockMessage.content, "!mdn")).toBe(false);
  });

  // Edge case: Command with excessive whitespace and new lines
  it("should process command even with excessive spaces and new lines", () => {
    mockMessage.content = "\n   \t  !mdn     Array.prototype.map   \n \t ";
    expect(shouldProcessCommand(mockMessage.content, "!mdn")).toBe(true);
  });

  // Edge case: Command mentioned in a quote (should NOT process)
  it("should ignore command if it's part of a quoted message", () => {
    mockMessage.content = `> Someone said: "!mdn Array.prototype.map is useful"`;
    expect(shouldProcessCommand(mockMessage.content, "!mdn")).toBe(false);
  });

  // Edge case: Command hidden in escaped characters
  it("should ignore command if surrounded by escaped backticks", () => {
    mockMessage.content = "\\`!mdn Array.prototype.map\\`"; // Escaped backticks should not trigger the command
    expect(shouldProcessCommand(mockMessage.content, "!mdn")).toBe(false);
  });

  // Edge case: Multiple different commands in a long message
  it("should process multiple different commands in a long message", () => {
    mockMessage.content =
      "Hey team, just a quick update on the project. " +
      "I was going through the documentation and needed help with JavaScript methods. " +
      "!mdn Array.prototype.map is something I want to understand better. " +
      "Also, I came across React hooks, so I checked !react-docs useState. " +
      "If anyone has good resources, please share. Thanks!";

    expect(shouldProcessCommand(mockMessage.content, "!mdn")).toBe(true);
    expect(shouldProcessCommand(mockMessage.content, "!react-docs")).toBe(true);
  });

  // Edge case: multiple spaces
  it("should process command with multiple spaces", () => {
    mockMessage.content = "!mdn    Array.prototype.map";
    expect(shouldProcessCommand(mockMessage.content, "!mdn")).toBe(true);
  });

  // Edge case: command inside two backticks (invalid code block)
  it("should process command inside two backticks", () => {
    mockMessage.content = "`` !mdn Array.prototype.map ``";
    expect(shouldProcessCommand(mockMessage.content, "!mdn")).toBe(true);
  });

  // Edge case: command wrapped in parentheses
  it("should process command inside special characters", () => {
    mockMessage.content = "!mdn (Array.prototype.map)";
    expect(shouldProcessCommand(mockMessage.content, "!mdn")).toBe(true);
  });

  // Edge case: command written in uppercase
  it("should process command in uppercase", () => {
    mockMessage.content = "!MDN Array.prototype.map";
    expect(shouldProcessCommand(mockMessage.content, "!mdn")).toBe(true); // Case-insensitive
  });

  // Edge case: command partially inside a code block
  it("should ignore command if part is inside a code block", () => {
    mockMessage.content =
      "```js\nconsole.log('!mdn Array.prototype.map');\n``` !mdn Array.prototype.map";
    expect(shouldProcessCommand(mockMessage.content, "!mdn")).toBe(true); // Only process the second one
  });
});
