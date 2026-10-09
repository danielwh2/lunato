"use client";

import { useEffect, useRef } from "react";

/**
 * scroll-follow: what the code panels share.
 *
 * A scroll box that follows its content down until someone scrolls up.
 */

/** A scroll box that follows its content down as it grows, until someone scrolls up; back at the bottom, it follows again. */
export function useFollow<Content extends HTMLElement = HTMLDivElement>() {
  const box = useRef<HTMLDivElement>(null);
  const content = useRef<Content>(null);
  useEffect(() => {
    const b = box.current;
    const c = content.current;
    if (!b || !c) return;
    let stuck = true;
    let ours = -1;
    const scroll = () => {
      const bottom = b.scrollTop + b.clientHeight >= b.scrollHeight - SLACK;
      if (bottom || b.scrollTop !== ours) stuck = bottom;
    };
    const follow = new ResizeObserver(() => {
      if (!stuck) return;
      b.scrollTop = b.scrollHeight;
      ours = b.scrollTop;
    });
    b.addEventListener("scroll", scroll, { passive: true });
    follow.observe(c);
    return () => {
      b.removeEventListener("scroll", scroll);
      follow.disconnect();
    };
  }, []);
  return [box, content] as const;
}

const SLACK = 4;
