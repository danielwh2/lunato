import { defineConfig } from "vitest/config";

export default defineConfig({
  // The browser builds: Solid and Svelte otherwise load their server renderers, which cannot mount.
  resolve: { conditions: ["browser"] },
  test: { environment: "happy-dom", server: { deps: { inline: ["solid-js", "svelte"] } } },
});
