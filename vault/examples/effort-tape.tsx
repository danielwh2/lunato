"use client";

import { useState } from "react";
import { EffortTape } from "@/components/lunato/effort-tape";

export function ReasoningEffort() {
  const [effort, setEffort] = useState("medium");

  return <EffortTape value={effort} onChange={setEffort} />;
}
