import { SourceStack, type Source } from "@/components/lunato/source-stack";

export function Research({ sources }: { sources: Source[] }) {
  const status = `Reading ${sources.length} sources`;

  return <SourceStack sources={sources} status={status} />;
}
