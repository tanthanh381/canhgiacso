import { readFileSync } from "node:fs";

/** Directory with the header / navigation / drawers components (app/domains/shell). */
const shellDir = new URL("../../app/domains/shell/", import.meta.url);

export const readShell = (name) => readFileSync(new URL(name, shellDir), "utf8");

/** Every file of the shell domain, concatenated: for tests that look for markup wherever the shell puts it. */
export const readAllShell = () => ["view.tsx", "mobile-nav.tsx", "management-menu.tsx", "simulation-banner.tsx", "drawers.tsx", "header-menus.ts", "navigation.ts", "skip-link.tsx"]
  .map(readShell).join("\n");

/** Labels of PRIMARY_NAV in order, as declared in navigation.ts. */
export const primaryNavLabels = () => [...readShell("navigation.ts").matchAll(/\{ view: "[a-z]+", label: "([^"]+)"/g)].map((match) => match[1]);
