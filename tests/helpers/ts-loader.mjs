// Shared helper for behavioural tests: loads TypeScript modules from the repo,
// transpiles them to CommonJS with the project's own TypeScript and EXECUTES
// them, so tests can call the real functions instead of regex-matching source.
//
//   const load = createTsLoader();
//   const { getUnlockedDifficulties } = load("app/progression.ts");
//
// Relative imports (.ts/.tsx/.json/index) are resolved and loaded recursively,
// `import type` is erased by the transpiler, and bare specifiers must be
// provided through `stubs` (Node built-ins such as "node:assert" are allowed).
// `globals` are injected as free variables of every loaded module (for example
// a fake `window`), without touching the real global object.
import { existsSync, readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");

export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

const EXTENSIONS = ["", ".ts", ".tsx", ".json", "/index.ts", "/index.tsx"];

function resolveFile(fromDir, specifier) {
  const base = isAbsolute(specifier) ? specifier : resolve(fromDir, specifier);
  for (const extension of EXTENSIONS) {
    const candidate = base + extension;
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  throw new Error(`ts-loader: cannot resolve "${specifier}" from ${fromDir}`);
}

export function createTsLoader({ stubs = {}, globals = {} } = {}) {
  const cache = new Map();
  const globalNames = Object.keys(globals);
  const globalValues = Object.values(globals);

  function loadFile(file) {
    if (cache.has(file)) return cache.get(file).exports;
    if (file.endsWith(".json")) {
      const parsed = JSON.parse(readFileSync(file, "utf8"));
      cache.set(file, { exports: parsed });
      return parsed;
    }
    const source = readFileSync(file, "utf8");
    const { outputText } = ts.transpileModule(source, {
      fileName: file,
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    });
    const moduleRecord = { exports: {} };
    cache.set(file, moduleRecord);
    const localRequire = (specifier) => {
      if (Object.hasOwn(stubs, specifier)) return stubs[specifier];
      if (specifier.startsWith("node:")) return require(specifier);
      if (specifier.startsWith(".") || isAbsolute(specifier)) return loadFile(resolveFile(dirname(file), specifier));
      throw new Error(`ts-loader: bare import "${specifier}" in ${file} needs an entry in stubs`);
    };
    new Function("exports", "require", "module", ...globalNames, outputText)(
      moduleRecord.exports,
      localRequire,
      moduleRecord,
      ...globalValues,
    );
    return moduleRecord.exports;
  }

  /** Load a repo-relative (or absolute) TypeScript/JSON file and return its exports. */
  return function load(path) {
    return loadFile(resolveFile(repoRoot, path));
  };
}
