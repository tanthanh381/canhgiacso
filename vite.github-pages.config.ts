import react from "@vitejs/plugin-react";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { defineConfig } from "vite";

const securePrivacyScriptUrl =
  "https://app.secureprivacy.ai/script/6aa2be480333def7ec8c6991.js";
const securePrivacyTag = `<script src="${securePrivacyScriptUrl}"></script>`;

async function injectSecurePrivacyTag(directory: string): Promise<void> {
  const entries = await readdir(directory, { withFileTypes: true });

  await Promise.all(
    entries.map(async (entry) => {
      const filePath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        await injectSecurePrivacyTag(filePath);
        return;
      }

      if (!entry.isFile() || !entry.name.endsWith(".html")) return;

      const html = await readFile(filePath, "utf8");
      if (html.includes(securePrivacyScriptUrl)) return;

      const updatedHtml = html.replace(/<head(?:\s[^>]*)?>/i, (headTag) =>
        `${headTag}\n  ${securePrivacyTag}`,
      );

      if (updatedHtml !== html) {
        await writeFile(filePath, updatedHtml, "utf8");
      }
    }),
  );
}

export default defineConfig({
  root: "github-pages",
  base: "/",
  publicDir: "../public",
  plugins: [
    react(),
    {
      name: "inject-secureprivacy-tag",
      apply: "build",
      async closeBundle() {
        await injectSecurePrivacyTag(path.resolve(process.cwd(), "docs"));
      },
    },
  ],
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
