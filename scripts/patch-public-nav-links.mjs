import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const pageFile = path.join(root, "app", "page.tsx");
const cssFile = path.join(root, "app", "globals.css");

let source = await readFile(pageFile, "utf8");
const before = source;

const originalButton = '<button aria-current={view === "knowledge" ? "page" : undefined} className={view === "knowledge" ? "active" : ""} onClick={() => navigateTo("knowledge")}>Cẩm nang</button>';
const legacyPatchedButton = '<button aria-current={undefined} className="" onClick={() => window.location.assign("/kien-thuc/")}>Cẩm nang</button>';
const knowledgeMenu = `<details className="knowledge-menu">
            <summary aria-label="Mở menu Cẩm nang">Cẩm nang</summary>
            <div className="knowledge-submenu" role="menu" aria-label="Cẩm nang">
              <button type="button" role="menuitem" onClick={() => window.location.assign("/kien-thuc/")}><strong>Bài viết kiến thức</strong><small>Hướng dẫn, cảnh báo và nội dung tra cứu</small></button>
              <button type="button" role="menuitem" onClick={() => { document.querySelector<HTMLDetailsElement>(".knowledge-menu")?.removeAttribute("open"); navigateTo("knowledge"); window.setTimeout(() => document.getElementById("security-checklist-title")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80); }}><strong>Danh sách kiểm tra</strong><small>Tự kiểm tra an toàn số và lưu tiến độ</small></button>
            </div>
          </details>`;

if (source.includes(originalButton)) {
  source = source.replace(originalButton, knowledgeMenu);
} else if (source.includes(legacyPatchedButton)) {
  source = source.replace(legacyPatchedButton, knowledgeMenu);
} else if (!source.includes('className="knowledge-menu"')) {
  throw new Error("Could not locate the Cẩm nang navigation control to patch.");
}

if (source !== before) {
  await writeFile(pageFile, source, "utf8");
  console.log("Patched Cẩm nang navigation with knowledge hub and security checklist submenu.");
}

let css = await readFile(cssFile, "utf8");
const cssMarker = "/* Cẩm nang dropdown navigation */";
if (!css.includes(cssMarker)) {
  css += `\n\n${cssMarker}\n.knowledge-menu{position:relative;flex:0 0 auto}.knowledge-menu>summary{list-style:none;padding:9px 17px;border-radius:8px;color:var(--muted);cursor:pointer;font-size:13px;font-weight:650;white-space:nowrap;user-select:none}.knowledge-menu>summary::-webkit-details-marker{display:none}.knowledge-menu>summary::after{content:"⌄";display:inline-block;margin-left:6px;font-size:11px;transition:transform .18s ease}.knowledge-menu[open]>summary,.knowledge-menu>summary:hover{background:var(--surface);color:var(--ink);box-shadow:0 2px 8px rgba(20,50,43,.08)}.knowledge-menu[open]>summary::after{transform:rotate(180deg)}.knowledge-submenu{position:absolute;top:calc(100% + 8px);left:0;z-index:60;display:grid;gap:3px;width:260px;padding:6px;border:1px solid var(--line);border-radius:12px;background:var(--surface);box-shadow:var(--shadow)}.topbar nav .knowledge-submenu button{display:block;width:100%;padding:10px 12px;text-align:left;border-radius:8px;color:var(--ink);background:transparent}.topbar nav .knowledge-submenu button:hover,.topbar nav .knowledge-submenu button:focus-visible{background:color-mix(in srgb,var(--paper) 75%,var(--surface))}.knowledge-submenu strong,.knowledge-submenu small{display:block}.knowledge-submenu strong{font-size:12px}.knowledge-submenu small{margin-top:3px;color:var(--muted);font-size:10px;line-height:1.35;font-weight:500}@media(max-width:820px){.knowledge-menu>summary{padding:8px 12px}.knowledge-submenu{position:fixed;top:auto;right:16px;bottom:16px;left:16px;width:auto;max-height:60vh;overflow:auto}}@media(max-width:520px){.knowledge-menu>summary{padding:8px 5px;font-size:12px}.knowledge-submenu{right:10px;bottom:10px;left:10px}}\n`;
  await writeFile(cssFile, css, "utf8");
  console.log("Added Cẩm nang submenu styles.");
}
