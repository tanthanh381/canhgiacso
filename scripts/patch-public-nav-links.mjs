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
            <summary aria-label="Mở menu Cẩm nang" aria-current={view === "knowledge" ? "page" : undefined} className={view === "knowledge" ? "active" : ""}>Cẩm nang</summary>
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
  css += `\n\n${cssMarker}\n.topbar nav{align-items:center}.topbar nav>button,.knowledge-menu>summary{display:flex;align-items:center;justify-content:center;box-sizing:border-box;height:36px;min-height:36px;margin:0;padding:0 17px;line-height:1.2;font-size:14px;font-weight:650}.knowledge-menu{position:relative;display:flex;align-items:center;align-self:center;flex:0 0 auto;height:36px;margin:0;padding:0}.knowledge-menu>summary{list-style:none;border-radius:8px;color:var(--muted);cursor:pointer;white-space:nowrap;user-select:none}.knowledge-menu>summary::-webkit-details-marker{display:none}.knowledge-menu>summary::after{content:"";flex:0 0 auto;width:6px;height:6px;margin-left:8px;border-right:1.5px solid currentColor;border-bottom:1.5px solid currentColor;transform:rotate(45deg) translateY(-1px);transform-origin:center;transition:transform .16s ease}.knowledge-menu>summary.active,.knowledge-menu[open]>summary,.knowledge-menu>summary:hover,.knowledge-menu>summary:focus-visible{background:var(--surface);color:var(--ink);box-shadow:0 2px 8px rgba(20,50,43,.08)}.knowledge-menu[open]>summary::after{transform:rotate(225deg) translate(-1px,-1px)}.knowledge-submenu{position:absolute;top:calc(100% + 5px);left:0;z-index:60;display:grid;width:232px;padding:4px;border:1px solid color-mix(in srgb,var(--line) 88%,transparent);border-radius:10px;background:var(--surface);box-shadow:0 12px 30px rgba(15,23,42,.11)}.topbar nav .knowledge-submenu button{display:block;width:100%;height:auto;min-height:0;padding:9px 10px;text-align:left;border:0;border-radius:7px;color:var(--ink);background:transparent;line-height:normal}.topbar nav .knowledge-submenu button+button{margin-top:1px;border-top:1px solid color-mix(in srgb,var(--line) 72%,transparent);border-top-left-radius:0;border-top-right-radius:0}.topbar nav .knowledge-submenu button:hover,.topbar nav .knowledge-submenu button:focus-visible{background:color-mix(in srgb,var(--paper) 72%,var(--surface));color:var(--ink)}.knowledge-submenu strong,.knowledge-submenu small{display:block;white-space:nowrap}.knowledge-submenu strong{font-size:11.5px;line-height:1.3;font-weight:750}.knowledge-submenu small{margin-top:2px;color:var(--muted);font-size:9.5px;line-height:1.35;font-weight:500}@media(max-width:820px){.topbar nav:has(.knowledge-menu[open]){overflow:visible}.topbar nav>button,.knowledge-menu>summary{height:34px;min-height:34px;padding:0 12px}.knowledge-menu{height:34px}.knowledge-submenu{width:min(232px,calc(100vw - 32px));max-width:none}}@media(max-width:520px){.topbar nav>button,.knowledge-menu>summary{height:32px;min-height:32px;padding:0 6px;font-size:12px}.knowledge-menu{height:32px}.knowledge-submenu{top:calc(100% + 4px);width:min(224px,calc(100vw - 20px));padding:4px}.topbar nav .knowledge-submenu button{padding:9px}.knowledge-submenu strong{font-size:11px}.knowledge-submenu small{font-size:9px}}\n`;
  await writeFile(cssFile, css, "utf8");
  console.log("Added balanced Cẩm nang submenu styles.");
}
