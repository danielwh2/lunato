"use client";

import { morphChanges } from "lunato";
import type { Model } from "./model-menu";

/**
 * ModelCycle: one quiet button that steps to the next model on every press, Shift+press for the one before. For two to
 * four models, where a menu is more than the choice needs; needs the Model type from model-menu beside it.
 *
 * @example
 * <ModelCycle models={[{ id: "fast", label: "Fast", icon: <BoltIcon /> }]}
 *   value={model} onChange={setModel} />
 *
 * @param models - The choices, in the order a press steps through them.
 * @param value - The id of the chosen model.
 * @param onChange - Called with the id of the next model.
 */
export function ModelCycle({
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
  const at = Math.max(
    0,
    models.findIndex((m) => m.id === value),
  );
  const current = models[at];
  if (!current) return null;
  const step = (by: number) => onChange(models[(at + by + models.length) % models.length].id);
  return (
    <button
      type="button"
      aria-label={`Model: ${current.label}. Press for the next`}
      onClick={(e) => step(e.shiftKey ? -1 : 1)}
      className={`inline-flex h-7 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-[12px] border-0 bg-transparent pl-2 pr-2.5 text-[11px] font-medium leading-none text-neutral-600 transition-[background-color,color] duration-150 [corner-shape:squircle] hover:bg-black/5 hover:text-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-400 motion-reduce:transition-none ${className}`}
    >
      <span ref={morphChanges} className="grid [&_svg]:size-3">
        {current.icon}
      </span>
      <span ref={morphChanges} data-lunato="roll">{current.label}</span>
      <span aria-hidden className="ml-0.5 flex items-center gap-[3px]">
        {models.map((m, i) => (
          <span
            key={m.id}
            className={`h-1 rounded-full transition-[width,background-color] duration-220 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none ${i === at ? "w-2.5 bg-neutral-900" : "w-1 bg-neutral-300"}`}
          />
        ))}
      </span>
      <span className="sr-only" aria-live="polite">
        {current.label}
      </span>
    </button>
  );
}
