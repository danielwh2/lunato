import { isMorphable } from "./lines.js";

export type Kind = "char" | "icon";

/** One thing on screen that can be kept, moved or swapped: a grapheme or a child element. */
export type Unit = {
  key: string; // what the diff compares. Every digit shares "#", so a digit slot survives a change of value and rolls in place
  kind: Kind;
  word: number; // which word it belongs to, counted in reading order: the diff keeps unchanged words whole
  text: string; // the grapheme, or "" for an element
  node?: Element; // the element an icon unit clones
  rect: DOMRect; // where it is, in viewport pixels
};

// TypeScript's ES2020 lib predates Segmenter; without it a flag or a family emoji splits into parts.
const Segmenter = (Intl as typeof Intl & {
  Segmenter?: new (locale: undefined, options: { granularity: "grapheme" }) => {
    segment(text: string): Iterable<{ segment: string; index: number }>;
  };
}).Segmenter;
const segmenter = Segmenter && new Segmenter(undefined, { granularity: "grapheme" });

/**
 * The text as graphemes with their UTF-16 offsets, whitespace left out: a space has nothing to draw and nothing to move.
 * `gap` marks a grapheme with whitespace before it, where a new word starts.
 */
export function graphemes(text: string): { segment: string; index: number; gap: boolean }[] {
  const all = segmenter
    ? [...segmenter.segment(text)]
    : Array.from(text).map((segment, i, parts) => ({ segment, index: parts.slice(0, i).join("").length }));
  return all
    .map((g, i) => ({ ...g, gap: i > 0 && !all[i - 1].segment.trim() }))
    .filter(({ segment }) => segment.trim());
}

export const kindOf = (segment: string): Kind =>
  /\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(segment) ? "icon" : "char";

/** Every unit inside `host`, in reading order, skipping the overlay this library draws into. */
export function collect(host: Element, skip: Element): Unit[] {
  const units: Unit[] = [];
  const range = document.createRange();
  let word = 0;
  let open = false; // whether the current word has anything in it yet; whitespace at a node's edge splits words across nodes
  const walk = (parent: Node) => {
    for (const node of parent.childNodes) {
      if (node === skip) continue;
      if (node.nodeType === Node.TEXT_NODE) {
        const value = node.nodeValue ?? "";
        const split = () => {
          if (open) word++;
          open = false;
        };
        if (/^\s/.test(value)) split();
        for (const { segment, index, gap } of graphemes(value)) {
          if (gap && open) word++;
          open = true;
          range.setStart(node, index);
          range.setEnd(node, index + segment.length);
          units.push({ key: /^\d$/.test(segment) ? "#" : segment, kind: kindOf(segment), word, text: segment, rect: range.getBoundingClientRect() });
        }
        if (/\s$/.test(value)) split();
      } else if (node instanceof Element) {
        // An element with text in it is a wrapper (a framework's span, a <b>); one without is an icon.
        if (node.textContent?.trim()) walk(node);
        // Morphable icons share one key, like digits: any of them can morph into any other in the same slot.
        else {
          // An icon is a word of its own, so "Copy" becoming a check and "Copied" keeps them apart.
          if (open) word++;
          units.push({ key: isMorphable(node) ? "~icon" : node.getAttribute("data-key") ?? node.outerHTML, kind: "icon", word, text: "", node, rect: node.getBoundingClientRect() });
          word++;
          open = false;
        }
      }
    }
  };
  walk(host);
  return units;
}

const NUMBER = /(?:(?<!\w)-)?\d[\d,]*(?:\.\d+)?/g; // a minus only where no word or digit sits before it: 2024-01-01 is a date, not three numbers going negative
const numbers = (text: string) => (text.match(NUMBER) ?? []).map((n) => parseFloat(n.replace(/,/g, "")));

/** 1 when the text reads as going up, -1 as going down. The first number that differs decides; anything else counts as up. */
export function trendOf(before: string, after: string): 1 | -1 {
  const a = numbers(before);
  const b = numbers(after);
  if (a.length !== b.length) return 1;
  const i = a.findIndex((n, k) => n !== b[k]);
  return i >= 0 && b[i] < a[i] ? -1 : 1;
}
