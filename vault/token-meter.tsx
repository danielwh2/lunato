"use client";

import { morphChanges } from "lunato";
import { FULL, short, usage } from "./tokens";

/**
 * TokenMeter: how much of the model's context a chat has used, as a short bar and a count whose digits roll. Needs
 * tokens from the vault beside it.
 *
 * @example
 * <TokenMeter used={usage.totalTokens} limit={200_000} />
 *
 * @param used - Tokens used so far. Nought until the first count arrives.
 * @param limit - The model's context window.
 */
export function TokenMeter({
  used = 0,
  limit,
  className = "",
}: {
  used?: number;
  limit: number;
  className?: string;
}) {
  const { share, meter } = usage(used, limit);
  return (
    <span
      {...meter}
      aria-valuetext={`${short(used)} of ${short(limit)} tokens used`}
      className={`inline-flex items-center gap-2 whitespace-nowrap text-[11px] font-medium tabular-nums text-neutral-500 ${className}`}
    >
      <span className="relative h-0.5 w-10 overflow-hidden rounded-full bg-neutral-200">
        <span
          className={`absolute inset-0 origin-left rounded-full transition-[scale,background-color] duration-500 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none ${share >= FULL ? "bg-red-600" : "bg-neutral-900"}`}
          style={{ scale: `${share} 1` }}
        />
      </span>
      <span ref={morphChanges}>
        {short(used)} / {short(limit)}
      </span>
    </span>
  );
}
