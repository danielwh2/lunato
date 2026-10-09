"use client";

import { useEffect, useState } from "react";

/**
 * thinking: what the thinking states share.
 *
 * The seconds a run has taken, how they read, and the check and cross that end a step.
 */

/** Whole seconds since a run started, frozen once it is over; a new run (over turning false again) counts from nought. */
export function useSeconds(over: boolean) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (over) return;
    const start = Date.now();
    setSeconds(0);
    const id = setInterval(() => setSeconds(Math.floor((Date.now() - start) / 1000)), TICK_MS);
    return () => clearInterval(id);
  }, [over]);
  return seconds;
}

/** 12s, or 1m 12s from a minute on, in whole seconds. */
export function duration(seconds: number) {
  const s = Math.floor(seconds);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
}

const TICK_MS = 250;

const ICON = {
  width: 12,
  height: 12,
  viewBox: "0 0 14 14",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;
export const Check = () => (
  <svg {...ICON}>
    <path d="M2.5 7.5 5.5 10.5 11.5 3.5" />
  </svg>
);
export const Cross = () => (
  <svg {...ICON}>
    <path d="M4 4l6 6M10 4l-6 6" />
  </svg>
);
