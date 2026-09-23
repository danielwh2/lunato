"use client";

import { useState } from "react";
import { EffortSegments } from "@/components/lunato/effort-segments";

export function ReasoningEffort() {
  const [effort, setEffort] = useState("medium");

  return <EffortSegments value={effort} onChange={setEffort} />;
}
