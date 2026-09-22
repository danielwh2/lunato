import { describe, expect, it } from "vitest";
import { pair } from "../src/diff";

const units = (s: string) => [...s].map((text) => ({ key: /\d/.test(text) ? "#" : text, text }));
/** Like the page reads it: spaces dropped, each letter tagged with its word. */
const sentence = (s: string) => s.split(" ").flatMap((w, word) => [...w].map((text) => ({ key: /\d/.test(text) ? "#" : text, text, word })));
/** The kept letters of `after`, read back as text: what holds still or glides. */
const kept = (before: string, after: string) => {
  const b = sentence(after);
  const keep = new Set(pair(sentence(before), b).map(([, j]) => j));
  return b.map((x, j) => (keep.has(j) ? x.text : "_")).join("");
};

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

  it("lines digits up on the decimal point, not the end of the text", () => {
    // 1.5 → 12.25: ones and tenths keep their slots; a tens digit and a hundredths digit arrive.
    expect(pair(units("1.5"), units("12.25"))).toEqual([[0, 1], [1, 2], [2, 3]]);
    expect(pair(units("12.25"), units("1.5"))).toEqual([[1, 0], [2, 1], [3, 2]]);
    // 9.9 → 10: the ones slot rolls 9 to 0, the point and the tenths leave, the tens arrive.
    expect(pair(units("9.9"), units("10"))).toEqual([[0, 1]]);
    expect(pair(units("10"), units("9.9"))).toEqual([[1, 0]]);
    // $0.5 → $1,000.75 around text: the dollar sign and the unit hold, ones and tenths keep their place.
    expect(pair(units("$0.5 kg"), units("$1,000.75 kg"))).toEqual([[0, 0], [1, 5], [2, 6], [3, 7], [4, 9], [5, 10], [6, 11]]);
  });

  it("keeps a nearby run of two or more, and ignores a lone shared letter", () => {
    expect(pair(units("xabq"), units("yyabz"))).toEqual([[1, 2], [2, 3]]);
    expect(pair(units("seven"), units("nine"))).toEqual([]);
  });

  it("keeps every unchanged word, however many edits sit between them", () => {
    // Three corrections: fox, over, the and dog hold; brown, jumps and lazy roll, keeping only the endings they share.
    expect(kept("the quick brown fox jumps over the lazy dog", "the quick red fox leaps over the sleepy dog")).toBe("thequick___fox___psoverthe_____ydog");
    // A caption correcting itself mid-sentence: only the misheard word moves, and its shared t and "sday" hold inside it.
    expect(kept("see you on tuesday at the cafe", "see you on thursday at the café")).toBe("seeyouont___sdayatthecaf_");
  });

  it("still counts numbers inside a sentence like an odometer", () => {
    expect(kept("2 of 9 done", "2 of 10 done")).toBe("2of_0done");
    expect(kept("costs $1.5 today", "costs $12.25 today")).toBe("costs$_2.2_today");
  });

  it("pairs nothing with an empty side", () => {
    expect(pair(units("abc"), [])).toEqual([]);
    expect(pair([], units("abc"))).toEqual([]);
  });
});
