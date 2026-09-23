"use client";

import { type CSSProperties, useEffect, useRef, useState } from "react";
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
 * EffortCharge: how hard the model thinks, charged up by holding a dial; a quick press steps up one level, from Max
 * round to Low. Needs effort from the vault beside it.
 *
 * @example
 * <EffortCharge value={effort} onChange={setEffort} />
 *
 * @param value - The id of the chosen level.
 * @param onChange - Called with the id of the level set, when the hold ends or a press steps.
 * @param levels - The levels, lowest first, each with its label and colour. Defaults to EFFORTS; the last is Max.
 * @param atMax - What reaching Max does: the burst, the rainbow, a phone tap and your own onReach. See MaxFeedback.
 */
export function EffortCharge({
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
  const [charge, setCharge] = useState<number | null>(null);
  const hold = useRef({ start: 0, frame: 0 });
  const { at, last, pick, keys } = ladder(levels, value, onChange);
  const reached = charge === null ? at : Math.min(last, Math.floor(charge * last + 1e-6));
  const step = () => pick(at === last ? 0 : at + 1);
  const stop = () => cancelAnimationFrame(hold.current.frame);
  useEffect(() => stop, []);
  const press = () => {
    stop();
    hold.current.start = performance.now();
    const tick = (now: number) => {
      const held = now - hold.current.start - QUICK_MS;
      if (held > 0) setCharge(Math.min(1, held / CHARGE_MS));
      hold.current.frame = requestAnimationFrame(tick);
    };
    hold.current.frame = requestAnimationFrame(tick);
  };
  const release = () => {
    stop();
    if (charge === null) step();
    else pick(reached);
    setCharge(null);
  };
  return (
    <div
      {...meter(levels, at)}
      data-max={(reached === last && atMax?.rainbow !== false) || undefined}
      data-charging={charge !== null || undefined}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          return step();
        }
        keys(e);
      }}
      style={
        {
          "--c": levels[reached].color,
          "--fill": charge ?? at / Math.max(1, last),
        } as CSSProperties
      }
      className={`lunato-charge inline-flex h-7 select-none items-center gap-1.5 rounded-[12px] pr-2 text-[12px] font-medium outline-none transition-colors duration-150 [corner-shape:squircle] focus-visible:bg-neutral-100 ${className}`}
    >
      <span
        className="lunato-charge-dial relative grid size-7 flex-none cursor-pointer touch-none place-items-center"
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          e.preventDefault();
          e.currentTarget.setPointerCapture(e.pointerId);
          (e.currentTarget.parentElement as HTMLElement).focus();
          press();
        }}
        onPointerUp={(e) => e.currentTarget.hasPointerCapture(e.pointerId) && release()}
        onLostPointerCapture={() => {
          stop();
          setCharge(null);
        }}
      >
        <svg
          aria-hidden
          viewBox={`0 0 ${BOX} ${BOX}`}
          className="absolute inset-0 size-full -rotate-90"
        >
          <circle cx={BOX / 2} cy={BOX / 2} r={RING} className="lunato-charge-track" />
          <circle
            cx={BOX / 2}
            cy={BOX / 2}
            r={RING}
            pathLength={100}
            className="lunato-charge-fill"
          />
          {levels.slice(1).map((l, i) => {
            const radians = ((i + 1) / last) * 2 * Math.PI;
            return (
              <circle
                key={l.id}
                cx={BOX / 2 + RING * Math.cos(radians)}
                cy={BOX / 2 + RING * Math.sin(radians)}
                r={0.9}
                data-on={i + 1 <= reached || undefined}
                className="lunato-charge-tick"
              />
            );
          })}
        </svg>
        {charge !== null && <span key={reached} aria-hidden className="lunato-charge-pulse" />}
        <MaxBurst on={reached === last} feedback={atMax} />
        <svg
          aria-hidden
          width="12"
          height="12"
          viewBox="0 0 18 18"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="lunato-charge-bolt"
        >
          <path d="M14.75 7.25H9.5l.31-5.26c.01-.21-.26-.31-.39-.14L3.05 10.35c-.12.16 0 .4.2.4H8.5l-.31 5.26c-.01.21.26.31.39.14l6.37-8.5c.12-.16 0-.4-.2-.4Z" />
        </svg>
      </span>
      <EffortWord levels={levels} label={levels[reached].label} />
    </div>
  );
}

const BOX = 28;
const RING = 11.5;
const QUICK_MS = 180;
const CHARGE_MS = 1600;
