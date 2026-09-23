import type { CSSProperties } from "react";
import "lunato/vault.css";

/**
 * LoaderGrid: a square of dots that twinkle at random, sweep corner to corner, or ripple out from the centre. Drawn in
 * currentColor.
 *
 * @example
 * <LoaderGrid size={20} grid={5} pattern="ripple" className="text-violet-600"
 * />
 *
 * @param size - Width and height in px.
 * @param speed - How fast the dots run: 2 is twice as fast, 0.5 half.
 * @param grid - Dots per side: 3 reads boldest at small sizes, 5 finest at large ones.
 * @param pattern - How the dots light: "random" twinkles, "wave" sweeps diagonally, "ripple" rings out from the centre.
 * @param className - Colour it with a text colour.
 */
export function LoaderGrid({
  size = 16,
  speed = 1,
  grid = 4,
  pattern = "random",
  className = "",
}: {
  size?: number;
  speed?: number;
  grid?: number;
  pattern?: "random" | "wave" | "ripple";
  className?: string;
}) {
  const n = Math.max(2, Math.round(grid));
  const gap = SPAN / (n - 1);
  const mid = (n - 1) / 2;
  const cells = Array.from({ length: n * n }, (_, i) => ({ i, r: Math.floor(i / n), c: i % n }));
  const far = Math.hypot(mid, mid);
  const near = Math.min(...cells.map(({ r, c }) => Math.hypot(r - mid, c - mid)));
  const rank = ({ i, r, c }: { i: number; r: number; c: number }) =>
    pattern === "wave"
      ? (r + c) / (2 * (n - 1))
      : pattern === "ripple"
        ? (Math.hypot(r - mid, c - mid) - near) / (far - near)
        : (i * GOLDEN) % 1;
  return (
    <svg
      aria-hidden
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      data-pattern={pattern}
      className={`lunato-grid ${className}`}
      style={{ "--lunato-speed": speed } as CSSProperties}
    >
      {cells.map((cell) => (
        <circle
          key={cell.i}
          className="lunato-grid-dot"
          cx={INSET + cell.c * gap}
          cy={INSET + cell.r * gap}
          r={gap * DOT}
          style={
            {
              "--k": rank(cell),
              "--t": pattern === "random" ? 1 + scatter(cell.i) * 0.8 : 1,
            } as CSSProperties
          }
        />
      ))}
    </svg>
  );
}

const INSET = 4.5;
const SPAN = 24 - 2 * INSET;
const DOT = 0.36;
const GOLDEN = 0.618034;
const scatter = (i: number) => {
  let x = Math.imul((i + 1) ^ ((i + 1) >>> 16), 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return ((x ^ (x >>> 16)) >>> 0) / 2 ** 32;
};
