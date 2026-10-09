"use client";

import { morphChanges } from "lunato";
import { FULL, short, usage } from "./tokens";

/**
 * TokenRing: how much of the model's context a chat has used, as a small ring that fills clockwise and a percentage
 * whose digits roll. Needs tokens from the vault beside it.
 *
 * @example
 * <TokenRing used={usage.totalTokens} limit={200_000} />
 *
 * @param used - Tokens used so far. Nought until the first count arrives.
 * @param limit - The model's context window.
 */
export function TokenRing({
  used = 0,
  limit,
  className = "",
}: {
  used?: number;
  limit: number;
  className?: string;
}) {
  const { share, meter } = usage(used, limit);
  const percent = Math.round(share * 100);
  return (
    <span
      {...meter}
      aria-valuetext={`${percent}% of the context used`}
      title={`${short(used)} of ${short(limit)} tokens`}
      className={`inline-flex items-center gap-1.5 whitespace-nowrap text-[11px] font-medium tabular-nums text-neutral-500 ${className}`}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        strokeWidth="1.75"
        aria-hidden
        className="-rotate-90"
      >
        <circle cx="7" cy="7" r="5.5" className="stroke-neutral-200" />
        <circle
          cx="7"
          cy="7"
          r="5.5"
          pathLength={100}
          strokeLinecap="round"
          style={{ strokeDasharray: `${share * 100} 100`, opacity: share > 0 ? 1 : 0 }}
          className={`transition-[stroke-dasharray,stroke] duration-500 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none ${share >= FULL ? "stroke-red-600" : "stroke-neutral-900"}`}
        />
      </svg>
      <span ref={morphChanges}>{percent}%</span>
    </span>
  );
}
