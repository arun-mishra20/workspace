/// <reference types="vitest" />
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@workspace/ui": path.resolve(__dirname, "../../packages/ui/src"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/testing/setup.ts"],
    exclude: ["node_modules", ".next", "e2e"],
    coverage: {
      include: ["src/**/*.{ts,tsx}"],
    },
    testTimeout: 10_000,
  },
});
