import { CodeInline } from "@/components/lunato/code-inline";

export function LiveEdit({ code, line }: { code: string; line: number }) {
  return <CodeInline lines={code.split("\n")} active={line} />;
}
