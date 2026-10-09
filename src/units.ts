import { isMorphable } from "./lines.js";

export type Kind = "char" | "icon";

/** One thing on screen that can be kept, moved or swapped: a grapheme or a child element. */
export type Unit = {
  key: string; // what the diff compares. Every digit shares "#", so a digit slot survives a change of value and rolls in place
  kind: Kind;
  word: number; // which word it belongs to, counted in reading order: the diff keeps unchanged words whole
  text: string; // the grapheme, or "" for an element
  node?: Element; // the element an icon unit clones
  html?: string; // that element's markup: an icon kept in its place has changed when this has
  rect: DOMRect; // where it is, in viewport pixels
};

// TypeScript's ES2020 lib predates Segmenter; without it a flag or a family emoji splits into parts.
const Segmenter = (
  Intl as typeof Intl & {
    Segmenter?: new (
      locale: undefined,
      options: { granularity: "grapheme" },
    ) => {
      segment(text: string): Iterable<{ segment: string; index: number }>;
    };
  }
).Segmenter;
const segmenter = Segmenter && new Segmenter(undefined, { granularity: "grapheme" });

/**
 * The text as graphemes with their UTF-16 offsets, whitespace left out: a space has nothing to draw and nothing to move.
 * `gap` marks a grapheme with whitespace before it, where a new word starts.
 */
export function graphemes(text: string): { segment: string; index: number; gap: boolean }[] {
  const all = segmenter
    ? [...segmenter.segment(text)]
    : Array.from(text).map((segment, i, parts) => ({
        segment,
        index: parts.slice(0, i).join("").length,
      }));
  return all
    .map((g, i) => ({ ...g, gap: i > 0 && !all[i - 1].segment.trim() }))
    .filter(({ segment }) => segment.trim());
}

export const kindOf = (segment: string): Kind =>
  /\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(segment) ? "icon" : "char";

// A visually hidden label (sr-only) is clipped to a 1px box. An element with text in it laid out under this both ways
// shows nothing, so nothing of it is drawn.
const HIDDEN_PX = 2;
const empty = (r: DOMRect) => !r.width && !r.height; // not rendered: display none, or inside something that is

/** Every unit inside `host` that is on screen, in reading order, skipping the overlay this library draws into. */
export function collect(host: Element, skip: Element): Unit[] {
  const units: Unit[] = [];
  const range = document.createRange();
  let word = 0;
  let open = false; // whether the current word has anything in it yet; whitespace at a node's edge splits words across nodes
  const split = () => {
    if (open) word++;
    open = false;
  };
  const walk = (parent: Node) => {
    for (const node of parent.childNodes) {
      if (node === skip) continue;
      if (node.nodeType === Node.TEXT_NODE) {
        const value = node.nodeValue ?? "";
        if (/^\s/.test(value)) split();
        for (const { segment, index, gap } of graphemes(value)) {
          range.setStart(node, index);
          range.setEnd(node, index + segment.length);
          const rect = range.getBoundingClientRect();
          if (empty(rect)) continue;
          if (gap && open) word++;
          open = true;
          units.push({
            key: /^\d$/.test(segment) ? "#" : segment,
            kind: kindOf(segment),
            word,
            text: segment,
            rect,
          });
        }
        if (/\s$/.test(value)) split();
      } else if (node instanceof Element) {
        if (node.localName === "br") {
          split(); // a line break is whitespace, not something to draw
          continue;
        }
        // An element with text in it is a wrapper (a framework's span, a <b>); one without is an icon. An svg is always
        // an icon: its <title> is a name, not text on the page.
        if (node.localName !== "svg" && node.textContent?.trim()) {
          const { offsetWidth, offsetHeight } = node as HTMLElement; // layout pixels, so a scale around it changes nothing
          if (offsetWidth + offsetHeight > 0 && offsetWidth < HIDDEN_PX && offsetHeight < HIDDEN_PX) continue;
          walk(node);
          continue;
        }
        const rect = node.getBoundingClientRect();
        if (empty(rect)) continue;
        // An icon is a word of its own, so "Copy" becoming a check and "Copied" keeps them apart.
        split();
        const html = node.outerHTML;
        units.push({
          // Morphable icons share one key, like digits: any of them can morph into any other in the same slot.
          key: isMorphable(node) ? "~icon" : (node.getAttribute("data-key") ?? html),
          kind: "icon",
          word,
          text: "",
          node,
          html,
          rect,
        });
        word++;
      }
    }
  };
  walk(host);
  return units;
}

const NUMBER = /(?:(?<!\w)-)?\d[\d,]*(?:\.\d+)?/g; // a minus only where no word or digit sits before it: 2024-01-01 is a date, not three numbers going negative
const numbers = (text: string) =>
  (text.match(NUMBER) ?? []).map((n) => parseFloat(n.replace(/,/g, "")));

/** 1 when the text reads as going up, -1 as going down. The first number that differs decides; anything else counts as up. */
export function trendOf(before: string, after: string): 1 | -1 {
  const a = numbers(before);
  const b = numbers(after);
  if (a.length !== b.length) return 1;
  const i = a.findIndex((n, k) => n !== b[k]);
  return i >= 0 && b[i] < a[i] ? -1 : 1;
}
