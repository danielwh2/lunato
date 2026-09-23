import type { ReactNode } from "react";

/**
 * sources: what the source lists share.
 *
 * The Source type, a source's domain, and the mark drawn for one at each list's size.
 */

export type Source = { id: string; title: string; url?: string; icon?: ReactNode };

/** A source's domain, or its title when it has no url. */
export const domain = (s: Source) => {
  try {
    return new URL(s.url ?? "").hostname.replace(/^www\./, "");
  } catch {
    return s.title;
  }
};

/**
 * The source's own icon, an emoji, or a monogram of its domain on a tint the domain picks, so it never changes. The
 * look sizes it for the circle it sits in.
 */
export function Mark({ source, look }: { source: Source; look: keyof typeof LOOKS }) {
  const { emoji, letter, svg } = LOOKS[look];
  if (typeof source.icon === "string")
    return <span className={`leading-none ${emoji}`}>{source.icon}</span>;
  if (source.icon)
    return (
      <span
        className={`grid size-full place-items-center [&>img]:size-full [&>img]:object-cover ${svg}`}
      >
        {source.icon}
      </span>
    );
  const name = domain(source);
  const [background, color] = TINTS[hash(name) % TINTS.length];
  return (
    <span
      className={`grid size-full place-items-center font-semibold leading-none ${letter}`}
      style={{ background, color }}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

const LOOKS = {
  stack: { emoji: "text-[11px]", letter: "text-[9px]", svg: "[&>svg]:size-2.5" },
  chip: { emoji: "text-[10px]", letter: "text-[8px]", svg: "[&>svg]:size-2.5" },
  moon: { emoji: "text-[8px]", letter: "text-[7px]", svg: "[&>svg]:size-2" },
};
const hash = (text: string) => [...text].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const TINTS = [
  ["#fde68a", "#92400e"],
  ["#bfdbfe", "#1e3a8a"],
  ["#bbf7d0", "#14532d"],
  ["#fecdd3", "#881337"],
  ["#ddd6fe", "#4c1d95"],
  ["#e5e5e5", "#262626"],
] as const;
