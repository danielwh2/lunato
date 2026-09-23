import { SourceTrail, type Source } from "@/components/lunato/source-trail";

export function Research({ sources, done }: {
  sources: Source[];
  done: boolean;
}) {
  const status = done
    ? `Read ${sources.length} sources`
    : "Searching the web";

  return <SourceTrail sources={sources} status={status} done={done} />;
}
