import { defineConfig } from "vitest/config";

// Only the project's own tests; out/ holds throwaway renders and probes.
export default defineConfig({ test: { include: ["src/**/*.test.ts"] } });
