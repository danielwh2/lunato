import type { CSSProperties } from "react";
import "lunato/vault.css";

/**
 * LoaderSquare: a rounded square with a bright stroke chasing round its edge as it turns a quarter at a time. Drawn in
 * currentColor.
 *
 * @example
 * <LoaderSquare size={20} speed={1.5} className="text-amber-600" />
 *
 * @param size - Width and height in px.
 * @param speed - How fast it runs: 2 is twice as fast, 0.5 half.
 * @param className - Colour it with a text colour.
 */
export function LoaderSquare({
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
      className={className}
      style={{ "--lunato-speed": speed } as CSSProperties}
    >
      <g className="lunato-square-turn">
        <rect x="5" y="5" width="14" height="14" rx="4" opacity="0.2" />
        <rect
          className="lunato-square-chase"
          x="5"
          y="5"
          width="14"
          height="14"
          rx="4"
          pathLength={100}
          strokeDasharray="24 76"
        />
      </g>
    </svg>
  );
}
