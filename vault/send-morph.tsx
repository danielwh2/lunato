"use client";

import { morphChanges } from "lunato";
import { Arrow, type SendProps, Stop, press } from "./send";

/**
 * SendMorph: a small ink button whose arrow folds into a stop square while the model answers, drawn line into outline
 * by lunato. Sized by a panel's --lunato-size, --lunato-radius and --lunato-corner; a 28px squircle on its own.
 *
 * @example
 * <SendMorph busy={status === "streaming"} disabled={!input} onSend={send}
 *   onStop={stop} />
 *
 * @param busy - True while the model is answering: the button stops it.
 * @param disabled - True when there is nothing to send. Ignored while busy, so stop always works.
 * @param onSend - Called on a press while idle.
 * @param onStop - Called on a press while busy.
 */
export function SendMorph({ busy, disabled = false, onSend, onStop, className = "" }: SendProps) {
  return (
    <button
      type="button"
      disabled={!busy && disabled}
      aria-label={busy ? "Stop generating" : "Send"}
      {...press(busy, onSend, onStop)}
      className={`relative grid size-[var(--lunato-size,28px)] flex-none cursor-pointer place-items-center rounded-[var(--lunato-radius,12px)] border-0 bg-neutral-900 text-white transition-[scale,opacity] duration-150 [corner-shape:var(--lunato-corner,squircle)] active:scale-[0.96] disabled:cursor-default disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-400 data-pointer:focus-visible:outline-none motion-reduce:transition-none ${className}`}
    >
      <span ref={morphChanges} className="grid">
        {busy ? <Stop /> : <Arrow />}
      </span>
      <svg
        viewBox="0 0 28 28"
        fill="none"
        aria-hidden
        className={`absolute inset-0 size-full animate-[spin_1.2s_linear_infinite] transition-opacity duration-220 motion-reduce:animate-none ${busy ? "opacity-100" : "opacity-0 [animation-play-state:paused]"}`}
      >
        <circle
          cx="14"
          cy="14"
          r="10.5"
          stroke="currentColor"
          strokeOpacity="0.35"
          strokeWidth="1.5"
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray="22 78"
        />
      </svg>
    </button>
  );
}
