"use client";

import { useLayoutEffect, useRef } from "react";

/**
 * StreamingBlur: a model's answer as it streams in, each new word sharpening out of a blur as it rises into place.
 *
 * @example
 * <StreamingBlur text={answer} />
 *
 * @param text - Everything received so far. Pass the whole answer each time, not the latest chunk.
 */
export function StreamingBlur({ text, className = "" }: { text: string; className?: string }) {
  return (
    <p className={`m-0 ${className}`}>
      {text
        .split(/(\s+)/)
        .map((part, i) => (/^\s*$/.test(part) ? part : <Word key={i} text={part} />))}
    </p>
  );
}

function Word({ text }: { text: string }) {
  const el = useRef<HTMLSpanElement>(null);
  const was = useRef("");
  useLayoutEffect(() => {
    const grown = was.current !== "" && text.startsWith(was.current);
    was.current = text;
    if (grown || !el.current || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    el.current.animate(
      [
        { opacity: 0, filter: "blur(6px)", translate: "0 0.2em" },
        { opacity: 1, filter: "blur(0)", translate: "0 0" },
      ],
      { duration: 420, easing: "cubic-bezier(0.2, 0, 0, 1)" },
    );
  }, [text]);
  return (
    <span ref={el} className="inline-block">
      {text}
    </span>
  );
}
