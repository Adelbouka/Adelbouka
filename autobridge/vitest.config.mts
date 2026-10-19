import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src"), "server-only": path.resolve(__dirname, "tests/server-only-stub.ts") } },
  test: {
    projects: [
      { extends: true, test: { name: "unit", include: ["src/**/*.test.ts"], environment: "node" } },
      {
        extends: true,
        test: { name: "db", include: ["tests/db/**/*.test.ts"], testTimeout: 30_000, hookTimeout: 120_000, fileParallelism: false },
      },
    ],
  },
});
