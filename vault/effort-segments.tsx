"use client";

import { type CSSProperties, useState } from "react";
import {
  type Effort,
  EFFORTS,
  EffortWord,
  ladder,
  MaxBurst,
  type MaxFeedback,
  meter,
} from "./effort";
import "lunato/vault.css";

/**
 * EffortSegments: how hard the model thinks, as a row of segments in a tray with a raised thumb that springs to the
 * chosen one. Needs effort from the vault beside it.
 *
 * @example
 * <EffortSegments value={effort} onChange={setEffort} />
 *
 * @param value - The id of the chosen level.
 * @param onChange - Called with the id of the segment picked, as a drag crosses each.
 * @param levels - The levels, lowest first, each with its label and colour. Defaults to EFFORTS; the last is Max.
 * @param atMax - What reaching Max does: the burst, the rainbow, a phone tap and your own onReach. See MaxFeedback.
 */
export function EffortSegments({
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
  const [held, setHeld] = useState(false);
  const { at, last, pick, keys } = ladder(levels, value, onChange);
  const under = (tray: HTMLElement, x: number) =>
    Math.floor((x - tray.getBoundingClientRect().left - PAD) / CELL);
  if (!levels.length) return null;
  return (
    <div
      {...meter(levels, at)}
      data-max={(at === last && atMax?.rainbow !== false) || undefined}
      data-held={held || undefined}
      onKeyDown={keys}
      style={{ "--c": levels[at].color, "--at": at } as CSSProperties}
      className={`lunato-segments inline-flex h-7 select-none items-center gap-2 rounded-[12px] pl-0.5 pr-2 text-[12px] font-medium outline-hidden transition-colors duration-150 [corner-shape:squircle] focus-visible:bg-neutral-100 ${className}`}
    >
      <span
        className="lunato-segments-tray relative flex flex-none cursor-pointer touch-none"
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          e.preventDefault();
          e.currentTarget.setPointerCapture(e.pointerId);
          (e.currentTarget.parentElement as HTMLElement).focus();
          setHeld(true);
          pick(under(e.currentTarget, e.clientX));
        }}
        onPointerMove={(e) =>
          e.currentTarget.hasPointerCapture(e.pointerId) && pick(under(e.currentTarget, e.clientX))
        }
        onLostPointerCapture={() => setHeld(false)}
      >
        <span aria-hidden className="lunato-segments-thumb" />
        {levels.map((l, i) => (
          <span key={l.id} aria-hidden className="lunato-segments-cell">
            <i data-on={i <= at || undefined} style={{ height: MARK + i * STEP }} />
            {i === last && <MaxBurst on={at === last} feedback={atMax} />}
          </span>
        ))}
      </span>
      <EffortWord levels={levels} label={levels[at].label} />
    </div>
  );
}

const PAD = 2;
const CELL = 16;
const MARK = 4;
const STEP = 2;
