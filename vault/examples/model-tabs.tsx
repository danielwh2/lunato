"use client";

import { Brain, Zap } from "lucide-react";
import { useState } from "react";
import { ModelTabs } from "@/components/lunato/model-tabs";

const MODELS = [
  { id: "fast", label: "Fast", icon: <Zap /> },
  { id: "pro", label: "Pro", icon: <Brain /> },
];

export function ModelPicker() {
  const [model, setModel] = useState("fast");

  return <ModelTabs models={MODELS} value={model} onChange={setModel} />;
}
