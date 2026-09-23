"use client";

import { type CSSProperties, useRef, useState } from "react";
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
 * EffortTape: how hard the model thinks, picked on a ruler you drag sideways under a fixed mark, like a picker wheel
 * laid flat. Needs effort from the vault beside it.
 *
 * @example
 * <EffortTape value={effort} onChange={setEffort} />
 *
 * @param value - The id of the chosen level.
 * @param onChange - Called with the id of the level at the mark, as each passes it.
 * @param levels - The levels, lowest first, each with its label and colour. Defaults to EFFORTS; the last is Max.
 * @param atMax - What reaching Max does: the burst, the rainbow, a phone tap and your own onReach. See MaxFeedback.
 */
export function EffortTape({
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
  const [drag, setDrag] = useState<number | null>(null);
  const grip = useRef({ x: 0, from: 0, moved: false, trail: [] as { x: number; t: number }[] });
  const { at, last, pick, keys } = ladder(levels, value, onChange);
  const move = (x: number) => {
    const g = grip.current;
    let p = g.from - (x - g.x) / TICK;
    if (p < 0) p /= STRETCH;
    else if (p > last) p = last + (p - last) / STRETCH;
    if (Math.abs(x - g.x) > 3) g.moved = true;
    g.trail = [...g.trail.slice(-4), { x, t: performance.now() }];
    setDrag(p);
    pick(p);
  };
  return (
    <div
      {...meter(levels, at)}
      data-max={(at === last && atMax?.rainbow !== false) || undefined}
      data-dragging={drag !== null || undefined}
      onKeyDown={keys}
      style={{ "--c": levels[at].color, "--p": drag ?? at } as CSSProperties}
      className={`lunato-tape relative inline-flex h-7 select-none items-center gap-2 rounded-[12px] pr-2 text-[12px] font-medium outline-none transition-colors duration-150 [corner-shape:squircle] focus-visible:bg-neutral-100 ${className}`}
    >
      <span
        className="lunato-tape-window relative h-full w-[76px] flex-none touch-none overflow-hidden"
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          e.preventDefault();
          e.currentTarget.setPointerCapture(e.pointerId);
          (e.currentTarget.parentElement as HTMLElement).focus();
          grip.current = {
            x: e.clientX,
            from: at,
            moved: false,
            trail: [{ x: e.clientX, t: performance.now() }],
          };
        }}
        onPointerMove={(e) => e.currentTarget.hasPointerCapture(e.pointerId) && move(e.clientX)}
        onPointerUp={(e) => {
          if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
          const g = grip.current;
          if (!g.moved) {
            const box = e.currentTarget.getBoundingClientRect();
            pick(at + (e.clientX - (box.left + box.width / 2)) / TICK);
          } else {
            const [a, b] = [g.trail[0], g.trail[g.trail.length - 1]];
            const speed = (b.x - a.x) / Math.max(1, b.t - a.t);
            pick((drag ?? at) - (speed * GLIDE_MS) / TICK);
          }
          setDrag(null);
        }}
        onLostPointerCapture={() => setDrag(null)}
      >
        <span className="lunato-tape-strip absolute left-1/2 top-0 h-full">
          <svg
            aria-hidden
            width={last * TICK + 2}
            height="28"
            viewBox={`-1 0 ${last * TICK + 2} 28`}
            className="block"
          >
            {Array.from({ length: last * MINORS + 1 }, (_, i) => {
              const level = i % MINORS === 0 ? i / MINORS : -1;
              const x = (i * TICK) / MINORS;
              return level >= 0 ? (
                <line
                  key={i}
                  x1={x}
                  x2={x}
                  y1={9}
                  y2={19}
                  data-on={level <= at || undefined}
                  className="lunato-tape-level"
                />
              ) : (
                <line key={i} x1={x} x2={x} y1={12} y2={17} className="lunato-tape-minor" />
              );
            })}
          </svg>
        </span>
        <span aria-hidden className="lunato-tape-mark" />
      </span>
      <MaxBurst on={at === last} feedback={atMax} style={{ left: WINDOW / 2 }} />
      <EffortWord levels={levels} label={levels[at].label} />
    </div>
  );
}

const WINDOW = 76;
const TICK = 24;
const MINORS = 4;
const STRETCH = 3;
const GLIDE_MS = 140;
