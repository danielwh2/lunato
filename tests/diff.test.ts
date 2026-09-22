import { describe, expect, it } from "vitest";
import { pair } from "../src/diff";

const units = (s: string) => [...s].map((text) => ({ key: /\d/.test(text) ? "#" : text, text }));

describe("pair", () => {
  it("keeps a shared start still: Copy into Copied keeps Cop", () => {
    expect(pair(units("Copy"), units("Copied"))).toEqual([[0, 0], [1, 1], [2, 2]]);
    expect(pair(units("Copied"), units("Copy"))).toEqual([[0, 0], [1, 1], [2, 2]]);
  });

  it("keeps a shared end, so a count gaining a digit keeps its unit", () => {
    expect(pair(units("3items"), units("12items"))).toEqual([[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6]]);
  });

  it("pairs digits by place value, from the right, like an odometer", () => {
    expect(pair(units("9"), units("10"))).toEqual([[0, 1]]);
    expect(pair(units("99"), units("100"))).toEqual([[0, 1], [1, 2]]);
    expect(pair(units("100"), units("99"))).toEqual([[1, 0], [2, 1]]);
    // £1,299.00 → £12,499.00: the pound sign holds, every slot keeps its place value, and the new ten-thousands digit arrives.
    expect(pair(units("£1,299.00"), units("£12,499.00"))).toEqual([[0, 0], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9]]);
  });

  it("keeps a nearby run of two or more, and ignores a lone shared letter", () => {
    expect(pair(units("xabq"), units("yyabz"))).toEqual([[1, 2], [2, 3]]);
    expect(pair(units("seven"), units("nine"))).toEqual([]);
  });

  it("pairs nothing with an empty side", () => {
    expect(pair(units("abc"), [])).toEqual([]);
    expect(pair([], units("abc"))).toEqual([]);
  });
});
