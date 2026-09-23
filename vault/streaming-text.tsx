"use client";

import { morphChanges } from "lunato";

/**
 * StreamingText: a model's answer as it streams in, each new word rising in and a revised word morphing in place.
 *
 * @example
 * <StreamingText text={answer} />
 *
 * @param text - Everything received so far. Pass the whole answer each time, not the latest chunk.
 */
export function StreamingText({ text, className = "" }: { text: string; className?: string }) {
  return (
    <p ref={morphChanges} className={`m-0 ${className}`}>
      {text}
    </p>
  );
}
