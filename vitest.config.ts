import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: Object.fromEntries(
      [
        "catalog",
        "config",
        "exact",
        "observability",
        "odata",
        "policy",
        "resources",
        "schemas",
        "server",
        "tools",
      ].map((name) => [
        `@${name}`,
        fileURLToPath(new URL(`./src/${name}`, import.meta.url)),
      ]),
    ),
  },
  test: {
    coverage: { reporter: ["text", "json", "html"] },
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
