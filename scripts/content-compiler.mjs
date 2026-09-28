import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();
const CONFIG_PATH = path.join(ROOT, "content", "content-architecture.json");

function assertRelativeScript(name) {
  if (!/^[a-z0-9-]+\.mjs$/i.test(name)) {
    throw new Error(`Invalid content stage name: ${name}`);
  }
  return path.join(ROOT, "scripts", name);
}

const config = JSON.parse(await readFile(CONFIG_PATH, "utf8"));
if (config.schemaVersion !== 1 || !Array.isArray(config.phases)) {
  throw new Error("Unsupported content architecture manifest.");
}

const seen = new Set();
for (const phase of config.phases) {
  if (!phase?.id || !Array.isArray(phase.stages)) {
    throw new Error("Every content phase requires an id and stage list.");
  }
  console.log(`\n[content] phase=${phase.id} :: ${phase.description ?? ""}`);
  for (const stage of phase.stages) {
    if (seen.has(stage)) throw new Error(`Duplicate content stage: ${stage}`);
    seen.add(stage);
    const file = assertRelativeScript(stage);
    console.log(`[content]   -> ${stage}`);
    await import(pathToFileURL(file).href);
  }
}

console.log(`\n[content] compiled ${seen.size} deterministic stages across ${config.phases.length} phases.`);
