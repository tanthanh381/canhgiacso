import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  root: "github-pages",
  base: "/",
  publicDir: "../public",
  plugins: [react()],
  build: {
    outDir: "../docs",
    emptyOutDir: true,
    rolldownOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("/react/") || id.includes("/react-dom/")) return "react";
          if (id.includes("/@supabase/")) return "supabase";
        },
      },
    },
  },
});
