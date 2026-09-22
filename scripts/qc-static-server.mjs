import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";

const root = resolve(process.env.QC_STATIC_ROOT || "docs");
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "127.0.0.1";

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".pdf": "application/pdf",
};

function resolveRequest(urlPath) {
  const clean = decodeURIComponent((urlPath || "/").split("?")[0].split("#")[0]);
  const relative = normalize(clean).replace(/^([/\\])+/, "");
  let candidate = resolve(root, relative || ".");
  if (candidate !== root && !candidate.startsWith(root + sep)) return null;
  if (existsSync(candidate) && statSync(candidate).isDirectory()) candidate = join(candidate, "index.html");
  if (!existsSync(candidate) && !extname(candidate)) candidate = join(candidate, "index.html");
  return existsSync(candidate) && statSync(candidate).isFile() ? candidate : null;
}

const server = createServer((req, res) => {
  const file = resolveRequest(req.url);
  if (!file) {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" });
    res.end("Not found");
    return;
  }
  res.writeHead(200, {
    "content-type": types[extname(file).toLowerCase()] || "application/octet-stream",
    "cache-control": "no-store",
  });
  if (req.method === "HEAD") {
    res.end();
    return;
  }
  createReadStream(file).pipe(res);
});

server.listen(port, host, () => {
  process.stdout.write(`QC static server listening at http://${host}:${port}\n`);
});
