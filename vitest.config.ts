import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

// Tests run the pure logic (retrieval, unit resolution, validation) under Node —
// no DOM, no Tauri, no network. The "~" alias mirrors tsconfig so source files
// that import "~/pilot/..." resolve the same way they do in the app build.
export default defineConfig({
  resolve: {
    alias: { "~": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
})
