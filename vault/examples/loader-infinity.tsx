"use client";

import { useTransition } from "react";
import { LoaderInfinity } from "@/components/lunato/loader-infinity";

export function Retry({ onRetry }: { onRetry: () => Promise<void> }) {
  const [pending, startTransition] = useTransition();

  return (
    <button aria-label="Retry" aria-busy={pending} disabled={pending}
      onClick={() => startTransition(onRetry)}>
      {pending ? <LoaderInfinity size={16} /> : "Retry"}
    </button>
  );
}
