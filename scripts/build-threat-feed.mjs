import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { webcrypto } from "node:crypto";

if (!globalThis.crypto) globalThis.crypto = webcrypto;

await import("../public/scam-check.js");
const ScamCheck = globalThis.ScamCheck;

const ROOT = process.cwd();
const OUT = path.join(ROOT, "public", "threat-data");
const INTERNAL = path.join(ROOT, "content", "threat-feed", "internal-blocklist.json");
const TIMEOUT_MS = 30_000;

const SHARED_PLATFORMS = [
  "github.com", "githubusercontent.com", "github.io", "dropbox.com", "dropboxusercontent.com", "google.com", "googleusercontent.com",
  "discordapp.com", "discord.com", "mediafire.com", "mega.nz", "pastebin.com", "telegram.org", "t.me", "onedrive.live.com",
  "sharepoint.com", "firebaseapp.com", "web.app", "wetransfer.com", "bit.ly", "amazonaws.com", "cloudfront.net", "azurewebsites.net",
  "blogspot.com", "weebly.com", "wixsite.com", "herokuapp.com", "netlify.app", "vercel.app", "pages.dev", "workers.dev", "gitlab.io", "sourceforge.net",
];

const isSharedPlatform = (host) => SHARED_PLATFORMS.some((domain) => host === domain || host.endsWith(`.${domain}`));
const isIpv4 = (host) => /^\d{1,3}(\.\d{1,3}){3}$/.test(host);

async function fetchText(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { "User-Agent": "canhgiacso-threat-feed/1.0 (+https://canhgiacso.com)" } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

const lines = (text) => text.split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith("#"));

const hostKeys = new Map();
const urlKeys = new Map();
const ipEntries = new Map();
const cidrEntries = new Map();
const phoneKeys = {};
const emailKeys = {};
const sources = [];

async function addHost(host, source) {
  hostKeys.set(await ScamCheck.feedKey(`h:${host}`), source);
}

async function addUrl(raw, source, { hostLevel }) {
  const url = ScamCheck.normalizeUrlInput(raw);
  if (!url) return false;
  urlKeys.set(await ScamCheck.feedKey(`u:${ScamCheck.feedUrlKey(url)}`), source);
  const host = url.hostname.toLowerCase();
  if (hostLevel && (isIpv4(host) || !isSharedPlatform(host))) await addHost(host, source);
  return true;
}

async function runSource(def) {
  const entry = { id: def.id, name: def.name, url: def.url, license: def.license, count: 0, status: "ok" };
  try {
    const text = await fetchText(def.url);
    entry.count = await def.ingest(lines(text));
    if (!entry.count) throw new Error("empty feed");
  } catch (error) {
    entry.status = `error: ${error.message}`;
    console.warn(`[threat-feed] ${def.id} skipped: ${error.message}`);
  }
  sources.push(entry);
}

await runSource({
  id: "uh",
  name: "URLhaus (abuse.ch)",
  url: "https://urlhaus.abuse.ch/downloads/text_online/",
  license: "CC0",
  async ingest(list) {
    let count = 0;
    for (const raw of list) if (await addUrl(raw, "uh", { hostLevel: true })) count += 1;
    return count;
  },
});

await runSource({
  id: "fe",
  name: "Feodo Tracker (abuse.ch)",
  url: "https://feodotracker.abuse.ch/downloads/ipblocklist.txt",
  license: "CC0",
  async ingest(list) {
    let count = 0;
    for (const ip of list) {
      if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) continue;
      ipEntries.set(ip, "fe");
      await addHost(ip, "fe");
      count += 1;
    }
    return count;
  },
});

let internalCount = 0;
try {
  const internal = JSON.parse(await readFile(INTERNAL, "utf8"));
  for (const domain of internal.domains || []) { await addHost(String(domain).trim().toLowerCase(), "in"); internalCount += 1; }
  for (const url of internal.urls || []) { if (await addUrl(url, "in", { hostLevel: false })) internalCount += 1; }
  for (const ip of internal.ips || []) {
    if (String(ip).includes("/")) cidrEntries.set(String(ip), "in"); else ipEntries.set(String(ip), "in");
    internalCount += 1;
  }
  for (const phone of internal.phones || []) { phoneKeys[await ScamCheck.feedKey(`p:${ScamCheck.normalizePhone(phone).national}`)] = 1; internalCount += 1; }
  for (const email of internal.emails || []) { emailKeys[await ScamCheck.feedKey(`e:${String(email).trim().toLowerCase()}`)] = 1; internalCount += 1; }
  sources.push({ id: "in", name: "Danh sách nội bộ Cảnh Giác Số", url: "", license: "Biên tập nội bộ", count: internalCount, status: "ok" });
} catch (error) {
  console.warn(`[threat-feed] internal list skipped: ${error.message}`);
}

await rm(OUT, { recursive: true, force: true });
await mkdir(path.join(OUT, "s"), { recursive: true });

const shards = new Map();
for (const prefix of Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, "0"))) shards.set(prefix, { h: {}, u: {} });
for (const [key, source] of hostKeys) shards.get(key.slice(0, 2)).h[key] = source;
for (const [key, source] of urlKeys) shards.get(key.slice(0, 2)).u[key] = source;
for (const [prefix, shard] of shards) await writeFile(path.join(OUT, "s", `${prefix}.json`), JSON.stringify(shard));

await writeFile(path.join(OUT, "ip.json"), JSON.stringify({ ips: [...ipEntries], cidrs: [...cidrEntries] }));
await writeFile(path.join(OUT, "internal.json"), JSON.stringify({ p: phoneKeys, e: emailKeys }));
await writeFile(path.join(OUT, "meta.json"), JSON.stringify({ generatedAt: new Date().toISOString(), sources }, null, 2));

console.log(`[threat-feed] hosts=${hostKeys.size} urls=${urlKeys.size} ips=${ipEntries.size} sources=${sources.map((s) => `${s.id}:${s.status}`).join(",")}`);
