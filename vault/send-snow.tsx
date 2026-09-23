"use client";

import { type SendProps, press } from "./send";
import "lunato/vault.css";

/**
 * SendSnow: the night disc's daylight twin, snow drifting behind a navy arrow that folds into a stop square while the
 * model answers. Sized by a panel's --lunato-size, --lunato-radius and --lunato-corner; a 28px squircle on its own.
 *
 * @example
 * <SendSnow busy={status === "streaming"} disabled={!input} onSend={send}
 *   onStop={stop} />
 *
 * @param busy - True while the model is answering: the button stops it.
 * @param disabled - True when there is nothing to send. Ignored while busy, so stop always works.
 * @param onSend - Called on a press while idle.
 * @param onStop - Called on a press while busy.
 */
export function SendSnow({ busy, disabled = false, onSend, onStop, className = "" }: SendProps) {
  return (
    <button
      type="button"
      data-busy={busy || undefined}
      disabled={!busy && disabled}
      aria-label={busy ? "Stop generating" : "Send"}
      {...press(busy, onSend, onStop)}
      className={`lunato-snow ${className}`}
    >
      <span aria-hidden className="lunato-snow-flurry" />
      <span className="lunato-snow-idle">
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M7 11.75V2.75" />
          <path d="M3.5 6.25 7 2.75l3.5 3.5" />
        </svg>
      </span>
      <span className="lunato-snow-busy">
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          aria-hidden
        >
          <rect x="4" y="4" width="6" height="6" rx="1.5" />
        </svg>
      </span>
    </button>
  );
}
