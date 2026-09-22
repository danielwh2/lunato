type Piece = { key: string; text: string; word?: number }; // no `word`: the whole text is one word
type Pair = [number, number];
type Slot = Piece & { from: number }; // `from` is the piece's index, or -1 for a placeholder that only lines numbers up

const MIN_RUN = 2; // one letter shared by two unrelated words ("seven" and "nine") is noise, not something to keep
const SLACK = 2; // a run may travel its own length plus this many places; further, and the glide reads as letters flying about

/**
 * Pairs of [old index, new index] for the units that survive a change, in order.
 *
 * Words first: every word the two texts share, in order, is kept whole, however many edits sit between them, so
 * a corrected caption only moves the words that changed. Then, inside each stretch between kept words, letters:
 * the shared start, the shared end, and at most one run of two or more that doesn't travel far. Everything else
 * rolls out and in, which reads calmer than single letters gliding across the word to find a partner.
 *
 * Digits pair by place value, like an odometer: the start stops at the first digit and the end, read from the
 * right, lets any digit pair with any digit. So 9 → 10 keeps the ones slot (it slides over and rolls 9 to 0) and
 * only the new tens digit arrives. Place value counts from the decimal point: the number with fewer decimals is
 * padded with placeholders first, so 1.5 → 12.25 keeps its tenths slot and 9.9 → 10 keeps its ones.
 */
export function pair(a: Piece[], b: Piece[]): Pair[] {
  const wa = words(a);
  const wb = words(b);
  const pairs: Pair[] = [];
  let i = 0;
  let j = 0;
  for (const [x, y] of common(wa.map((w) => w.key), wb.map((w) => w.key))) {
    pairs.push(...letters(a, b, i, wa[x].from, j, wb[y].from));
    for (let k = 0; k < wa[x].length; k++) pairs.push([wa[x].from + k, wb[y].from + k]);
    i = wa[x].from + wa[x].length;
    j = wb[y].from + wb[y].length;
  }
  pairs.push(...letters(a, b, i, a.length, j, b.length));
  return pairs;
}

/** Runs of pieces sharing a word, each with its key: its pieces' keys joined, so 9 and 10 differ but 2 and 3 match. */
function words(p: Piece[]) {
  const out: { key: string; from: number; length: number }[] = [];
  p.forEach((x, i) => {
    const last = out[out.length - 1];
    if (last && p[i - 1].word === x.word) {
      last.key += "\u0000" + x.key;
      last.length++;
    } else out.push({ key: x.key, from: i, length: 1 });
  });
  return out;
}

/**
 * The longest common subsequence of two lists, as index pairs in order.
 * ponytail: a full table, O(n × m); a caption or a paragraph is a few hundred words. Myers' diff if whole documents stream through.
 */
function common(a: string[], b: string[]): Pair[] {
  const table = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--) table[i][j] = a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
  const out: Pair[] = [];
  for (let i = 0, j = 0; i < a.length && j < b.length; ) {
    if (a[i] === b[j]) out.push([i++, j++]);
    else if (table[i + 1][j] >= table[i][j + 1]) i++;
    else j++;
  }
  return out;
}

/** The letter pairs between two kept words: pieces a[i0..i1) against b[j0..j1), in the texts' own indexes. */
function letters(a: Piece[], b: Piece[], i0: number, i1: number, j0: number, j1: number): Pair[] {
  const sa = a.slice(i0, i1);
  const sb = b.slice(j0, j1);
  const na = numbers(sa);
  const nb = numbers(sb);
  const pa = pad(sa, na, nb);
  const pb = pad(sb, nb, na);
  return match(pa, pb)
    .map(([i, j]): Pair => [pa[i].from, pb[j].from])
    .filter(([i, j]) => i >= 0 && j >= 0)
    .map(([i, j]): Pair => [i + i0, j + j0]);
}

/**
 * Where each number ends and how many digits follow its point, read from a one-character-per-piece copy of the text.
 * ponytail: "." is the decimal point and "," groups thousands; a comma-decimal locale (1,5) lines up from the end instead.
 */
function numbers(p: Piece[]) {
  const text = p.map((x) => (x.key === "#" ? "0" : x.text.length === 1 ? x.text : "x")).join("");
  return [...text.matchAll(/\d(?:[\d,]*\d)?(?:\.(\d+))?/g)].map((m) => ({ end: m.index! + m[0].length, decimals: m[1]?.length ?? 0 }));
}

/** The pieces with placeholders after any number that has fewer decimals than its counterpart, the k-th number in the other text. */
function pad(p: Piece[], mine: ReturnType<typeof numbers>, theirs: ReturnType<typeof numbers>): Slot[] {
  const after = new Map<number, Slot[]>();
  if (mine.length === theirs.length) {
    mine.forEach((n, k) => {
      const missing = theirs[k].decimals - n.decimals;
      if (missing <= 0) return;
      const point: Slot[] = n.decimals ? [] : [{ key: ".", text: "", from: -1 }];
      after.set(n.end, [...point, ...Array.from({ length: missing }, (): Slot => ({ key: "#", text: "", from: -1 }))]);
    });
  }
  const out: Slot[] = [];
  p.forEach((x, i) => out.push(...(after.get(i) ?? []), { ...x, from: i }));
  out.push(...(after.get(p.length) ?? []));
  return out;
}

function match(a: Piece[], b: Piece[]): Pair[] {
  const n = a.length;
  const m = b.length;
  let start = 0;
  while (start < n && start < m && a[start].key !== "#" && a[start].key === b[start].key) start++;
  let end = 0;
  while (end < n - start && end < m - start && a[n - 1 - end].key === b[m - 1 - end].key) end++;

  // The longest run the middles share, among those that earn their travel.
  let run = { length: 0, i: 0, j: 0 };
  for (let i = start; i < n - end; i++) {
    for (let j = start; j < m - end; j++) {
      let length = 0;
      while (i + length < n - end && j + length < m - end && a[i + length].key === b[j + length].key) length++;
      if (length >= MIN_RUN && length > run.length && Math.abs(j - i) <= length + SLACK) run = { length, i, j };
    }
  }

  const pairs: Pair[] = [];
  for (let k = 0; k < start; k++) pairs.push([k, k]);
  for (let k = 0; k < run.length; k++) pairs.push([run.i + k, run.j + k]);
  for (let k = end; k > 0; k--) pairs.push([n - k, m - k]);
  return pairs;
}
