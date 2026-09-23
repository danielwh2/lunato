"use client";

import { useLayoutEffect, useRef, useState } from "react";

/**
 * StreamingCaret: a model's answer typed out behind a caret at an even pace however bursty the stream, keeping what
 * still agrees when the model rewrites what it said.
 *
 * @example
 * <StreamingCaret text={answer} streaming={status === "streaming"} />
 *
 * @param text - Everything received so far. Pass the whole answer each time, not the latest chunk.
 * @param streaming - Whether more is coming. The caret shows while it is, and until the typing catches up. A finished
 *   answer mounted with it off shows whole at once, server-rendered too.
 */
export function StreamingCaret({
  text,
  streaming = false,
  className = "",
}: {
  text: string;
  streaming?: boolean;
  className?: string;
}) {
  const [shown, setShown] = useState(streaming ? 0 : text.length);
  const at = useRef(shown);
  const before = useRef(streaming ? "" : text);
  useLayoutEffect(() => {
    let same = 0;
    while (same < at.current && text[same] === before.current[same]) same++;
    at.current = same;
    before.current = text;
    setShown(same);
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown((at.current = text.length));
      return;
    }
    let frame = 0;
    let last = performance.now();
    const type = (now: number) => {
      const behind = text.length - at.current;
      at.current = Math.min(
        text.length,
        at.current + (Math.max(PACE, behind * CATCH_UP) * (now - last)) / 1000,
      );
      last = now;
      setShown(Math.floor(at.current));
      if (at.current < text.length) frame = requestAnimationFrame(type);
    };
    frame = requestAnimationFrame(type);
    return () => cancelAnimationFrame(frame);
  }, [text]);
  return (
    <p className={`m-0 ${className}`}>
      {text.slice(0, shown)}
      {(streaming || shown < text.length) && (
        <span
          aria-hidden
          className="ml-px inline-block h-[1em] w-[2px] translate-y-[0.15em] animate-pulse rounded-full bg-current"
        />
      )}
    </p>
  );
}

const PACE = 70;
const CATCH_UP = 3;
