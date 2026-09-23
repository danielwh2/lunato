"use client";

import { useState } from "react";
import { EffortSlider } from "@/components/lunato/effort-slider";

export function ReasoningEffort() {
  const [effort, setEffort] = useState("medium");

  return <EffortSlider value={effort} onChange={setEffort} />;
}
