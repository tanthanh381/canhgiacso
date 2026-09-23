import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const file = path.join(process.cwd(), "app", "page.tsx");
let source = await readFile(file, "utf8");

const helperMarker = "scenarioCategoryLabel";
const helperAvailable = source.includes('from "./domains/training/presentation"') && source.includes(helperMarker);
if (!helperAvailable && !source.includes("function scenarioCategoryLabel")) {
  const anchor = 'const PHISHING_QUIZ_URL = "https://phishingquiz.withgoogle.com/?hl=vi";';
  const helpers = `${anchor}\n\nfunction scenarioCategoryLabel(category: string) {\n  if (category === "Deepfake") return "Giả mạo bằng AI (deepfake)";\n  if (category === "Phishing") return "Lừa đảo giả mạo (phishing)";\n  if (category === "Brandname giả") return "SMS Brandname giả mạo";\n  return category;\n}\n\nfunction scenarioChannelLabel(channel: string) {\n  if (channel === "Video call") return "Cuộc gọi video";\n  if (channel === "Nhóm chat") return "Nhóm trò chuyện";\n  return channel;\n}`;
  if (!source.includes(anchor)) {
    throw new Error("QC terminology patch: page helper anchor not found");
  }
  source = source.replace(anchor, helpers);
}

const listBefore = '`${item.channel} · ${item.category}`';
const listAfter = '`${scenarioChannelLabel(item.channel)} · ${scenarioCategoryLabel(item.category)}`';
if (source.includes(listBefore)) source = source.replace(listBefore, listAfter);

const metaBefore = '<span>{selected.channel}</span><span>{selected.category}</span>';
const metaAfter = '<span>{scenarioChannelLabel(selected.channel)}</span><span>{scenarioCategoryLabel(selected.category)}</span>';
if (source.includes(metaBefore)) source = source.replace(metaBefore, metaAfter);

if (!source.includes(listAfter) || !source.includes(metaAfter)) {
  throw new Error("QC terminology patch: scenario presentation targets not found");
}

await writeFile(file, source, "utf8");
console.log("QC terminology: standardized scenario labels at the presentation layer without changing stored content.");
