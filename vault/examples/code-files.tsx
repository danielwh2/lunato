import { CodeFiles, type TouchedFile } from "@/components/lunato/code-files";

export function ChangedFiles({ files }: { files: TouchedFile[] }) {
  return <CodeFiles files={files} />;
}
