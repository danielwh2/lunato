"use client";

import { useState } from "react";
import { EffortCharge } from "@/components/lunato/effort-charge";

export function ReasoningEffort() {
  const [effort, setEffort] = useState("medium");

  return <EffortCharge value={effort} onChange={setEffort} />;
}
