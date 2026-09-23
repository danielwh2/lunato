"use client";

import { type CSSProperties, useId } from "react";
import "lunato/vault.css";

/**
 * LoaderPlanet: a small planet that turns, a band of continents scrolling behind a still globe and ring. Drawn in
 * currentColor.
 *
 * @example
 * <LoaderPlanet size={20} speed={1.5} className="text-violet-600" />
 *
 * @param size - Width and height in px.
 * @param speed - How fast it turns: 2 is twice as fast, 0.5 half.
 * @param className - Colour it with a text colour.
 */
export function LoaderPlanet({
  size = 16,
  speed = 1,
  className = "",
}: {
  size?: number;
  speed?: number;
  className?: string;
}) {
  const clip = useId();
  return (
    <svg
      aria-hidden
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      className={className}
      style={{ "--lunato-speed": speed } as CSSProperties}
    >
      <clipPath id={clip}>
        <circle cx="12" cy="12" r="7" />
      </clipPath>
      <g clipPath={`url(#${clip})`} fill="currentColor" stroke="none" opacity="0.45">
        <g className="lunato-planet-surface">
          <path d={CONTINENTS} />
          <path d={CONTINENTS} transform="translate(16 0)" />
        </g>
      </g>
      <circle cx="12" cy="12" r="7.75" />
      <path d={RING} />
    </svg>
  );
}

const CONTINENTS =
  "M1 8.5c1.2-.8 2.6-.6 3.4.3s.4 2.2-.8 2.6-2.8.2-3.2-.9S0 9.2 1 8.5Zm6.5 4.6c1.4-.5 3 .2 3.3 1.4s-.9 2.1-2.4 2.1-2.6-.9-2.5-1.9.6-1.3 1.6-1.6Zm5-7.3c1.1-.4 2.3.2 2.5 1.2s-.7 1.8-1.9 1.7-2-.8-1.9-1.6.6-1.1 1.3-1.3Zm.9 9.8c.9-.2 1.7.3 1.8 1.1s-.6 1.4-1.4 1.3-1.4-.6-1.3-1.2.4-1 .9-1.2Z";
const RING =
  "M4.25029 12L4.25078 12.1035C2.03789 13.4014 0.778609 14.6773 1.06328 15.5537C1.34795 16.4297 3.1165 16.7222 5.66923 16.4712C7.70732 16.271 10.2459 15.7246 12.9275 14.853C15.6087 13.9819 17.9832 12.9326 19.7498 11.8965C21.9627 10.5986 23.222 9.32277 22.9373 8.44631C22.6526 7.57033 20.8841 7.27785 18.3313 7.52882";
