// Writes demo/standalone.html: the demo with the library inlined, so it opens straight from
// the file system. Browsers refuse module imports over file://, and the demo shouldn't need a server.
import { readFileSync, writeFileSync } from "node:fs";

const IMPORT = 'import { morphChanges } from "../dist/index.js";';
const library = ["tokens", "lines", "units", "diff", "index"] // dependency order
  .map((name) => readFileSync(`dist/${name}.js`, "utf8").replace(/^import .*\n/gm, "").replace(/^export /gm, ""))
  .join("\n");

const page = readFileSync("demo/index.html", "utf8");
if (!page.includes(IMPORT)) throw new Error(`demo/index.html no longer contains: ${IMPORT}`);
writeFileSync("demo/standalone.html", page.replace(IMPORT, () => library));
