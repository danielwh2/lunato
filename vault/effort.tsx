"use client";

import { morphChanges } from "lunato";
import { type CSSProperties, type KeyboardEvent, useEffect, useRef, useState } from "react";
import "lunato/vault.css";

/**
 * effort: what the effort meters share.
 *
 * The ladder of levels, where a meter is on it, the word beside it, and the burst on reaching Max.
 */

export type Effort = { id: string; label: string; color: string; hint?: string };

/** The reasoning ladder on a purple ramp, each level with the thinking budget it buys. */
export const EFFORTS: Effort[] = [
  { id: "low", label: "Low", color: "#e2a3ea", hint: "2k" },
  { id: "medium", label: "Medium", color: "#d97fe4", hint: "8k" },
  { id: "high", label: "High", color: "#cd55dc", hint: "16k" },
  { id: "xhigh", label: "X-High", color: "#b937cb", hint: "32k" },
  { id: "max", label: "Max", color: "#9c1fae", hint: "64k" },
];

/**
 * Where a meter is on its ladder and how it moves. `found` is the index of `value`, -1 when it is not a level; `at` is
 * that or the first level; `pick` sets a level by index, rounded and clamped; `keys` moves it with the arrows, Home
 * and End.
 */
export function ladder(levels: Effort[], value: string, onChange: (id: string) => void) {
  const found = levels.findIndex((l) => l.id === value);
  const at = Math.max(0, found);
  const last = levels.length - 1;
  const pick = (i: number) => {
    const to = Math.max(0, Math.min(last, Math.round(i)));
    if (to !== found) onChange(levels[to].id);
  };
  const keys = (e: KeyboardEvent) => {
    const to = (
      {
        ArrowRight: at + 1,
        ArrowUp: at + 1,
        ArrowLeft: at - 1,
        ArrowDown: at - 1,
        Home: 0,
        End: last,
      } as Record<string, number>
    )[e.key];
    if (to === undefined) return;
    e.preventDefault();
    pick(to);
  };
  return { found, at, last, pick, keys };
}

/** The slider role and values a meter reports. */
export const meter = (levels: Effort[], at: number) => ({
  role: "slider" as const,
  tabIndex: 0,
  "aria-label": "Effort",
  "aria-valuemin": 0,
  "aria-valuemax": levels.length - 1,
  "aria-valuenow": at,
  "aria-valuetext": levels[at].label,
});

/** The level's name, morphing name to name, in a cell as wide as the widest, so a change never moves what follows. */
export function EffortWord({ levels, label }: { levels: Effort[]; label: string }) {
  return (
    <span aria-hidden className="grid">
      {levels.map((l) => (
        <span key={l.id} className="invisible [grid-area:1/1]">
          {l.label}
        </span>
      ))}
      <span ref={morphChanges} data-lunato="roll" className="lunato-effort-word [grid-area:1/1]">
        {label}
      </span>
    </span>
  );
}

/**
 * What reaching Max does. Each part is on by default.
 *
 * burst - "sparks", a ring and eight sparks; "ring", the ring alone; or false.
 * rainbow - Whether the meter runs once through the rainbow.
 * tap - A light tap on a phone that can give one.
 * onReach - Your own feedback, such as a sound or a toast.
 */
export type MaxFeedback = {
  burst?: "sparks" | "ring" | false;
  rainbow?: boolean;
  tap?: boolean;
  onReach?: () => void;
};

/**
 * MaxBurst: the moment an effort meter reaches Max. Put it inside the positioned part that marks the level. It fires
 * only on the way in, never on the first render or before someone has pressed or typed on the page, so a meter that
 * opens at Max stays quiet.
 *
 * @example
 * <span className="relative">{knob}<MaxBurst on={level === "max"} feedback={{ burst: "ring", onReach: chime }} /></span>
 *
 * @param on - True while the meter is at Max.
 * @param feedback - What reaching Max does; see MaxFeedback.
 * @param style - Where the burst centres in its container, if not the middle: left and top.
 */
export function MaxBurst({
  on,
  feedback,
  style,
}: {
  on: boolean;
  feedback?: MaxFeedback;
  style?: CSSProperties;
}) {
  const { burst = "sparks", tap = true, onReach } = feedback ?? {};
  const [bursts, setBursts] = useState(0);
  const was = useRef(on);
  useEffect(() => {
    if (on && !was.current && (navigator.userActivation?.hasBeenActive ?? true)) {
      if (burst) setBursts((n) => n + 1);
      if (tap) navigator.vibrate?.(TAP_MS);
      onReach?.();
    }
    was.current = on;
  }, [on, burst, tap, onReach]);
  if (!bursts || !burst) return null;
  return (
    <span key={bursts} aria-hidden className="lunato-burst" style={style}>
      {burst === "sparks" &&
        SPARKS.map(({ x, y, color }) => (
          <i
            key={`${x},${y}`}
            style={{ "--x": `${x}px`, "--y": `${y}px`, background: color } as CSSProperties}
          />
        ))}
    </span>
  );
}

const TAP_MS = 12;
const RAINBOW = ["#e11d48", "#d97706", "#059669", "#2563eb", "#7c3aed"];
const SPARKS = Array.from({ length: 8 }, (_, i) => {
  const angle = (i / 8) * 2 * Math.PI + 0.2;
  const reach = i % 2 ? 11 : 14;
  return {
    x: Math.round(Math.cos(angle) * reach * 10) / 10,
    y: Math.round(Math.sin(angle) * reach * 10) / 10,
    color: RAINBOW[i % RAINBOW.length],
  };
});
