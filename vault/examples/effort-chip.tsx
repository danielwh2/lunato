"use client";

import { useState } from "react";
import { EffortChip } from "@/components/lunato/effort-chip";

export function ReasoningEffort() {
  const [effort, setEffort] = useState("medium");

  return <EffortChip value={effort} onChange={setEffort} />;
}
