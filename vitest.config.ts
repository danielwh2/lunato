import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    // The browser builds: Solid and Svelte otherwise load their server renderers, which cannot mount.
    conditions: ["browser"],
    // The vault's components import the package by name, as they do once copied into an app.
    alias: [{ find: /^lunato$/, replacement: here("src/index.ts") }, { find: /^lunato\/vault\.css$/, replacement: here("vault.css") }],
  },
  test: { environment: "happy-dom", server: { deps: { inline: ["solid-js", "svelte"] } } },
});
