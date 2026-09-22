type Piece = { key: string; text: string };
type Pair = [number, number];

const MIN_RUN = 2; // one letter shared by two unrelated words ("seven" and "nine") is noise, not something to keep
const SLACK = 2; // a run may travel its own length plus this many places; further, and the glide reads as letters flying about

/**
 * Pairs of [old index, new index] for the units that survive a change, in order.
 * The shared start, the shared end, and between them at most one run of two or more
 * that doesn't travel far. Everything else rolls out and in, which reads calmer than
 * single letters gliding across the word to find a partner.
 *
 * Digits pair by place value, like an odometer: the start stops at the first digit and
 * the end, read from the right, lets any digit pair with any digit. So 9 → 10 keeps the
 * ones slot (it slides over and rolls 9 to 0) and only the new tens digit arrives.
 */
export function pair(a: Piece[], b: Piece[]): Pair[] {
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
