from pathlib import Path

# Replace the certificate design model/default with the cyber-style v3 template.
design_path = Path('app/certificate-design.ts')
design_path.write_text(r'''export const certificateParts = ['logo', 'hdbankLogo', 'organizationName', 'departmentName', 'eyebrow', 'title', 'recipientIntro', 'recipient', 'account', 'description', 'rating', 'issued', 'footerNote'] as const;
export type CertificatePart = typeof certificateParts[number];
export type CertificateElement = { x: number; y: number; width: number; height: number; fontSize: number; color: string; align: 'left' | 'center' | 'right' };
export type CertificateDesign = { themeVersion?: number; background: string; border: string; logo: string; hdbankLogo: string; elements: Record<CertificatePart, CertificateElement> };
export const partLabels: Record<CertificatePart, string> = { logo:'Logo Team/đơn vị', hdbankLogo:'Logo HDBank', organizationName:'Tên tổ chức', departmentName:'Đơn vị', eyebrow:'Tiêu đề nhỏ', title:'Tiêu đề', recipientIntro:'Lời trao', recipient:'Tên học viên', account:'Tài khoản và mã', description:'Mô tả', rating:'Xếp loại', issued:'Ngày cấp và mã', footerNote:'Ghi chú' };

export function defaultCertificateDesign(): CertificateDesign {
 const box = (x:number,y:number,width:number,height:number,fontSize:number,color='#d9efff',align:'left'|'center'|'right'='center'):CertificateElement => ({x,y,width,height,fontSize,color,align});
 return {themeVersion:2,background:'#03182f',border:'#29b6ff',logo:'',hdbankLogo:'',elements:{
  logo:box(92,68,122,122,46,'#9fd7ff'),
  hdbankLogo:box(1390,82,250,118,32,'#29b6ff'),
  organizationName:box(238,72,720,58,35,'#ffffff','left'),
  departmentName:box(238,132,650,42,20,'#8ed6ff','left'),
  eyebrow:box(125,218,930,48,20,'#69c9ff'),
  title:box(120,275,960,132,52,'#ffffff'),
  recipientIntro:box(160,425,880,48,22,'#c8d9e8'),
  recipient:box(145,484,900,82,56,'#ffffff'),
  account:box(150,576,890,50,19,'#8ed6ff'),
  description:box(150,650,900,132,23,'#e7f3fb'),
  rating:box(170,808,460,140,22,'#ffffff'),
  issued:box(108,1012,800,72,17,'#d3e7f5','left'),
  footerNote:box(108,1092,1030,70,14,'#7cc9f5','left') }};
}

export function normalizeCertificateDesign(value: unknown): CertificateDesign | null {
 if (!value || typeof value !== 'object') return null;
 const d=value as Partial<CertificateDesign> & { elements?: Partial<Record<CertificatePart, CertificateElement>> };
 const defaults=defaultCertificateDesign();
 const color=(v:unknown)=>typeof v==='string' && /^#[0-9a-f]{6}$/i.test(v);
 const image=(v:unknown)=>typeof v==='string' && v.length<=400000 && (v===''||/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(v));
 if(!image(d.logo??'')||!image(d.hdbankLogo??'')) return null;
 // Existing light certificate layouts are automatically migrated once to the selected
 // cyber template while retaining the uploaded team/unit logo.
 if(d.themeVersion!==2){
   return {...defaults, logo:d.logo??''};
 }
 if(!color(d.background)||!color(d.border)||!d.elements) return null;
 const elements={} as CertificateDesign['elements'];
 for(const key of certificateParts){
   const e=d.elements[key]??defaults.elements[key];
   if(!e||![e.x,e.y,e.width,e.height,e.fontSize].every(Number.isFinite)||e.x<0||e.y<0||e.width<40||e.height<30||e.x+e.width>1754||e.y+e.height>1240||e.fontSize<10||e.fontSize>100||!color(e.color)||!['left','center','right'].includes(e.align))return null;
   elements[key]={x:e.x,y:e.y,width:e.width,height:e.height,fontSize:e.fontSize,color:e.color,align:e.align};
 }
 return {themeVersion:2,background:d.background!,border:d.border!,logo:d.logo??'',hdbankLogo:d.hdbankLogo??'',elements};
}
''', encoding='utf-8')

cert_path = Path('app/certificate.ts')
text = cert_path.read_text(encoding='utf-8')
text = text.replace(
    'import { certificateParts, type CertificateDesign } from "./certificate-design";',
    'import { certificateParts, defaultCertificateDesign, type CertificateDesign } from "./certificate-design";'
)
old_design_gate = '''  if (template.design) {\n    await renderDesignedCertificate(context, certificate, template, template.design);\n    return canvas;\n  }'''
new_design_gate = '''  // The selected cyber certificate is now the canonical renderer. Existing\n  // templates without a saved design automatically receive the new default.\n  await renderDesignedCertificate(context, certificate, template, template.design ?? defaultCertificateDesign());\n  return canvas;'''
if old_design_gate not in text:
    raise SystemExit('certificate design gate not found')
text = text.replace(old_design_gate, new_design_gate, 1)

anchor = 'async function renderDesignedCertificate(context: CanvasRenderingContext2D, certificate: TrainingCertificate, template: CertificateTemplate, design: CertificateDesign) {'
if anchor not in text:
    raise SystemExit('renderDesignedCertificate anchor not found')
helper = r'''function drawCyberCertificateBackdrop(context: CanvasRenderingContext2D, design: CertificateDesign) {
  const width = 1754;
  const height = 1240;
  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#021225');
  gradient.addColorStop(0.5, design.background);
  gradient.addColorStop(1, '#004077');
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  // Subtle cyan glow concentrated around the cyber shield area.
  const glow = context.createRadialGradient(1370, 500, 30, 1370, 500, 560);
  glow.addColorStop(0, 'rgba(20,156,255,0.28)');
  glow.addColorStop(0.52, 'rgba(0,102,204,0.10)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = glow;
  context.fillRect(780, 20, 970, 1050);

  context.save();
  context.strokeStyle = 'rgba(39,174,255,0.12)';
  context.lineWidth = 1;
  for (let x = 40; x < width; x += 72) {
    context.beginPath(); context.moveTo(x, 30); context.lineTo(x, 1110); context.stroke();
  }
  for (let y = 40; y < 1110; y += 72) {
    context.beginPath(); context.moveTo(30, y); context.lineTo(width - 30, y); context.stroke();
  }
  context.restore();

  // Decorative circuit traces on the right side.
  context.save();
  context.strokeStyle = 'rgba(42,183,255,0.56)';
  context.lineWidth = 2;
  const traces = [
    [[1090,310],[1160,310],[1200,270],[1280,270]],
    [[1060,390],[1140,390],[1190,440],[1260,440]],
    [[1085,610],[1160,610],[1210,560],[1310,560]],
    [[1120,720],[1180,720],[1240,780],[1390,780]],
    [[1370,230],[1460,230],[1510,285],[1640,285]],
    [[1400,620],[1490,620],[1535,575],[1650,575]],
  ];
  for (const trace of traces) {
    context.beginPath();
    trace.forEach(([x,y], index) => index ? context.lineTo(x,y) : context.moveTo(x,y));
    context.stroke();
    const [x,y] = trace[trace.length-1];
    context.fillStyle = '#45c7ff'; context.beginPath(); context.arc(x,y,4,0,Math.PI*2); context.fill();
  }
  context.restore();

  // Large wireframe shield, inspired by the selected template but rendered as
  // native canvas vectors so dynamic PDF export stays crisp and reliable.
  const shield = [[1370,250],[1550,325],[1525,610],[1370,770],[1215,610],[1190,325]];
  context.save();
  context.shadowColor = '#29b6ff'; context.shadowBlur = 18;
  context.strokeStyle = '#60d1ff'; context.lineWidth = 5;
  context.beginPath();
  shield.forEach(([x,y], i) => i ? context.lineTo(x,y) : context.moveTo(x,y));
  context.closePath(); context.stroke();
  context.shadowBlur = 0;
  context.strokeStyle = 'rgba(74,201,255,0.48)'; context.lineWidth = 2;
  const center:[number,number] = [1370,500];
  for (const [x,y] of shield) { context.beginPath(); context.moveTo(center[0],center[1]); context.lineTo(x,y); context.stroke(); }
  for (let inset = 34; inset <= 100; inset += 33) {
    context.beginPath();
    context.moveTo(1370,250+inset);
    context.lineTo(1550-inset,325+inset/2);
    context.lineTo(1525-inset,610-inset/2);
    context.lineTo(1370,770-inset);
    context.lineTo(1215+inset,610-inset/2);
    context.lineTo(1190+inset,325+inset/2);
    context.closePath(); context.stroke();
  }
  // Inner security crest.
  context.fillStyle = 'rgba(235,248,255,0.96)';
  context.beginPath();
  context.moveTo(1370,385); context.lineTo(1450,420); context.lineTo(1438,545);
  context.quadraticCurveTo(1370,625,1302,545); context.lineTo(1290,420); context.closePath(); context.fill();
  context.strokeStyle = '#137ac0'; context.lineWidth = 10; context.stroke();
  context.fillStyle = '#0a4f87';
  context.font = '800 46px Arial, Helvetica, sans-serif';
  context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillText('IT', 1370, 485);
  context.restore();

  // Solid neon frame and corner accents.
  context.save();
  context.strokeStyle = design.border;
  context.lineWidth = 3;
  context.shadowColor = design.border;
  context.shadowBlur = 9;
  context.beginPath(); context.roundRect(28, 28, 1698, 1135, 18); context.stroke();
  context.shadowBlur = 0;
  context.lineWidth = 6;
  for (const [x1,y1,x2,y2] of [[28,90,85,28],[1668,28,1726,86],[28,1105,86,1163],[1668,1163,1726,1105]]) {
    context.beginPath(); context.moveTo(x1,y1); context.lineTo(x2,y2); context.stroke();
  }
  context.restore();

  // Bottom brand rail.
  context.fillStyle = 'rgba(0,18,39,0.88)';
  context.fillRect(0, 1178, width, 62);
  context.strokeStyle = '#148dce'; context.lineWidth = 2;
  context.beginPath(); context.moveTo(250, 1208); context.lineTo(1230, 1208); context.stroke();
  context.fillStyle = '#7dd3fc'; context.font = '600 16px Arial, Helvetica, sans-serif';
  context.textAlign = 'left'; context.fillText('CẢNH GIÁC SỐ   ·   IT SECURITY', 58, 1215);
  context.textAlign = 'right'; context.fillText('KIẾN THỨC HÔM NAY · AN TOÀN NGÀY MAI', 1690, 1215);
}

'''
text = text.replace(anchor, helper + anchor, 1)

old_backdrop = '''  context.fillStyle = design.background;\n  context.fillRect(0, 0, 1754, 1240);\n  context.strokeStyle = design.border;\n  context.lineWidth = 4;\n  context.setLineDash([12, 8]);\n  context.beginPath(); context.roundRect(76, 34, 1602, 1168, 24); context.stroke();\n  context.setLineDash([]);'''
new_backdrop = '''  if (design.themeVersion === 2) {\n    drawCyberCertificateBackdrop(context, design);\n  } else {\n    context.fillStyle = design.background;\n    context.fillRect(0, 0, 1754, 1240);\n    context.strokeStyle = design.border;\n    context.lineWidth = 4;\n    context.setLineDash([12, 8]);\n    context.beginPath(); context.roundRect(76, 34, 1602, 1168, 24); context.stroke();\n    context.setLineDash([]);\n  }'''
if old_backdrop not in text:
    raise SystemExit('old designed backdrop block not found')
text = text.replace(old_backdrop, new_backdrop, 1)

old_rating = "    if (key==='rating') { context.fillStyle='#f5e3bf';context.fillRect(e.x,e.y,e.width,e.height); }"
new_rating = "    if (key==='rating') { context.fillStyle=design.themeVersion===2?'rgba(3,32,61,0.82)':'#f5e3bf';context.fillRect(e.x,e.y,e.width,e.height); if(design.themeVersion===2){context.strokeStyle='#29b6ff';context.lineWidth=2;context.strokeRect(e.x,e.y,e.width,e.height);} }"
if old_rating not in text:
    raise SystemExit('rating block not found')
text = text.replace(old_rating, new_rating, 1)
cert_path.write_text(text, encoding='utf-8')

# Regression test to ensure the chosen style remains the canonical certificate theme.
test_path = Path('tests/cyber-certificate-v3.test.mjs')
test_path.write_text(r'''import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("certificate uses the selected cyber theme v3", async () => {
  const design = await readFile(new URL("../app/certificate-design.ts", import.meta.url), "utf8");
  const renderer = await readFile(new URL("../app/certificate.ts", import.meta.url), "utf8");
  assert.match(design, /themeVersion:2/);
  assert.match(design, /background:'#03182f'/);
  assert.match(design, /border:'#29b6ff'/);
  assert.match(renderer, /drawCyberCertificateBackdrop/);
  assert.match(renderer, /template\.design \?\? defaultCertificateDesign\(\)/);
  assert.match(renderer, /Large wireframe shield/);
});
''', encoding='utf-8')
print('Applied cyber certificate v3')
