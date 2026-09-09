from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file_path = Path(path)
    text = file_path.read_text(encoding="utf-8")
    if old not in text:
        raise SystemExit(f"Expected anchor not found in {path}: {old[:120]!r}")
    file_path.write_text(text.replace(old, new, 1), encoding="utf-8")


# app/data.ts
replace_once(
    "app/data.ts",
    '''export type SiteContent = {
  version: 1;
  copy: SiteCopy;
  scenarios: Scenario[];
  knowledgeCards: KnowledgeCard[];
};
''',
    '''export type CertificateTemplate = {
  organizationName: string;
  departmentName: string;
  eyebrow: string;
  title: string;
  recipientIntro: string;
  courseName: string;
  description: string;
  ratingLabel: string;
  accountLabel: string;
  codeLabel: string;
  issuedDateLabel: string;
  footerNote: string;
};

export type SiteContent = {
  version: 1;
  copy: SiteCopy;
  certificateTemplate: CertificateTemplate;
  scenarios: Scenario[];
  knowledgeCards: KnowledgeCard[];
};
''',
)

replace_once(
    "app/data.ts",
    '''  },
  scenarios,
  knowledgeCards,
};
''',
    '''  },
  certificateTemplate: {
    organizationName: "NGÂN HÀNG CP PHÁT TRIỂN TP. HỒ CHÍ MINH (HDBANK)",
    departmentName: "KHỐI AN NINH THÔNG TIN & BAN ĐÀO TẠO HDBANK",
    eyebrow: "CHỨNG NHẬN CHUYÊN MÔN HOÀN THÀNH DIỄN TẬP",
    title: "HOÀN THÀNH KHÓA ĐÀO TẠO AN TOÀN THÔNG TIN",
    recipientIntro: "Chứng nhận này được trân trọng trao cho:",
    courseName: "Cảnh Giác Số",
    description: "Đã hoàn thành toàn bộ chương trình diễn tập tương tác “{courseName}”, gồm {scenarioTotal} tình huống mô phỏng lừa đảo và an toàn thông tin; hoàn thành {completed}/{scenarioTotal} tình huống với {correct} lựa chọn an toàn.",
    ratingLabel: "XẾP LOẠI NĂNG LỰC",
    accountLabel: "Tài khoản",
    codeLabel: "Mã chứng chỉ",
    issuedDateLabel: "Cấp ngày",
    footerNote: "Chứng nhận hoàn thành nội dung đào tạo mô phỏng; không xác nhận chức danh, quan hệ lao động hoặc chứng chỉ hành nghề.",
  },
  scenarios,
  knowledgeCards,
};
''',
)

replace_once(
    "app/data.ts",
    '''  if (copyKeys.some((key) => !isText(copy[key], key.endsWith("Intro") || key === "footerNotice" ? 1000 : 180))) return null;
  if (!Array.isArray(candidate.scenarios) || candidate.scenarios.length < 1 || candidate.scenarios.length > 100) return null;
''',
    '''  if (copyKeys.some((key) => !isText(copy[key], key.endsWith("Intro") || key === "footerNotice" ? 1000 : 180))) return null;
  const certificateTemplateCandidate = candidate.certificateTemplate && typeof candidate.certificateTemplate === "object"
    ? candidate.certificateTemplate as Partial<CertificateTemplate>
    : defaultSiteContent.certificateTemplate;
  const certificateKeys: Array<keyof CertificateTemplate> = [
    "organizationName", "departmentName", "eyebrow", "title", "recipientIntro", "courseName",
    "description", "ratingLabel", "accountLabel", "codeLabel", "issuedDateLabel", "footerNote",
  ];
  if (certificateKeys.some((key) => !isText(
    certificateTemplateCandidate[key],
    key === "description" || key === "footerNote" ? 1200 : key === "organizationName" || key === "departmentName" || key === "title" ? 240 : 160,
  ))) return null;
  const normalizedCertificateTemplate = { ...certificateTemplateCandidate } as CertificateTemplate;
  if (!Array.isArray(candidate.scenarios) || candidate.scenarios.length < 1 || candidate.scenarios.length > 100) return null;
''',
)

replace_once(
    "app/data.ts",
    '''    version: 1,
    copy: normalizedCopy,
    scenarios: normalizedScenarios,
    knowledgeCards: normalizedKnowledgeCards,
''',
    '''    version: 1,
    copy: normalizedCopy,
    certificateTemplate: normalizedCertificateTemplate,
    scenarios: normalizedScenarios,
    knowledgeCards: normalizedKnowledgeCards,
''',
)

# app/admin.tsx
replace_once(
    "app/admin.tsx",
    'import { Difficulty, KnowledgeCard, Scenario, SiteContent, normalizeSiteContent } from "./data";\n',
    'import { CertificateTemplate, Difficulty, KnowledgeCard, Scenario, SiteContent, normalizeSiteContent } from "./data";\n',
)
replace_once(
    "app/admin.tsx",
    'type AdminTab = "general" | "scenarios" | "knowledge" | "users";\n',
    'type AdminTab = "general" | "certificate" | "scenarios" | "knowledge" | "users";\n',
)
replace_once(
    "app/admin.tsx",
    '''  function changeScenario(patch: Partial<Scenario>) {
''',
    '''  function changeCertificateTemplate(key: keyof CertificateTemplate, value: string) {
    setDraft((current) => ({
      ...current,
      certificateTemplate: { ...current.certificateTemplate, [key]: value },
    }));
  }

  function changeScenario(patch: Partial<Scenario>) {
''',
)
replace_once(
    "app/admin.tsx",
    '''        <button role="tab" aria-selected={tab === "general"} className={tab === "general" ? "active" : ""} onClick={() => setTab("general")}>Nội dung chung</button>
        <button role="tab" aria-selected={tab === "scenarios"} className={tab === "scenarios" ? "active" : ""} onClick={() => setTab("scenarios")}>Tình huống ({draft.scenarios.length})</button>
''',
    '''        <button role="tab" aria-selected={tab === "general"} className={tab === "general" ? "active" : ""} onClick={() => setTab("general")}>Nội dung chung</button>
        <button role="tab" aria-selected={tab === "certificate"} className={tab === "certificate" ? "active" : ""} onClick={() => setTab("certificate")}>Chứng chỉ</button>
        <button role="tab" aria-selected={tab === "scenarios"} className={tab === "scenarios" ? "active" : ""} onClick={() => setTab("scenarios")}>Tình huống ({draft.scenarios.length})</button>
''',
)
replace_once(
    "app/admin.tsx",
    '''      {tab === "scenarios" && selectedScenario && <div className="scenario-admin-layout">
''',
    '''      {tab === "certificate" && <div className="certificate-admin-layout">
        <div className="admin-section-title"><div><span className="eyebrow">MẪU CHỨNG CHỈ PDF</span><h2>Tùy chỉnh nội dung chứng chỉ</h2><p>Các biến trong ngoặc nhọn sẽ được thay bằng dữ liệu kết quả thực tế khi người dùng tải PDF.</p></div></div>
        <div className="certificate-token-note" role="note"><strong>Biến hỗ trợ</strong><span>{"{courseName}"} · {"{scenarioTotal}"} · {"{completed}"} · {"{correct}"} · {"{accuracy}"} · {"{score}"} · {"{rating}"} · {"{displayName}"} · {"{username}"} · {"{certificateCode}"}</span></div>
        <div className="admin-form-grid">
          {([
            ["organizationName", "Tên tổ chức", false],
            ["departmentName", "Đơn vị phụ trách", false],
            ["eyebrow", "Dòng tiêu đề nhỏ", false],
            ["title", "Tiêu đề chứng chỉ", false],
            ["recipientIntro", "Lời trao chứng nhận", false],
            ["courseName", "Tên chương trình / khóa đào tạo", false],
            ["ratingLabel", "Nhãn xếp loại", false],
            ["accountLabel", "Nhãn tài khoản", false],
            ["codeLabel", "Nhãn mã chứng chỉ", false],
            ["issuedDateLabel", "Nhãn ngày cấp", false],
            ["description", "Nội dung mô tả", true],
            ["footerNote", "Ghi chú cuối chứng chỉ", true],
          ] as Array<[keyof CertificateTemplate, string, boolean]>).map(([key, label, multiline]) => <label key={key} className={multiline ? "admin-wide" : ""}><span>{label}</span>{multiline ? <textarea rows={4} value={draft.certificateTemplate[key]} onChange={(event) => changeCertificateTemplate(key, event.target.value)} /> : <input value={draft.certificateTemplate[key]} onChange={(event) => changeCertificateTemplate(key, event.target.value)} />}</label>)}
        </div>
        <article className="certificate-admin-preview" aria-label="Xem trước nội dung chứng chỉ">
          <span className="eyebrow">XEM TRƯỚC NỘI DUNG</span>
          <strong>{draft.certificateTemplate.organizationName}</strong>
          <small>{draft.certificateTemplate.departmentName}</small>
          <em>{draft.certificateTemplate.eyebrow}</em>
          <h3>{draft.certificateTemplate.title}</h3>
          <p>{draft.certificateTemplate.recipientIntro}</p>
          <b>NGUYỄN VĂN A</b>
          <p>{draft.certificateTemplate.description
            .replaceAll("{courseName}", draft.certificateTemplate.courseName)
            .replaceAll("{scenarioTotal}", String(draft.scenarios.length))
            .replaceAll("{completed}", String(draft.scenarios.length))
            .replaceAll("{correct}", String(Math.round(draft.scenarios.length * .9)))
            .replaceAll("{accuracy}", "90")
            .replaceAll("{score}", String(Math.round(draft.scenarios.length * 120 * .9)))
            .replaceAll("{rating}", "XUẤT SẮC")
            .replaceAll("{displayName}", "NGUYỄN VĂN A")
            .replaceAll("{username}", "nguyenvana")
            .replaceAll("{certificateCode}", "CGS-2026-DEMO")}</p>
          <div><span>{draft.certificateTemplate.ratingLabel}</span><strong>XUẤT SẮC</strong></div>
          <small>{draft.certificateTemplate.footerNote}</small>
        </article>
      </div>}

      {tab === "scenarios" && selectedScenario && <div className="scenario-admin-layout">
''',
)

# app/certificate.ts
replace_once(
    "app/certificate.ts",
    'export type TrainingCertificate = {\n',
    'import type { CertificateTemplate } from "./data";\n\nexport type TrainingCertificate = {\n',
)
replace_once(
    "app/certificate.ts",
    '''function formatIssuedDate(value: string) {
''',
    '''function applyCertificateTemplate(template: string, certificate: TrainingCertificate, config: CertificateTemplate) {
  const values: Record<string, string> = {
    courseName: config.courseName,
    scenarioTotal: String(certificate.scenarioTotal),
    completed: String(certificate.completed),
    correct: String(certificate.correct),
    accuracy: String(certificate.accuracy),
    score: String(certificate.score),
    rating: certificate.rating,
    displayName: certificate.displayName,
    username: certificate.username,
    certificateCode: certificate.certificateCode,
  };
  return Object.entries(values).reduce((text, [key, value]) => text.replaceAll(`{${key}}`, value), template);
}

function formatIssuedDate(value: string) {
''',
)
replace_once(
    "app/certificate.ts",
    'async function renderCertificateCanvas(certificate: TrainingCertificate) {\n',
    'async function renderCertificateCanvas(certificate: TrainingCertificate, template: CertificateTemplate) {\n',
)
replacements = [
    ('context.fillText("NGÂN HÀNG CP PHÁT TRIỂN TP. HỒ CHÍ MINH (HDBANK)", 410, 145);', 'context.fillText(template.organizationName, 410, 145);'),
    ('context.fillText("KHỐI AN NINH THÔNG TIN & BAN ĐÀO TẠO HDBANK", 410, 184);', 'context.fillText(template.departmentName, 410, 184);'),
    ('context.fillText("CHỨNG NHẬN CHUYÊN MÔN HOÀN THÀNH DIỄN TẬP", 877, 288);', 'context.fillText(template.eyebrow, 877, 288);'),
    ('    "HOÀN THÀNH KHÓA ĐÀO TẠO AN TOÀN THÔNG TIN",', '    template.title,'),
    ('context.fillText("Chứng nhận này được trân trọng trao cho:", 877, 470);', 'context.fillText(template.recipientIntro, 877, 470);'),
    ('context.fillText(`Tài khoản: @${certificate.username}  |  Mã chứng chỉ: ${certificate.certificateCode}`, 877, 612);', 'context.fillText(`${template.accountLabel}: @${certificate.username}  |  ${template.codeLabel}: ${certificate.certificateCode}`, 877, 612);'),
    ('const description = `Đã hoàn thành toàn bộ chương trình diễn tập tương tác “Cảnh Giác Số”, gồm ${certificate.scenarioTotal} tình huống mô phỏng lừa đảo và an toàn thông tin; hoàn thành ${certificate.completed}/${certificate.scenarioTotal} tình huống với ${certificate.correct} lựa chọn an toàn.`;', 'const description = applyCertificateTemplate(template.description, certificate, template);'),
    ('context.fillText("XẾP LOẠI NĂNG LỰC", 877, 865);', 'context.fillText(template.ratingLabel, 877, 865);'),
    ('context.fillText(`Cấp ngày: ${formatIssuedDate(certificate.issuedAt)}`, 145, 1104);', 'context.fillText(`${template.issuedDateLabel}: ${formatIssuedDate(certificate.issuedAt)}`, 145, 1104);'),
    ('context.fillText(`Mã xác thực nội bộ: ${certificate.certificateCode}`, 1609, 1104);', 'context.fillText(`${template.codeLabel}: ${certificate.certificateCode}`, 1609, 1104);'),
    ('context.fillText("Chứng nhận hoàn thành nội dung đào tạo mô phỏng; không xác nhận chức danh, quan hệ lao động hoặc chứng chỉ hành nghề.", 877, 1150);', 'context.fillText(template.footerNote, 877, 1150);'),
]
for old, new in replacements:
    replace_once("app/certificate.ts", old, new)
replace_once(
    "app/certificate.ts",
    'export async function downloadTrainingCertificatePdf(certificate: TrainingCertificate) {\n  const canvas = await renderCertificateCanvas(certificate);\n',
    'export async function downloadTrainingCertificatePdf(certificate: TrainingCertificate, template: CertificateTemplate) {\n  const canvas = await renderCertificateCanvas(certificate, template);\n',
)

# app/page.tsx
replace_once(
    "app/page.tsx",
    'await downloadTrainingCertificatePdf(certificate);',
    'await downloadTrainingCertificatePdf(certificate, siteContent.certificateTemplate);',
)

# app/globals.css
css_path = Path("app/globals.css")
css = css_path.read_text(encoding="utf-8")
if ".certificate-admin-layout" not in css:
    css += '''\n\n/* Certificate template admin */
.certificate-admin-layout { display: grid; gap: 20px; }
.certificate-token-note { display: flex; flex-wrap: wrap; gap: 8px 16px; align-items: center; padding: 12px 14px; border: 1px solid var(--line); border-radius: 12px; background: color-mix(in srgb, var(--surface) 96%, #fff2cf); }
.certificate-token-note strong { font-size: 12px; }
.certificate-token-note span { color: var(--muted); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px; line-height: 1.6; }
.certificate-admin-preview { max-width: 960px; margin: 4px auto 0; width: 100%; padding: 30px; text-align: center; border: 2px dashed #d89a68; border-radius: 18px; background: linear-gradient(135deg, #fffaf0, #eef3f8); color: #0f172a; }
.certificate-admin-preview > strong { display: block; color: #c50000; font-size: 20px; }
.certificate-admin-preview > small { display: block; margin-top: 4px; color: #475569; }
.certificate-admin-preview > em { display: block; margin-top: 24px; color: #9a3e00; font-style: normal; font-weight: 700; font-size: 12px; }
.certificate-admin-preview h3 { margin: 8px 0 24px; font-family: Georgia, serif; font-size: clamp(24px, 4vw, 38px); }
.certificate-admin-preview > b { display: block; margin: 8px 0 16px; color: #b00000; font-family: Georgia, serif; font-size: 30px; }
.certificate-admin-preview > p { max-width: 760px; margin: 10px auto; line-height: 1.55; }
.certificate-admin-preview > div { display: inline-grid; gap: 4px; margin: 18px auto; padding: 12px 30px; border: 1px solid #e87500; border-radius: 12px; background: #f5e3bf; }
.certificate-admin-preview > div span { color: #7c2d12; font-size: 11px; font-weight: 700; }
.certificate-admin-preview > div strong { color: #a00000; font-size: 20px; }
'''
    css_path.write_text(css, encoding="utf-8")

# tests
Path("tests/certificate-template-admin.test.mjs").write_text('''import assert from "node:assert/strict";\nimport { readFile } from "node:fs/promises";\nimport test from "node:test";\n\ntest("certificate template is customizable from admin and used by PDF renderer", async () => {\n  const [data, admin, certificate, page] = await Promise.all([\n    readFile(new URL("../app/data.ts", import.meta.url), "utf8"),\n    readFile(new URL("../app/admin.tsx", import.meta.url), "utf8"),\n    readFile(new URL("../app/certificate.ts", import.meta.url), "utf8"),\n    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),\n  ]);\n  assert.match(data, /export type CertificateTemplate/);\n  assert.match(data, /certificateTemplate: CertificateTemplate/);\n  assert.match(admin, /tab === "certificate"/);\n  assert.match(admin, /Tùy chỉnh nội dung chứng chỉ/);\n  assert.match(admin, /Biến hỗ trợ/);\n  assert.match(certificate, /applyCertificateTemplate/);\n  assert.match(certificate, /template\.organizationName/);\n  assert.match(page, /siteContent\.certificateTemplate/);\n});\n\ntest("legacy published content receives the default certificate template", async () => {\n  const data = await readFile(new URL("../app/data.ts", import.meta.url), "utf8");\n  assert.match(data, /: defaultSiteContent\.certificateTemplate/);\n});\n''', encoding="utf-8")

print("Admin certificate template patch applied.")
