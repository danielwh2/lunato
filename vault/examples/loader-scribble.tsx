"use client";

import { useTransition } from "react";
import { LoaderScribble } from "@/components/lunato/loader-scribble";

export function Retry({ onRetry }: { onRetry: () => Promise<void> }) {
  const [pending, startTransition] = useTransition();

  return (
    <button aria-label="Retry" aria-busy={pending} disabled={pending}
      onClick={() => startTransition(onRetry)}>
      {pending ? <LoaderScribble size={16} /> : "Retry"}
    </button>
  );
}
