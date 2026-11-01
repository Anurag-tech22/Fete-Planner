import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { proxy: { "/api": "http://localhost:8787" } },
  test: {
    include: ["{shared,server,client}/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      include: ["shared/**", "server/**", "client/**"],
      exclude: [
        "dist-server/**",
        "client/zod-config.ts",
        "**/*.test.*",
        "**/*.css",
        "server/index.ts",
        "client/main.tsx",
      ],
      thresholds: { lines: 100, statements: 100, functions: 100, branches: 100 },
    },
  },
});
