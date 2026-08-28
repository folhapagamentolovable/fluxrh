import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  build: {
    rolldownOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("lucide-react")) return "icons";
          if (id.includes("@supabase") || id.includes("node_modules/zod")) return "supabase";
          if (id.includes("@tanstack/react-query")) return "data";
          if (id.includes("node_modules/react") || id.includes("react-router")) return "react";
        },
      },
    },
  },
  server: { port: 5173, proxy: { "/api": "http://localhost:3333", "/health": "http://localhost:3333" } }
});
