import { describe, expect, it } from "vitest";
import { assign, isLineIcon, same, turnBetween } from "../src/lines";

type Seg = [number, number, number, number];
const C: [number, number] = [7, 7]; // centre of a 14 × 14 viewBox
const arrowRight: Seg[] = [[3, 7, 11, 7], [7, 3, 11, 7], [7, 11, 11, 7]];
const arrowDown: Seg[] = [[7, 3, 7, 11], [11, 7, 7, 11], [3, 7, 7, 11]];
const plus: Seg[] = [[7, 3, 7, 11], [3, 7, 11, 7], [7, 7, 7, 7]];
const r = 4 / Math.SQRT2;
const cross: Seg[] = [[7 - r, 7 - r, 7 + r, 7 + r], [7 + r, 7 - r, 7 - r, 7 + r]];
const menu: Seg[] = [[2.5, 4, 11.5, 4], [2.5, 7, 11.5, 7], [2.5, 10, 11.5, 10]];

describe("line icons", () => {
  it("recognises an svg of one to three lines with a viewBox, and nothing else", () => {
    const svg = (inner: string, box = ' viewBox="0 0 14 14"') => {
      const host = document.createElement("div");
      host.innerHTML = `<svg${box}>${inner}</svg>`;
      return host.firstElementChild!;
    };
    expect(isLineIcon(svg("<line/><line/>"))).toBe(true);
    expect(isLineIcon(svg("<line/><path/>"))).toBe(false);
    expect(isLineIcon(svg("<line/><line/><line/><line/>"))).toBe(false);
    expect(isLineIcon(svg("<line/>", ""))).toBe(false);
  });

  it("sees the same drawing whatever the line order or direction, and ignores collapsed padding", () => {
    expect(same([...arrowRight].reverse().map(([a, b, c, d]) => [c, d, a, b] as Seg), arrowRight, C)).toBe(true);
    expect(same([[3, 7, 11, 7], [7, 7, 7, 7]], [[3, 7, 11, 7]], C)).toBe(true);
    expect(same(menu, arrowRight, C)).toBe(false);
  });

  it("finds the turn between two icons of one shape, so they rotate instead of warping", () => {
    expect(turnBetween(arrowRight, arrowDown, C)).toBe(90);
    expect(turnBetween(arrowDown, arrowRight, C)).toBe(-90);
    expect(turnBetween(plus, cross, C)).toBe(45);
    expect(turnBetween(menu, arrowRight, C)).toBeUndefined();
  });

  it("sends each line to the partner nearest it, and pads a missing line into the centre", () => {
    const target = assign(menu, [[2.5, 10, 11.5, 10], [2.5, 4, 11.5, 4]], C);
    expect(target[0]).toEqual([2.5, 4, 11.5, 4]); // top stays top
    expect(target[2]).toEqual([2.5, 10, 11.5, 10]); // bottom stays bottom
    expect(target[1]).toEqual([7, 7, 7, 7]); // the middle collapses
  });
});

import { align, partner, type Outline } from "../src/lines";

/** A square outline of `n` sample steps (64 in the library), starting at a chosen corner and running either way. */
const SAMPLES = 64;
const square = (cx: number, cy: number, r: number, start = 0, backwards = false): Outline => {
  const corners: [number, number][] = [[cx - r, cy - r], [cx + r, cy - r], [cx + r, cy + r], [cx - r, cy + r]];
  const at = (t: number): [number, number] => {
    const side = Math.floor(t * 4) % 4;
    const f = t * 4 - Math.floor(t * 4);
    const [a, b] = [corners[side], corners[(side + 1) % 4]];
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
  };
  const ring = Array.from({ length: SAMPLES }, (_, i) => at((((backwards ? -i : i) + start + SAMPLES) % SAMPLES) / SAMPLES));
  return { points: [...ring, ring[0]], closed: true };
};

describe("outline icons", () => {
  it("starts a closed outline where its partner starts and runs it the same way, so nothing twists", () => {
    const a = square(9, 9, 6);
    const twisted = square(9, 9, 6, 20, true); // same square, begun elsewhere, drawn the other way round
    const lined = align(a, twisted);
    const drift = lined.reduce((s, p, i) => s + Math.hypot(p[0] - a.points[i][0], p[1] - a.points[i][1]), 0);
    expect(drift).toBeLessThan(1e-6);
  });

  it("pairs shapes by where they sit, and grows a missing one out of its own centre", () => {
    const left = square(4, 9, 2);
    const right = square(14, 9, 2);
    const trip = partner([right, left], [left]);
    const kept = trip.find((t) => t.shownFrom && t.shownTo)!;
    expect(kept.source).toBe(1); // the left shape goes to the left shape
    const gone = trip.find((t) => !t.shownTo)!;
    expect(gone.source).toBe(0);
    expect(gone.to.points.every(([x, y]) => Math.abs(x - 14) < 1e-6 && Math.abs(y - 9) < 1e-6)).toBe(true); // shrinks into its own centre
  });
});
