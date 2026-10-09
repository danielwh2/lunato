"use client";

import { useTransition } from "react";
import { LoaderOrbit } from "@/components/lunato/loader-orbit";

export function Retry({ onRetry }: { onRetry: () => Promise<void> }) {
  const [pending, startTransition] = useTransition();

  return (
    <button aria-label="Retry" aria-busy={pending} disabled={pending}
      onClick={() => startTransition(onRetry)}>
      {pending ? <LoaderOrbit size={16} /> : "Retry"}
    </button>
  );
}
