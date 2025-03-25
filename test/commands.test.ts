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
});
