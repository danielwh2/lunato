"use client";

import { Brain, Zap } from "lucide-react";
import { useState } from "react";
import { ModelMenu } from "@/components/lunato/model-menu";

const MODELS = [
  { id: "fast", label: "Fast", icon: <Zap /> },
  { id: "pro", label: "Pro", icon: <Brain /> },
];

export function ModelPicker() {
  const [model, setModel] = useState("fast");

  return <ModelMenu models={MODELS} value={model} onChange={setModel} />;
}
