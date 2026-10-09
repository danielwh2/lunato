"use client";

import { useTransition } from "react";
import { LoaderSquare } from "@/components/lunato/loader-square";

export function Retry({ onRetry }: { onRetry: () => Promise<void> }) {
  const [pending, startTransition] = useTransition();

  return (
    <button aria-label="Retry" aria-busy={pending} disabled={pending}
      onClick={() => startTransition(onRetry)}>
      {pending ? <LoaderSquare size={16} /> : "Retry"}
    </button>
  );
}
