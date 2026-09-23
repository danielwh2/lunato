"use client";

import { type KeyboardEvent, useRef } from "react";
import type { Model } from "./model-menu";

/**
 * ModelTabs: every model in view as a small tray of icons, the chosen one opened up to show its name. Needs the Model
 * type from model-menu beside it.
 *
 * @example
 * <ModelTabs models={[{ id: "fast", label: "Fast", icon: <BoltIcon /> }]}
 *   value={model} onChange={setModel} />
 *
 * @param models - The choices, in order. Every model needs an icon: it is all the unchosen ones show.
 * @param value - The id of the chosen model.
 * @param onChange - Called with the id of the model picked.
 */
export function ModelTabs({
  models,
  value,
  onChange,
  className = "",
}: {
  models: Model[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const stop = Math.max(
    0,
    models.findIndex((m) => m.id === value),
  );
  const keys = (e: KeyboardEvent, i: number) => {
    const to = (
      {
        ArrowRight: i + 1,
        ArrowDown: i + 1,
        ArrowLeft: i - 1,
        ArrowUp: i - 1,
        Home: 0,
        End: models.length - 1,
      } as Record<string, number>
    )[e.key];
    if (to === undefined) return;
    e.preventDefault();
    const next = (to + models.length) % models.length;
    onChange(models[next].id);
    tabs.current[next]?.focus();
  };
  return (
    <div
      role="radiogroup"
      aria-label="Model"
      className={`inline-flex items-center gap-0.5 rounded-[12px] bg-black/5 p-0.5 [corner-shape:squircle] ${className}`}
    >
      {models.map((m, i) => {
        const on = m.id === value;
        return (
          <button
            key={m.id}
            ref={(el) => {
              tabs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={m.label}
            title={on ? undefined : m.label}
            tabIndex={i === stop ? 0 : -1}
            onClick={() => onChange(m.id)}
            onKeyDown={(e) => keys(e, i)}
            className={`inline-flex h-6 cursor-pointer items-center rounded-[10px] border-0 px-1.5 text-[11px] font-medium transition-[background-color,color,box-shadow] duration-150 [corner-shape:squircle] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-neutral-400 motion-reduce:transition-none ${on ? "bg-white text-neutral-900 shadow-[0_0_0_1px_rgb(0_0_0/0.06),0_1px_2px_rgb(0_0_0/0.06)]" : "bg-transparent text-neutral-500 hover:text-neutral-900"}`}
          >
            <span className="grid [&_svg]:size-3">{m.icon}</span>
            <span
              className={`grid transition-[grid-template-columns] duration-220 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none ${on ? "grid-cols-[1fr]" : "grid-cols-[0fr]"}`}
            >
              <span className="overflow-hidden">
                <span
                  className={`block whitespace-nowrap pl-1 transition-opacity duration-220 motion-reduce:transition-none ${on ? "opacity-100" : "opacity-0"}`}
                >
                  {m.label}
                </span>
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
