"use client";

import { morphChanges } from "lunato";
import type { CSSProperties } from "react";
import { FULL, short, usage } from "./tokens";
import "lunato/vault.css";

/**
 * TokenCells: how much of the model's context is left, as a row of ten cells that light up as it fills and a count of
 * what remains, whose digits roll. Needs tokens from the vault beside it.
 *
 * @example
 * <TokenCells used={usage.totalTokens} limit={200_000}
 *   live={status === "streaming"} />
 *
 * @param used - Tokens used so far. Nought until the first count arrives.
 * @param limit - The model's context window.
 * @param live - True while tokens are still arriving: the lit cells carry a glint.
 */
export function TokenCells({
  used = 0,
  limit,
  live = false,
  className = "",
}: {
  used?: number;
  limit: number;
  live?: boolean;
  className?: string;
}) {
  const { share, meter } = usage(used, limit);
  const lit = Math.ceil(share * CELLS);
  const left = short(Math.max(0, limit - used));
  return (
    <span
      {...meter}
      aria-valuetext={`${left} tokens left`}
      className={`inline-flex items-center gap-2 whitespace-nowrap text-[11px] font-medium tabular-nums text-neutral-500 ${className}`}
    >
      <span aria-hidden className="flex h-2.5 gap-0.5">
        {Array.from({ length: CELLS }, (_, i) => (
          <span
            key={i}
            style={{ "--i": i } as CSSProperties}
            className={`w-[3px] rounded-[1px] transition-colors duration-300 motion-reduce:transition-none ${i < lit ? `${share >= FULL ? "bg-red-600" : "bg-neutral-900"} ${live ? "lunato-cell-live" : ""}` : "bg-neutral-200"}`}
          />
        ))}
      </span>
      <span ref={morphChanges}>{left} left</span>
    </span>
  );
}

const CELLS = 10;
