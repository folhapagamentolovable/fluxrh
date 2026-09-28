import { defineConfig } from "vitest/config";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  define: {
    "import.meta.env.VITE_FLUXRH_DATA_MODE": JSON.stringify("local"),
  },
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "jsdom",
    pool: "threads",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: ["dist/**", "node_modules/**"]
  }
});
