import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const file = path.join(process.cwd(), "app", "page.tsx");
let source = await readFile(file, "utf8");
const before = source;

source = source.replace(
  '<button aria-current={view === "knowledge" ? "page" : undefined} className={view === "knowledge" ? "active" : ""} onClick={() => navigateTo("knowledge")}>Cẩm nang</button>',
  '<button aria-current={undefined} className="" onClick={() => window.location.assign("/kien-thuc/")}>Cẩm nang</button>',
);

if (source !== before) {
  await writeFile(file, source, "utf8");
  console.log("Patched Cẩm nang navigation to canonical /kien-thuc/ URL.");
} else if (!source.includes('window.location.assign("/kien-thuc/")}>Cẩm nang</button>')) {
  throw new Error("Could not locate the Cẩm nang navigation button to patch.");
}
