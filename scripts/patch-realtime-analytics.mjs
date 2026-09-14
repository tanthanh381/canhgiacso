import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const SUPABASE_ORIGINS = "https://goietwyapiywrtibpkwo.supabase.co wss://goietwyapiywrtibpkwo.supabase.co";
const TRACKER_TAG = '<script src="/web-analytics.js" defer></script>';

async function patchAdmin() {
  const file = path.join(ROOT, "app", "admin.tsx");
  let source = await readFile(file, "utf8");
  const before = source;

  if (!source.includes('from "./admin-traffic-analytics"')) {
    source = source.replace(
      'import { supabase } from "./supabase";',
      'import { supabase } from "./supabase";\nimport { AdminTrafficAnalytics } from "./admin-traffic-analytics";',
    );
  }
  source = source.replace(
    'type AdminTab = "general" | "certificate" | "scenarios" | "knowledge" | "news" | "users";',
    'type AdminTab = "general" | "certificate" | "scenarios" | "knowledge" | "news" | "traffic" | "users";',
  );

  if (!source.includes('setTab("traffic")')) {
    source = source.replace(
      '{role === "admin" && <button role="tab" aria-selected={tab === "users"}',
      '{role === "admin" && <button role="tab" aria-selected={tab === "traffic"} className={tab === "traffic" ? "active" : ""} onClick={() => setTab("traffic")}>Thống kê truy cập</button>}\n        {role === "admin" && <button role="tab" aria-selected={tab === "users"}',
    );
  }

  if (!source.includes('tab === "traffic" && role === "admin"')) {
    source = source.replace(
      '{tab === "users" && role === "admin" && <div className="role-management">',
      '{tab === "traffic" && role === "admin" && <AdminTrafficAnalytics />}\n\n      {tab === "users" && role === "admin" && <div className="role-management">',
    );
  }

  if (source !== before) {
    await writeFile(file, source, "utf8");
    console.log("Patched admin traffic analytics tab.");
  }
}

function patchCsp(html) {
  if (html.includes(SUPABASE_ORIGINS)) return html;
  return html.replace(/connect-src 'self'([^;]*);/g, (_match, rest) => `connect-src 'self' ${SUPABASE_ORIGINS}${rest};`);
}

async function patchHtmlFile(file) {
  let html = await readFile(file, "utf8");
  const before = html;
  html = patchCsp(html);
  if (!html.includes('/web-analytics.js')) {
    if (html.includes('</body>')) html = html.replace('</body>', `  ${TRACKER_TAG}\n</body>`);
    else if (html.includes('</head>')) html = html.replace('</head>', `  ${TRACKER_TAG}\n</head>`);
  }
  if (html !== before) await writeFile(file, html, "utf8");
  return html !== before;
}

async function htmlFiles(dir) {
  const entries = await readdir(dir);
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry);
    const info = await stat(full);
    if (info.isDirectory()) files.push(...await htmlFiles(full));
    else if (entry.endsWith(".html")) files.push(full);
  }
  return files;
}

await patchAdmin();
let htmlChanged = 0;
for (const relativeRoot of ["public", "github-pages"]) {
  const root = path.join(ROOT, relativeRoot);
  for (const file of await htmlFiles(root)) {
    if (await patchHtmlFile(file)) htmlChanged += 1;
  }
}
console.log(`Realtime analytics tracker ensured on HTML pages (${htmlChanged} updated).`);
