import type { FocusEvent, MouseEvent, PointerEvent } from "react";

/**
 * send: what the send buttons share.
 *
 * Their props, the press handlers, and the arrow and stop glyphs on the 14-unit grid they morph across.
 */

/** What every send button takes. */
export type SendProps = {
  busy: boolean;
  disabled?: boolean;
  onSend: () => void;
  onStop: () => void;
  className?: string;
};

/**
 * The press handlers every send button shares. The second click of a double-click that sent is not a stop. A button
 * pressed by pointer rather than tabbed to shows no focus ring until it blurs, or a key pressed after the click would
 * ring it.
 */
export const press = (busy: boolean, onSend: () => void, onStop: () => void) => ({
  onClick: (e: MouseEvent<HTMLButtonElement>) => (busy ? e.detail < 2 && onStop() : onSend()),
  onPointerDown: (e: PointerEvent<HTMLButtonElement>) => (e.currentTarget.dataset.pointer = ""),
  onBlur: (e: FocusEvent<HTMLButtonElement>) => delete e.currentTarget.dataset.pointer,
});

export const ICON = {
  width: 14,
  height: 14,
  viewBox: "0 0 14 14",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;
export const Arrow = () => (
  <svg {...ICON}>
    <line x1="7" y1="11.5" x2="7" y2="2.75" />
    <line x1="3.5" y1="6.25" x2="7" y2="2.75" />
    <line x1="10.5" y1="6.25" x2="7" y2="2.75" />
  </svg>
);
export const Stop = () => (
  <svg {...ICON}>
    <rect x="4" y="4" width="6" height="6" rx="1.5" />
  </svg>
);
