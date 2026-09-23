"use client";

import { Brain, Zap } from "lucide-react";
import { useState } from "react";
import { ModelCycle } from "@/components/lunato/model-cycle";

const MODELS = [
  { id: "fast", label: "Fast", icon: <Zap /> },
  { id: "pro", label: "Pro", icon: <Brain /> },
];

export function ModelPicker() {
  const [model, setModel] = useState("fast");

  return <ModelCycle models={MODELS} value={model} onChange={setModel} />;
}
