import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const PUBLIC_ROOT = path.join(ROOT, "public");
const KNOWLEDGE_ROOT = path.join(PUBLIC_ROOT, "kien-thuc");
const METHODOLOGY_FILE = path.join(PUBLIC_ROOT, "phuong-phap-kiem-chung", "index.html");
const REVIEW_DATE = "2026-09-17";
const REVIEW_DISPLAY = "17/09/2026";
const SITE = "https://canhgiacso.com";
const EXPECTED_TOPIC_COUNT = 31;

const TIER_1_DOMAINS = new Set([
  "bocongan.gov.vn",
  "sbv.gov.vn",
  "ssc.gov.vn",
  "mic.gov.vn",
]);

const TIER_2_DOMAINS = new Set([
  "support.microsoft.com",
  "safety.google",
]);

function countMatches(text, regex) {
  return [...text.matchAll(regex)].length;
}

function normalizedDomain(rawUrl) {
  const hostname = new URL(rawUrl).hostname.toLowerCase();
  return hostname.startsWith("www.") ? hostname.slice(4) : hostname;
}

function normalizeUrl(rawUrl) {
  const parsed = new URL(rawUrl);
  parsed.hash = "";
  return parsed.toString();
}

function classifySource(rawUrl) {
  const domain = normalizedDomain(rawUrl);
  if (TIER_1_DOMAINS.has(domain)) {
    return { tier: 1, domain, label: "Cấp 1 · nguồn có thẩm quyền" };
  }
  if (TIER_2_DOMAINS.has(domain)) {
    return { tier: 2, domain, label: "Cấp 2 · nguồn vận hành/kỹ thuật" };
  }
  return { tier: 3, domain, label: "Cấp 3 · nguồn bổ trợ" };
}

function cleanText(value) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function extractSourceSection(html) {
  const matches = [...html.matchAll(/<section data-qc-wave2="sources">[\s\S]*?<\/section>/g)];
  return { matches, section: matches[0]?.[0] ?? "" };
}

function extractSources(section, slug, errors) {
  const sources = [];
  const anchorRegex = /<a href="([^"]+)" target="_blank" rel="([^"]*)">([\s\S]*?)<\/a><br\/><span>([\s\S]*?)<\/span>/g;

  for (const match of section.matchAll(anchorRegex)) {
    const [, rawUrl, rel, rawLabel, rawNote] = match;
    let parsed;
    try {
      parsed = new URL(rawUrl);
    } catch {
      errors.push(`${slug}: invalid source URL ${rawUrl}`);
      continue;
    }

    if (parsed.protocol !== "https:") {
      errors.push(`${slug}: source must use HTTPS: ${rawUrl}`);
    }

    const relTokens = new Set(rel.split(/\s+/).filter(Boolean));
    if (!relTokens.has("noopener") || !relTokens.has("noreferrer")) {
      errors.push(`${slug}: target=_blank source missing noopener/noreferrer: ${rawUrl}`);
    }

    const classification = classifySource(rawUrl);
    sources.push({
      url: normalizeUrl(rawUrl),
      label: cleanText(rawLabel),
      note: cleanText(rawNote),
      ...classification,
    });
  }

  return sources;
}

function validateTrustFloor(slug, sources, errors) {
  if (sources.length < 2) {
    errors.push(`${slug}: expected at least two topic-specific sources, found ${sources.length}`);
  }

  const uniqueUrls = new Set(sources.map((source) => source.url));
  if (uniqueUrls.size !== sources.length) {
    errors.push(`${slug}: duplicate source URL found in topic source block`);
  }

  const tier1Count = sources.filter((source) => source.tier === 1).length;
  const tier2Domains = new Set(sources.filter((source) => source.tier === 2).map((source) => source.domain));
  if (tier1Count === 0 && tier2Domains.size < 2) {
    errors.push(`${slug}: evidence floor not met; require one tier-1 source or two independent tier-2 domains`);
  }
}

function annotateSourceSection(section, sources) {
  let annotated = section.replace(/<p data-qc-wave3="evidence-trace">[\s\S]*?<\/p>/g, "");
  annotated = annotated.replace(/\sdata-source-tier="\d"/g, "");
  annotated = annotated.replace(/\sdata-source-domain="[^"]+"/g, "");
  annotated = annotated.replace(/\sdata-source-checked="[^"]+"/g, "");

  const tier1Count = sources.filter((source) => source.tier === 1).length;
  const tier2Count = sources.filter((source) => source.tier === 2).length;
  const trace = `<p data-qc-wave3="evidence-trace"><strong>Dấu vết dẫn chứng:</strong> ${sources.length} nguồn độc lập · ${tier1Count} nguồn cấp 1 · ${tier2Count} nguồn cấp 2. Danh sách được đánh số để thuận tiện đối chiếu.</p>`;
  annotated = annotated.replace(
    "<h2>Nguồn kiểm chứng theo chủ đề</h2>",
    `<h2>Nguồn kiểm chứng theo chủ đề</h2>${trace}`,
  );

  annotated = annotated.replace('<ul class="seo-checklist">', '<ol class="seo-checklist" data-qc-wave3="numbered-sources">');
  annotated = annotated.replace(/<\/ul>(?=<p class="seo-safety">)/, "</ol>");

  for (const source of sources) {
    const escapedUrl = source.url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const liPattern = new RegExp(`<li><a href="${escapedUrl}"`);
    annotated = annotated.replace(
      liPattern,
      `<li data-source-tier="${source.tier}" data-source-domain="${source.domain}" data-source-checked="${REVIEW_DATE}"><a href="${source.url}"`,
    );
  }

  annotated = annotated.replace(
    /Nguồn được rà soát ngày <time datetime="[^"]+">[^<]+<\/time>/,
    `Nguồn được rà soát ngày <time datetime="${REVIEW_DATE}">${REVIEW_DISPLAY}</time>`,
  );

  return annotated;
}

function updateFreshness(html) {
  let next = html;
  next = next.replace(/Cập nhật ngày \d{2}\/\d{2}\/\d{4}/g, `Cập nhật ngày ${REVIEW_DISPLAY}`);
  next = next.replace(/Rà soát \d{2}\/\d{2}\/\d{4}/g, `Rà soát ${REVIEW_DISPLAY}`);
  next = next.replace(/(<meta property="article:modified_time" content=")[^"]+("\s*\/?>)/g, `$1${REVIEW_DATE}$2`);
  next = next.replace(/("dateModified"\s*:\s*")[^"]+("\s*[},])/g, `$1${REVIEW_DATE}$2`);
  return next;
}

function validatePageSemantics(slug, html, errors) {
  const h1Count = countMatches(html, /<h1(?:\s|>)/g);
  if (h1Count !== 1) errors.push(`${slug}: expected exactly one H1, found ${h1Count}`);

  const canonicalCount = countMatches(html, /<link rel="canonical"/g);
  if (canonicalCount !== 1) errors.push(`${slug}: expected exactly one canonical URL, found ${canonicalCount}`);

  const sourceSectionCount = countMatches(html, /data-qc-wave2="sources"/g);
  if (sourceSectionCount !== 1) errors.push(`${slug}: expected exactly one QC source section, found ${sourceSectionCount}`);

  const wave3TraceCount = countMatches(html, /data-qc-wave3="evidence-trace"/g);
  if (wave3TraceCount > 1) errors.push(`${slug}: duplicate Wave 3 evidence trace block`);
}

function methodologyWave3Section() {
  return `<section id="dau-vet-dan-chung" data-qc-wave3="methodology"><h2>Dấu vết dẫn chứng và vòng đời nguồn</h2><p>Mỗi bài kiến thức phải có ít nhất hai nguồn theo chủ đề. Ưu tiên nguồn cấp 1 từ cơ quan có thẩm quyền; khi không có nguồn cấp 1 phù hợp, nội dung phải được đối chiếu từ ít nhất hai nguồn cấp 2 độc lập.</p><ul class="seo-checklist"><li><strong>Truy xuất được:</strong> nguồn dẫn được đánh số, gắn cấp nguồn, tên miền và ngày rà soát trong HTML để phục vụ kiểm tra lại.</li><li><strong>Không dùng link yếu:</strong> nguồn kiểm chứng phải dùng HTTPS, không dùng URL rút gọn và không lặp cùng một URL trong một chủ đề.</li><li><strong>Kiểm soát freshness:</strong> khi rà soát nội dung, ngày kiểm chứng nguồn và <code>dateModified</code> phải được cập nhật đồng bộ.</li><li><strong>Nguồn biến mất hoặc thay đổi:</strong> không giữ link chết như bằng chứng. Biên tập viên phải thay bằng nguồn tương đương có thẩm quyền, hoặc hạ mức độ chắc chắn của nội dung.</li><li><strong>Nguồn mâu thuẫn:</strong> ưu tiên nguồn cấp cao hơn và mô tả rõ điểm chưa thống nhất thay vì chọn một kết luận chắc chắn khi chứng cứ chưa đủ.</li></ul><p>Build QC Wave 3 đồng thời sinh <a href="/source-manifest.json">source manifest</a> máy đọc được để phục vụ audit và kiểm thử hồi quy.</p></section>`;
}

async function patchMethodology(errors) {
  let html;
  try {
    html = await readFile(METHODOLOGY_FILE, "utf8");
  } catch {
    errors.push("methodology: missing generated /phuong-phap-kiem-chung/index.html");
    return;
  }

  for (const required of [
    "Thứ bậc nguồn được ưu tiên",
    "Quy trình kiểm chứng 5 bước",
    "Cách diễn đạt mức độ chắc chắn",
    "Chuẩn thuật ngữ của Cảnh Giác Số",
  ]) {
    if (!html.includes(required)) errors.push(`methodology: missing Wave 2 governance section: ${required}`);
  }

  html = html.replace(/<section id="dau-vet-dan-chung" data-qc-wave3="methodology">[\s\S]*?<\/section>/g, "");
  html = html.replace("</main>", `${methodologyWave3Section()}</main>`);
  html = html.replace(/Rà soát gần nhất: <time datetime="[^"]+">[^<]+<\/time> · QC Wave \d+/, `Rà soát gần nhất: <time datetime="${REVIEW_DATE}">${REVIEW_DISPLAY}</time> · QC Wave 3`);
  html = html.replace(/("dateModified"\s*:\s*")[^"]+("\s*[},])/g, `$1${REVIEW_DATE}$2`);

  if (countMatches(html, /data-qc-wave3="methodology"/g) !== 1) {
    errors.push("methodology: expected exactly one Wave 3 methodology section");
  }

  await writeFile(METHODOLOGY_FILE, html, "utf8");
}

async function main() {
  const errors = [];
  const entries = await readdir(KNOWLEDGE_ROOT, { withFileTypes: true });
  const articleDirs = entries.filter((entry) => entry.isDirectory()).sort((a, b) => a.name.localeCompare(b.name));
  const manifestPages = [];

  for (const entry of articleDirs) {
    const slug = entry.name;
    const file = path.join(KNOWLEDGE_ROOT, slug, "index.html");
    let html;
    try {
      html = await readFile(file, "utf8");
    } catch {
      continue;
    }

    const { matches, section } = extractSourceSection(html);
    if (matches.length === 0) {
      errors.push(`${slug}: missing topic-specific QC source section`);
      continue;
    }
    if (matches.length !== 1) {
      errors.push(`${slug}: duplicate QC source sections found (${matches.length})`);
      continue;
    }

    const sources = extractSources(section, slug, errors);
    validateTrustFloor(slug, sources, errors);
    validatePageSemantics(slug, html, errors);

    const annotatedSection = annotateSourceSection(section, sources);
    html = html.replace(section, annotatedSection);
    html = updateFreshness(html);
    validatePageSemantics(slug, html, errors);

    await writeFile(file, html, "utf8");
    manifestPages.push({
      slug,
      url: `${SITE}/kien-thuc/${slug}/`,
      reviewedAt: REVIEW_DATE,
      sourceCount: sources.length,
      trustFloor: sources.some((source) => source.tier === 1) ? "tier-1-present" : "two-independent-tier-2",
      sources,
    });
  }

  if (manifestPages.length !== EXPECTED_TOPIC_COUNT) {
    errors.push(`knowledge coverage: expected ${EXPECTED_TOPIC_COUNT} governed topics, found ${manifestPages.length}`);
  }

  await patchMethodology(errors);

  const uniqueGlobalSources = new Map();
  for (const page of manifestPages) {
    for (const source of page.sources) {
      if (!uniqueGlobalSources.has(source.url)) uniqueGlobalSources.set(source.url, source);
    }
  }

  const manifest = {
    schemaVersion: 1,
    qcWave: 3,
    generatedAt: REVIEW_DATE,
    methodologyUrl: `${SITE}/phuong-phap-kiem-chung/`,
    governedTopicCount: manifestPages.length,
    uniqueSourceCount: uniqueGlobalSources.size,
    trustModel: {
      tier1: "Cơ quan có thẩm quyền / cơ quan quản lý",
      tier2: "Chủ thể vận hành dịch vụ hoặc nhà cung cấp công nghệ",
      tier3: "Nguồn bổ trợ có danh tính rõ ràng",
    },
    pages: manifestPages,
  };

  await mkdir(PUBLIC_ROOT, { recursive: true });
  await writeFile(path.join(PUBLIC_ROOT, "source-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  if (errors.length) {
    throw new Error(`QC Wave 3 failed:\n- ${errors.join("\n- ")}`);
  }

  console.log(`QC Wave 3: governed ${manifestPages.length} knowledge topics and ${uniqueGlobalSources.size} unique sources.`);
}

await main();
