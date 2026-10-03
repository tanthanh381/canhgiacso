import { readFileSync } from "node:fs";

/** Directory that holds every stylesheet of the app (see app/styles/index.css for the order and the cascade layers). */
export const stylesDir = new URL("../../app/styles/", import.meta.url);

export const readStyle = (name) => readFileSync(new URL(name, stylesDir), "utf8");

/** All stylesheets imported by app/styles/index.css, concatenated in import order (the order that decides the cascade). */
export function readAppStyles() {
  const index = readStyle("index.css");
  const files = [...index.matchAll(/@import\s+(?:url\()?["']\.\/([^"']+)["']/g)].map((match) => match[1]);
  return files.map(readStyle).join("\n");
}

/**
 * Minimal CSS reader for tests: returns one entry per style rule with its at-rule context
 * (for example "@media (max-width: 900px)" or "@layer components > @media (...)"), selector list and declarations.
 * It understands comments, nested at-rules and `!important`; it is not a general CSS parser.
 */
export function parseCss(css) {
  const source = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const rules = [];
  let order = 0;
  const walk = (text, ctx) => {
    let index = 0;
    while (index < text.length) {
      const open = text.indexOf("{", index);
      const statementEnd = text.indexOf(";", index);
      if (open === -1) break;
      if (statementEnd !== -1 && statementEnd < open) { index = statementEnd + 1; continue; } // @import / @layer a, b;
      let depth = 1;
      let close = open + 1;
      while (close < text.length && depth) { if (text[close] === "{") depth++; else if (text[close] === "}") depth--; close++; }
      const prelude = text.slice(index, open).trim();
      const body = text.slice(open + 1, close - 1);
      if (prelude.startsWith("@")) {
        if (/^@(media|layer|supports|container)/.test(prelude)) walk(body, ctx ? `${ctx} > ${prelude.replace(/\s+/g, " ")}` : prelude.replace(/\s+/g, " "));
      } else {
        const decls = [];
        for (const part of body.split(/;(?![^(]*\))/)) {
          const colon = part.indexOf(":");
          if (colon === -1) continue;
          const prop = part.slice(0, colon).trim();
          let value = part.slice(colon + 1).trim().replace(/\s+/g, " ");
          const important = /\s*!important$/.test(value);
          if (important) value = value.replace(/\s*!important$/, "");
          if (prop) decls.push({ prop, value, important });
        }
        rules.push({ ctx, selectors: prelude.split(/,(?![^(]*\))/).map((s) => s.trim().replace(/\s+/g, " ")), decls, order: order++ });
      }
      index = close;
    }
  };
  walk(source, "");
  return rules;
}

/** Last declared value of `prop` among the rules whose selector list contains `selector` inside `ctx` (exact match; "" = unconditional). */
export function declOf(css, selector, prop, ctx = "") {
  let found;
  for (const rule of parseCss(css)) {
    if (rule.ctx !== ctx || !rule.selectors.includes(selector)) continue;
    for (const decl of rule.decls) if (decl.prop === prop) found = decl.value;
  }
  return found;
}

/** All distinct contexts in which `selector` declares `prop`. */
export function contextsOf(css, selector, prop) {
  const out = new Set();
  for (const rule of parseCss(css)) if (rule.selectors.includes(selector) && rule.decls.some((d) => d.prop === prop)) out.add(rule.ctx);
  return [...out];
}

/** Number of `!important` declarations. */
export const countImportant = (css) => parseCss(css).reduce((n, rule) => n + rule.decls.filter((d) => d.important).length, 0);
