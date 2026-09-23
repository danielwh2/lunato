"use client";

import { type AnimationEvent, useEffect, useRef } from "react";
import { type SendProps, press } from "./send";
import "lunato/vault.css";

/**
 * SendButton: a night-sky send disc, stars and meteors behind the arrow, that folds into a stop square while the
 * model answers. Sized by a panel's --lunato-size, --lunato-radius and --lunato-corner; a 28px squircle on its own.
 *
 * @example
 * <SendButton busy={status === "streaming"} disabled={!input} onSend={send}
 *   onStop={stop} />
 *
 * @param busy - True while the model is answering: the disc stops it.
 * @param disabled - True when there is nothing to send. Ignored while busy, so stop always works.
 * @param onSend - Called on a press while idle.
 * @param onStop - Called on a press while busy.
 */
export function SendButton({ busy, disabled = false, onSend, onStop, className = "" }: SendProps) {
  const sky = useRef<HTMLSpanElement>(null);
  const roll = (n: 1 | 2, hover: boolean) => {
    const set = (key: string, value: string) =>
      sky.current?.style.setProperty(`--m${n}-${key}`, value);
    const between = (a: number, b: number) => a + Math.random() * (b - a);
    set("dur", `${between(hover ? 1.1 : 7, hover ? 3.4 : 15).toFixed(2)}s`);
    set("delay", `${between(0, hover ? 1.2 : 4).toFixed(2)}s`);
    set("top", `${Math.round(between(-4, 8))}px`);
    set("left", `${Math.round(between(-4, 12))}px`);
    set("len", `${Math.round(between(5, 13))}px`);
    set("glow", between(0.6, 1).toFixed(2));
  };
  const rollBoth = (hover: boolean) => {
    roll(1, hover);
    roll(2, hover);
  };
  useEffect(() => rollBoth(false), []);

  return (
    <button
      type="button"
      data-busy={busy || undefined}
      disabled={!busy && disabled}
      aria-label={busy ? "Stop generating" : "Send"}
      {...press(busy, onSend, onStop)}
      onPointerEnter={() => rollBoth(true)}
      onPointerLeave={() => rollBoth(false)}
      className={`lunato-send ${className}`}
    >
      <span
        ref={sky}
        className="lunato-send-idle"
        onAnimationIteration={(e: AnimationEvent<HTMLSpanElement>) => {
          if (e.animationName === "lunato-meteor")
            roll(e.pseudoElement === "::after" ? 2 : 1, e.currentTarget.matches(":hover"));
        }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M7 11.75V2.75" />
          <path d="M3.5 6.25 7 2.75l3.5 3.5" />
        </svg>
      </span>
      <span className="lunato-send-busy">
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden
        >
          <rect x="3" y="3" width="8" height="8" rx="2" />
        </svg>
      </span>
    </button>
  );
}
