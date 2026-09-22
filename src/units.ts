import { isMorphable } from "./lines.js";

export type Kind = "char" | "icon";

/** One thing on screen that can be kept, moved or swapped: a grapheme or a child element. */
export type Unit = {
  key: string; // what the diff compares. Every digit shares "#", so a digit slot survives a change of value and rolls in place
  kind: Kind;
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

/** The text as graphemes with their UTF-16 offsets, whitespace left out: a space has nothing to draw and nothing to move. */
export function graphemes(text: string): { segment: string; index: number }[] {
  const all = segmenter
    ? [...segmenter.segment(text)]
    : Array.from(text).map((segment, i, parts) => ({ segment, index: parts.slice(0, i).join("").length }));
  return all.filter(({ segment }) => segment.trim());
}

export const kindOf = (segment: string): Kind =>
  /\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(segment) ? "icon" : "char";

/** Every unit inside `host`, in reading order, skipping the overlay this library draws into. */
export function collect(host: Element, skip: Element): Unit[] {
  const units: Unit[] = [];
  const range = document.createRange();
  const walk = (parent: Node) => {
    for (const node of parent.childNodes) {
      if (node === skip) continue;
      if (node.nodeType === Node.TEXT_NODE) {
        for (const { segment, index } of graphemes(node.nodeValue ?? "")) {
          range.setStart(node, index);
          range.setEnd(node, index + segment.length);
          units.push({ key: /^\d$/.test(segment) ? "#" : segment, kind: kindOf(segment), text: segment, rect: range.getBoundingClientRect() });
        }
      } else if (node instanceof Element) {
        // An element with text in it is a wrapper (a framework's span, a <b>); one without is an icon.
        if (node.textContent?.trim()) walk(node);
        // Morphable icons share one key, like digits: any of them can morph into any other in the same slot.
        else units.push({ key: isMorphable(node) ? "~icon" : node.getAttribute("data-key") ?? node.outerHTML, kind: "icon", text: "", node, rect: node.getBoundingClientRect() });
      }
    }
  };
  walk(host);
  return units;
}

const NUMBER = /-?\d[\d,]*(?:\.\d+)?/g;
const numbers = (text: string) => (text.match(NUMBER) ?? []).map((n) => parseFloat(n.replace(/,/g, "")));

/** 1 when the text reads as going up, -1 as going down. The first number that differs decides; anything else counts as up. */
export function trendOf(before: string, after: string): 1 | -1 {
  const a = numbers(before);
  const b = numbers(after);
  if (a.length !== b.length) return 1;
  const i = a.findIndex((n, k) => n !== b[k]);
  return i >= 0 && b[i] < a[i] ? -1 : 1;
}
