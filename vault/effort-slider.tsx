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
 * EffortSlider: how hard the model thinks, picked by dragging a dot along a short track with a stop for each level.
 * Needs effort from the vault beside it.
 *
 * @example
 * <EffortSlider value={effort} onChange={setEffort} />
 *
 * @param value - The id of the chosen level.
 * @param onChange - Called with the id of the level the dot is on, as it crosses each stop.
 * @param levels - The levels, lowest first, each with its label and colour. Defaults to EFFORTS; the last is Max.
 * @param atMax - What reaching Max does: the burst, the rainbow, a phone tap and your own onReach. See MaxFeedback.
 */
export function EffortSlider({
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
  const grab = useRef(0);
  const { at, last, pick, keys } = ladder(levels, value, onChange);
  const along = (track: HTMLElement, x: number) => {
    const box = track.getBoundingClientRect();
    return Math.max(0, Math.min(1, (x - grab.current - box.left) / box.width));
  };
  const follow = (track: HTMLElement, x: number) => {
    const to = along(track, x);
    setDrag(to);
    pick(to * last);
  };
  return (
    <div
      {...meter(levels, at)}
      data-max={(at === last && atMax?.rainbow !== false) || undefined}
      data-dragging={drag !== null || undefined}
      onKeyDown={keys}
      style={
        {
          "--c": levels[at].color,
          "--pos": drag ?? at / Math.max(1, last),
          "--n": levels.length,
        } as CSSProperties
      }
      className={`lunato-slider inline-flex h-7 touch-none select-none items-center gap-2.5 rounded-[12px] px-2 text-[12px] font-medium outline-none transition-colors duration-150 [corner-shape:squircle] focus-visible:bg-neutral-100 ${className}`}
    >
      <span
        className="lunato-slider-track relative flex h-full w-16 flex-none cursor-pointer items-center"
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          e.preventDefault();
          const knob = (e.target as Element).closest(".lunato-slider-knob");
          const box = knob?.getBoundingClientRect();
          grab.current = box ? e.clientX - (box.left + box.width / 2) : 0;
          e.currentTarget.setPointerCapture(e.pointerId);
          (e.currentTarget.parentElement as HTMLElement).focus();
          follow(e.currentTarget, e.clientX);
        }}
        onPointerMove={(e) =>
          e.currentTarget.hasPointerCapture(e.pointerId) && follow(e.currentTarget, e.clientX)
        }
        onLostPointerCapture={() => setDrag(null)}
      >
        <span aria-hidden className="absolute inset-x-0 h-0.5 rounded-full bg-neutral-200" />
        <span aria-hidden className="lunato-slider-fill absolute left-0 h-0.5 rounded-full" />
        {levels.map((l, i) => (
          <i
            key={l.id}
            aria-hidden
            className="lunato-slider-stop"
            data-on={i <= at || undefined}
            style={{ left: `${(i / Math.max(1, last)) * 100}%`, "--i": i } as CSSProperties}
          />
        ))}
        <span aria-hidden className="lunato-slider-knob" />
        <MaxBurst on={at === last} feedback={atMax} style={{ left: "100%" }} />
      </span>
      <EffortWord levels={levels} label={levels[at].label} />
    </div>
  );
}
