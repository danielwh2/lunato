/**
 * tokens: what the token meters share.
 *
 * The share of the context window used, the meter role and values it reports, and the short form of a count.
 */

export const FULL = 0.9;

/** 12.5K, 1.2M: a count the way a person reads it. */
export const short = (n: number) => COMPACT.format(n);

const COMPACT = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

/** How much of the window is used, 0 to 1 (empty while the limit is still unknown), and the meter attributes but its text. */
export function usage(used: number, limit: number) {
  const share = limit > 0 ? Math.min(1, Math.max(0, used / limit)) : 0;
  const meter = {
    role: "meter" as const,
    "aria-label": "Context used",
    "aria-valuemin": 0,
    "aria-valuemax": limit,
    "aria-valuenow": Math.min(Math.max(0, used), limit),
  };
  return { share, meter };
}
