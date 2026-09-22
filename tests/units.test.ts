import { describe, expect, it } from "vitest";
import { graphemes, kindOf, trendOf } from "../src/units";

describe("graphemes", () => {
  it("splits into what the eye sees, leaving spaces out", () => {
    expect(graphemes("a b").map((g) => g.segment)).toEqual(["a", "b"]);
    expect(graphemes("a b").map((g) => g.index)).toEqual([0, 2]);
  });

  it("keeps a flag and a family together, with UTF-16 offsets", () => {
    const parts = graphemes("🇬🇧x👨‍👩‍👧");
    expect(parts.map((g) => g.segment)).toEqual(["🇬🇧", "x", "👨‍👩‍👧"]);
    expect(parts.map((g) => g.index)).toEqual([0, 4, 5]);
  });
});

describe("kindOf", () => {
  it("tells pictures from letters", () => {
    expect(kindOf("❤️")).toBe("icon");
    expect(kindOf("🇬🇧")).toBe("icon");
    expect(kindOf("é")).toBe("char");
    expect(kindOf("7")).toBe("char");
  });
});

describe("trendOf", () => {
  it("reads the first number that changed", () => {
    expect(trendOf("£1,299.00", "£999.99")).toBe(-1);
    expect(trendOf("9", "10")).toBe(1);
    expect(trendOf("2 of 9", "2 of 3")).toBe(-1);
    expect(trendOf("1.5", "12.25")).toBe(1);
    expect(trendOf("-3", "-8")).toBe(-1);
    expect(trendOf("2024-01-01", "2024-01-02")).toBe(1); // hyphens in a date are not minus signs
  });

  it("counts words and a changed count of numbers as up", () => {
    expect(trendOf("Copy", "Copied")).toBe(1);
    expect(trendOf("Like", "❤️ 1")).toBe(1);
  });
});
