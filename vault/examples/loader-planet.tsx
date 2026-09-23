"use client";

import { useTransition } from "react";
import { LoaderPlanet } from "@/components/lunato/loader-planet";

export function Retry({ onRetry }: { onRetry: () => Promise<void> }) {
  const [pending, startTransition] = useTransition();

  return (
    <button disabled={pending} onClick={() => startTransition(onRetry)}>
      {pending ? <LoaderPlanet size={16} /> : "Retry"}
    </button>
  );
}
