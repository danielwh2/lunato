import type { CSSProperties } from "react";
import "lunato/vault.css";

/**
 * LoaderInfinity: a figure of eight with a bright stroke running endlessly along it. Drawn in currentColor.
 *
 * @example
 * <LoaderInfinity size={20} speed={0.8} className="text-emerald-600" />
 *
 * @param size - Width and height in px.
 * @param speed - How fast it runs: 2 is twice as fast, 0.5 half.
 * @param className - Colour it with a text colour.
 */
export function LoaderInfinity({
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
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ "--lunato-speed": speed } as CSSProperties}
    >
      <path d={LOOP} opacity="0.2" />
      <path className="lunato-infinity-run" d={LOOP} pathLength={100} strokeDasharray="30 70" />
    </svg>
  );
}

const LOOP =
  "M12 12C14 9.5 16.5 8 18.5 8S21.5 10 21.5 12 20.5 16 18.5 16 14 14.5 12 12 7.5 8 5.5 8 2.5 10 2.5 12 3.5 16 5.5 16 10 14.5 12 12Z";
