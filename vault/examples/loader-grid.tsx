"use client";

import { useTransition } from "react";
import { LoaderGrid } from "@/components/lunato/loader-grid";

export function Retry({ onRetry }: { onRetry: () => Promise<void> }) {
  const [pending, startTransition] = useTransition();

  return (
    <button aria-label="Retry" aria-busy={pending} disabled={pending}
      onClick={() => startTransition(onRetry)}>
      {pending ? <LoaderGrid size={16} pattern="wave" /> : "Retry"}
    </button>
  );
}
