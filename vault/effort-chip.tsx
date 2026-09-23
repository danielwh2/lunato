"use client";

import { morphChanges } from "lunato";
import type { CSSProperties } from "react";
import { type Effort, EFFORTS, ladder, MaxBurst, type MaxFeedback } from "./effort";
import "lunato/vault.css";

/**
 * EffortChip: effort as one quiet chip that sits beside a model chip, a 3×3 dot glyph filling as the effort rises. A
 * press steps up, from Max back round to the lowest; Shift+press steps down. Needs effort from the vault beside it.
 *
 * @example
 * <EffortChip value={effort} onChange={setEffort} />
 *
 * @param value - The id of the chosen level.
 * @param onChange - Called with the id of the next level.
 * @param levels - The levels, lowest first, each with a label, a colour and an optional hint (a budget, a time).
 *   Defaults to EFFORTS; the last is Max.
 * @param atMax - What reaching Max does: the burst, the rainbow, a phone tap and your own onReach. See MaxFeedback.
 */
export function EffortChip({
  value,
  onChange,
  levels = EFFORTS,
  atMax,
  className = "",
}: {
  value: string;
  onChange: (id: string) => void;
  levels?: Effort[];
  atMax?: MaxFeedback;
  className?: string;
}) {
  const { at, last, pick, keys } = ladder(levels, value, onChange);
  const level = levels[at];
  const lit = 1 + 2 * Math.round((at / Math.max(1, last)) * 4);
  return (
    <button
      type="button"
      aria-label={`Effort: ${level.label}${level.hint ? `, ${level.hint}` : ""}. Press for more`}
      data-max={(at === last && atMax?.rainbow !== false) || undefined}
      onClick={(e) => pick(e.shiftKey ? at - 1 : at === last ? 0 : at + 1)}
      onKeyDown={keys}
      style={{ "--c": level.color } as CSSProperties}
      className={`lunato-chip inline-flex h-7 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-[12px] border border-neutral-200 bg-transparent pl-2 pr-2.5 text-[11px] font-medium leading-none text-neutral-900 transition-colors duration-150 [corner-shape:squircle] hover:border-neutral-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-400 ${className}`}
    >
      <span aria-hidden className="relative grid grid-cols-3 gap-[2px]">
        {SLOTS.map((slot) => (
          <i
            key={slot}
            className="lunato-chip-dot"
            data-lit={FILL.indexOf(slot) < lit || undefined}
            style={{ "--rank": FILL.indexOf(slot), "--k": slot } as CSSProperties}
          />
        ))}
        <MaxBurst on={at === last} feedback={atMax} />
      </span>
      <span ref={morphChanges}>{level.label}</span>
      {level.hint && (
        <span ref={morphChanges} className="tabular-nums text-neutral-400">
          {level.hint}
        </span>
      )}
      <span className="sr-only" aria-live="polite">
        {level.label}
      </span>
    </button>
  );
}

const SLOTS = [0, 1, 2, 3, 4, 5, 6, 7, 8];
const FILL = [4, 2, 6, 0, 8, 3, 5, 1, 7];
