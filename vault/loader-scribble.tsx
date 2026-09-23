import type { CSSProperties } from "react";
import "lunato/vault.css";

/**
 * LoaderScribble: a hand-drawn coil written out by an unseen pen and rubbed out again. Drawn in currentColor.
 *
 * @example
 * <LoaderScribble size={20} speed={0.8} className="text-rose-600" />
 *
 * @param size - Width and height in px.
 * @param speed - How fast it writes: 2 is twice as fast, 0.5 half.
 * @param className - Colour it with a text colour.
 */
export function LoaderScribble({
  size = 16,
  speed = 1,
  className = "",
}: {
  size?: number;
  speed?: number;
  className?: string;
}) {
  return (
    <svg
      aria-hidden
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ "--lunato-speed": speed } as CSSProperties}
    >
      <path className="lunato-scribble-pen" d={COIL} pathLength={100} strokeDasharray="100 100" />
    </svg>
  );
}

const COIL =
  "M2.5 15.5C5 15 7.5 12 7 9.5 6.6 7.6 4.6 8.4 4.9 10.6 5.3 13.6 9.2 15.8 11.6 13.6 13.4 12 13 8.7 11.3 8.9 9.6 9.1 10 12.6 12.4 14.4 14.8 16.2 18.3 14.6 18.6 11.5 18.8 9.4 16.8 8.9 16.5 10.9 16.1 13.6 18.9 15.9 21.5 15.2";
