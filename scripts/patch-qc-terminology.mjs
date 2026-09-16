import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const file = path.join(process.cwd(), "app", "data.ts");
let source = await readFile(file, "utf8");
const marker = 'category: scenario.category === "Deepfake"';

if (!source.includes(marker)) {
  const needle = `  const normalizedScenarios = (candidate.scenarios as Scenario[]).map((scenario) => ({\n    ...scenario,\n    choices:`;
  const replacement = `  const normalizedScenarios = (candidate.scenarios as Scenario[]).map((scenario) => ({\n    ...scenario,\n    category: scenario.category === "Deepfake"\n      ? "Giả mạo bằng AI (deepfake)"\n      : scenario.category === "Phishing"\n        ? "Lừa đảo giả mạo (phishing)"\n        : scenario.category === "Brandname giả"\n          ? "SMS Brandname giả mạo"\n          : scenario.category,\n    channel: scenario.channel === "Video call"\n      ? "Cuộc gọi video"\n      : scenario.channel === "Nhóm chat"\n        ? "Nhóm trò chuyện"\n        : scenario.channel,\n    choices:`;
  if (!source.includes(needle)) {
    throw new Error("QC terminology patch: normalizeSiteContent scenario block not found");
  }
  source = source.replace(needle, replacement);
  await writeFile(file, source, "utf8");
  console.log("QC terminology: normalized scenario categories and channels.");
} else {
  console.log("QC terminology: already normalized.");
}
