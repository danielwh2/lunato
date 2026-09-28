import { describe, expect, it } from "vitest";
import { planRoll, type Word, wordsOf } from "../src/roll";
import { BUBBLE_MS, LAG_MS, WORD_STEP_MS } from "../src/tokens";

// A line of 10px-wide letters with one space between words, as the element would lay it out.
const line = (text: string) => {
  const units: { word: number; text: string; left: number }[] = [];
  let x = 0;
  text.split(" ").forEach((w, word) => {
    for (const ch of w) units.push({ word, text: ch, left: (x += 10) - 10 });
    x += 10;
  });
  return wordsOf(units, (u) => u.text, (i) => ({ left: units[i].left, right: units[i].left + 10, height: 20 }));
};
const nums = (value: string | number | null | undefined) => String(value).match(/-?[\d.]+/g)!.map(Number);
// Where a face's ink is at a keyframe, across: its centre moved by the translate, its width by the scale.
const extent = (w: Word, frame: Keyframe) => {
  const [dx] = nums(frame.translate);
  const [sx] = nums(frame.scale);
  const centre = (w.left + w.right) / 2 + dx;
  return [centre - ((w.right - w.left) * sx) / 2, centre + ((w.right - w.left) * sx) / 2];
};

describe("planRoll", () => {
  it("pairs words by position and keeps only those that read the same", () => {
    const a = line("Reading 4 sources");
    const b = line("Reading 9 sources");
    const roll = planRoll(a, b, 16);
    expect(roll.pairs.length).toBe("Reading".length + "sources".length);
    expect([...roll.leave.keys()]).toEqual(a[1].ids);
    expect([...roll.arrive.keys()]).toEqual(b[1].ids);
  });

  it("sets changed words off one after another, the new word a beat behind the old", () => {
    const b = line("Reading 6 sources");
    const roll = planRoll(line("Searching the web"), b, 16);
    const firstShown = (n: number) => {
      const face = roll.arrive.get(n)!;
      return face.frames.find((f) => (f.opacity as number) > 0)!.offset! * face.ms;
    };
    const starts = b.map((w) => firstShown(w.ids[0]));
    expect(starts[1] - starts[0]).toBeCloseTo(WORD_STEP_MS, -1);
    expect(starts[2] - starts[1]).toBeCloseTo(WORD_STEP_MS, -1);
    expect(starts[0]).toBeGreaterThan(BUBBLE_MS);
  });

  it("never draws a face past its slot, and no two faces that show ever overlap", () => {
    for (const [from, to] of [["Searching the web", "Reading 6 sources"], ["Reading 6 sources", "Thought for 8s"], ["Thought for 8s", "Thinking"], ["Thinking", "Searching the web"]]) {
      const a = line(from);
      const b = line(to);
      const roll = planRoll(a, b, 16);
      const faces = [...a.map((w) => [w, roll.leave.get(w.ids[0])] as const), ...b.map((w) => [w, roll.arrive.get(w.ids[0])] as const)].filter(([, f]) => f);
      // Sample every face at the same moments.
      for (let t = 0; t < 900; t += 1000 / 60) {
        const at = faces
          .map(([w, face]) => {
            const frame = [...face!.frames].reverse().find((f) => f.offset! * face!.ms <= t) ?? face!.frames[0];
            return { w, frame, shown: t <= face!.ms && (frame.opacity as number) > 0.02 };
          })
          .filter((f) => f.shown);
        for (let i = 0; i < at.length; i++)
          for (let j = i + 1; j < at.length; j++) {
            const [l1, r1] = extent(at[i].w, at[i].frame);
            const [l2, r2] = extent(at[j].w, at[j].frame);
            // A leaving word and its replacement share one slot, stacked: one rises away as the other rises in.
            const sameSlot = a.indexOf(at[i].w) >= 0 && b.indexOf(at[j].w) === a.indexOf(at[i].w);
            if (!sameSlot) expect(Math.min(r1, r2) - Math.max(l1, l2), `${from} → ${to} at ${t.toFixed(0)}ms`).toBeLessThanOrEqual(0.01);
          }
      }
    }
  });

  it("lands every arriving word at rest, and waits a moment to narrow a slot", () => {
    const roll = planRoll(line("Reading 12 sources"), line("Thinking"), 16);
    expect(roll.lag).toBe(LAG_MS);
    for (const face of roll.arrive.values())
      expect(face.frames.at(-1)).toEqual({ offset: 1, opacity: 1, translate: "0px 0px", rotate: "0deg", scale: "1 1", filter: "blur(0px)" });
    for (const face of roll.leave.values()) expect(face.frames.at(-1)!.opacity).toBe(0);
    expect(planRoll(line("Thinking"), line("Searching the web"), 16).lag).toBe(0); // growing: at once
  });

  it("calm keeps the roll and drops the play: whole words, own size, upright, never past their place", () => {
    const b = line("Reading 6 sources");
    const roll = planRoll(line("Searching the web"), b, 16, true);
    for (const [from, to] of [["Searching the web", "Reading 6 sources"], ["Reading 6 sources", "Thought for 8s"], ["Reading 12 sources", "Thinking"]]) {
      const calm = planRoll(line(from), line(to), 16, true);
      for (const face of [...calm.leave.values(), ...calm.arrive.values()])
        for (const frame of face.frames) {
          const [sx, sy] = nums(frame.scale);
          expect(sy).toBe(1);
          expect(frame.rotate).toBe("0deg");
          // Never squeezed while it shows: a slot holds for the word leaving it, and an arrival waits for its room.
          if ((frame.opacity as number) > 0.1) expect(sx, `${from} → ${to}`).toBeGreaterThanOrEqual(0.95);
        }
    }
    // It rises from below and never overshoots its place: the travel only ever shrinks.
    const ys = roll.arrive.get(b[0].ids[0])!.frames.map((f) => nums(f.translate)[1]);
    expect(ys[0]).toBeGreaterThan(0);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(0);
  });
});
