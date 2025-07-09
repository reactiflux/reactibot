import { describe, it, expect, beforeEach, vi } from "vitest";
import { messageDuplicateChecker } from "./duplicate-scanner";
import { User } from "discord.js";
import { fromPartial } from "@total-typescript/shoehorn";
import { duplicateCache } from "./duplicate-scanner";

const maxMessagesPerUser = 5;
const maxCacheSize = 100;
const maxTrivialCharacters = 10;
// Mock dependencies
const mockBot = {
  channels: {
    fetch: vi.fn().mockResolvedValue({
      type: "GUILD_TEXT",
      send: vi.fn().mockResolvedValue({
        delete: vi.fn().mockResolvedValue(undefined),
      }),
    }),
  },
};
const mockMessage = (content: string, authorId: string, isBot = false) => {
  return {
    content,
    author: { id: authorId, bot: isBot } as User,
    delete: vi.fn(),
    channel: {
      send: vi.fn().mockResolvedValue({
        delete: vi.fn().mockResolvedValue(undefined),
      }),
    },
  };
};
describe("Duplicate Scanner Tests", () => {
  beforeEach(() => {
    // Reset the cache before each test
    duplicateCache.clear();
  });
  it(`should not store messages less than ${maxTrivialCharacters} characters`, async () => {
    const msg = mockMessage("Help me", "user1");
    const bot = mockBot;
    messageDuplicateChecker.handleMessage?.(fromPartial({ msg, bot }));
    const userMessages = duplicateCache.get("user1");
    expect(userMessages).toBeUndefined();
  });

  it("should store messages correctly in the cache", async () => {
    const msg = mockMessage("Hello world", "user1");
    const bot = mockBot;

    messageDuplicateChecker.handleMessage?.(fromPartial({ msg, bot }));

    const userMessages = duplicateCache.get("user1");
    expect(userMessages).toBeDefined();
    expect(userMessages?.has("hello world")).toBe(true);
  });

  it(`should enforce max size of ${maxMessagesPerUser} messages per user`, async () => {
    const bot = mockBot;
    for (let i = 1; i <= maxMessagesPerUser; i++) {
      const msg = mockMessage(`Message to delete ${i}`, "user1");
      await messageDuplicateChecker.handleMessage?.(fromPartial({ msg, bot }));
    }

    const userMessages = duplicateCache.get("user1");
    expect(userMessages).toBeDefined();
    expect(userMessages?.size).toBe(maxMessagesPerUser);

    const msg = mockMessage("New Message", "user1");
    await messageDuplicateChecker.handleMessage?.(fromPartial({ msg, bot }));

    expect(userMessages?.size).toBe(maxMessagesPerUser);
    expect(userMessages?.has("message 1")).toBe(false); // First message should be removed
    expect(userMessages?.has("new message")).toBe(true); // New message should be added
  });

  it(`should enforce max size of ${maxCacheSize} users in the cache`, async () => {
    const bot = mockBot;

    for (let i = 1; i <= maxCacheSize; i++) {
      const msg = mockMessage("Hello world", `user${i}`);
      await messageDuplicateChecker.handleMessage?.(fromPartial({ msg, bot }));
    }

    expect(duplicateCache.size).toBe(maxCacheSize);

    const msg = mockMessage("Hello world", "user101");
    await messageDuplicateChecker.handleMessage?.(fromPartial({ msg, bot }));

    expect(duplicateCache.size).toBe(maxCacheSize);
    expect(duplicateCache.has("user1")).toBe(false);
    expect(duplicateCache.has("user101")).toBe(true);
  });
});
