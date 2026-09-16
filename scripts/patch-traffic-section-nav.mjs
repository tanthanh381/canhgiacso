import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const componentFile = path.join(root, "app", "admin-traffic-analytics.tsx");
const cssFile = path.join(root, "app", "admin-traffic-analytics.css");

let component = await readFile(componentFile, "utf8");
const originalComponent = component;

const oldNav = `    <nav className="traffic-section-nav" aria-label="Các nhóm thống kê">\n      <a href="#traffic-overview">Tổng quan</a><a href="#traffic-acquisition">Thu hút</a><a href="#traffic-content">Nội dung</a><a href="#traffic-audience">Đối tượng</a><a href="#traffic-quality">Chất lượng dữ liệu</a>\n    </nav>`;

const newNav = `    <nav className="traffic-section-nav" aria-label="Các nhóm thống kê">\n      <button type="button" onClick={() => document.getElementById("traffic-overview")?.scrollIntoView({ behavior: "smooth", block: "start" })}>Tổng quan</button>\n      <button type="button" onClick={() => document.getElementById("traffic-acquisition")?.scrollIntoView({ behavior: "smooth", block: "start" })}>Thu hút</button>\n      <button type="button" onClick={() => document.getElementById("traffic-content")?.scrollIntoView({ behavior: "smooth", block: "start" })}>Nội dung</button>\n      <button type="button" onClick={() => document.getElementById("traffic-audience")?.scrollIntoView({ behavior: "smooth", block: "start" })}>Đối tượng</button>\n      <button type="button" onClick={() => document.getElementById("traffic-quality")?.scrollIntoView({ behavior: "smooth", block: "start" })}>Chất lượng dữ liệu</button>\n    </nav>`;

if (component.includes(oldNav)) {
  component = component.replace(oldNav, newNav);
} else if (!component.includes('document.getElementById("traffic-overview")?.scrollIntoView')) {
  throw new Error("Could not locate traffic section navigation to patch.");
}

if (component !== originalComponent) {
  await writeFile(componentFile, component, "utf8");
  console.log("Patched traffic section navigation to use explicit section scrolling.");
}

let css = await readFile(cssFile, "utf8");
const originalCss = css;

css = css.replace(
  ".traffic-section-nav a{flex:0 0 auto;padding:8px 12px;border-radius:9px;color:#475569;text-decoration:none;font-size:12px;font-weight:750}",
  ".traffic-section-nav a,.traffic-section-nav button{flex:0 0 auto;border:0;padding:8px 12px;border-radius:9px;background:transparent;color:#475569;text-decoration:none;font:inherit;font-size:12px;font-weight:750;cursor:pointer}",
);
css = css.replace(
  ".traffic-section-nav a:hover,.traffic-section-nav a:focus-visible{background:#fff;color:#991b1b;outline:none;box-shadow:0 2px 8px rgba(15,23,42,.08)}",
  ".traffic-section-nav a:hover,.traffic-section-nav a:focus-visible,.traffic-section-nav button:hover,.traffic-section-nav button:focus-visible{background:#fff;color:#991b1b;outline:none;box-shadow:0 2px 8px rgba(15,23,42,.08)}",
);
css = css.replace(
  ".traffic-section-nav a{padding:7px 10px}",
  ".traffic-section-nav a,.traffic-section-nav button{padding:7px 10px}",
);

if (css === originalCss && !css.includes(".traffic-section-nav button")) {
  throw new Error("Could not locate traffic section navigation styles to patch.");
}

if (css !== originalCss) {
  await writeFile(cssFile, css, "utf8");
  console.log("Patched traffic section navigation button styles.");
}
