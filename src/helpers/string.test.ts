import { describe, expect, it } from "vitest";
import { countLines, extractEmoji } from "./string";

describe("extractEmoji", () => {
  it("matches regular emoji", () => {
    expect(extractEmoji("😄🙂👀🚀")).toEqual(["😄", "🙂", "👀", "🚀"]);
    expect(extractEmoji("🤷🌟📚")).toEqual(["🤷", "🌟", "📚"]);
    expect(extractEmoji("🐇🍈💕❤️")).toEqual(["🐇", "🍈", "💕", "❤"]);
    // Because of limitaitons of compound emoji, this is close enough
    expect(extractEmoji("👩‍👩‍👦‍👦")).toEqual(["👩", "👩", "👦", "👦"]);
    expect(extractEmoji("👩‍❤️‍👩")).toEqual(["👩", "❤", "👩"]);
  });
  it("matches unusual unicode characters", () => {
    expect(extractEmoji("♌☄⚥")).toEqual(["♌", "☄", "⚥"]);
    expect(extractEmoji("┠╿╋╂")).toEqual(["┠", "╿", "╋", "╂"]);
  });
  it("doesn’t match international characters", () => {
    expect(extractEmoji("מחרוזת בדיקה ומה לא")).toEqual([]);
    expect(extractEmoji("Тестовий рядок і таке інше")).toEqual([]);
    expect(extractEmoji("テスト文字列など")).toEqual([]);
    expect(extractEmoji("测试字符串等等")).toEqual([]);
    expect(extractEmoji("테스트 문자열 및 기타")).toEqual([]);
    expect(extractEmoji("Chuỗi kiểm tra và không có gì")).toEqual([]);
  });
  it("doesn’t match funky invisible Unicode characters", () => {
    // eslint-disable-next-line no-irregular-whitespace
    expect(extractEmoji(`    `)).toEqual([]);
  });
});

describe("countLines", () => {
  it("counts lines", () => {
    expect(countLines("")).toEqual(0);
    expect(countLines("\n\ntest\nstuff\n\n\n\n\nyo\nhello")).toEqual(9);
    expect(countLines("\n\ntest\nstuff\n\n\n\n\nyo\nhello".trim())).toEqual(7);
  });
});
