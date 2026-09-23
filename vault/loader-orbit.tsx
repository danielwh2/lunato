import type { CSSProperties } from "react";
import "lunato/vault.css";

/**
 * LoaderOrbit: a moon on a tilted orbit round a small planet, passing in front and behind. Drawn in currentColor.
 *
 * @example
 * <LoaderOrbit size={20} speed={0.8} className="text-sky-600" />
 *
 * @param size - Width and height in px.
 * @param speed - How fast it orbits: 2 is twice as fast, 0.5 half.
 * @param className - Colour it with a text colour.
 */
export function LoaderOrbit({
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
      className={className}
      style={{ "--lunato-speed": speed } as CSSProperties}
    >
      <g transform="rotate(-20 12 12)">
        <ellipse cx="12" cy="12" rx="9" ry="4.6" strokeWidth="1" opacity="0.3" />
        <circle cx="12" cy="12" r="2.8" fill="currentColor" stroke="none" />
        <g className="lunato-orbit-x">
          <g className="lunato-orbit-y">
            <circle
              className="lunato-orbit-moon"
              cx="12"
              cy="12"
              r="1.9"
              fill="currentColor"
              stroke="none"
            />
          </g>
        </g>
      </g>
    </svg>
  );
}
