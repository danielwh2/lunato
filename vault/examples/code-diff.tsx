import { CodeDiff, type DiffLine } from "@/components/lunato/code-diff";

export function AgentEdit({
  file,
  lines,
  streaming,
}: {
  file: string;
  lines: DiffLine[];
  streaming: boolean;
}) {
  return <CodeDiff file={file} lines={lines} streaming={streaming} />;
}
