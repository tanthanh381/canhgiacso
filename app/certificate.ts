import { certificateParts, type CertificateDesign } from "./certificate-design";
import type { CertificateTemplate } from "./data";

export type TrainingCertificate = {
  certificateId: string;
  certificateCode: string;
  runId: string;
  issuedAt: string;
  displayName: string;
  username: string;
  scenarioTotal: number;
  completed: number;
  correct: number;
  accuracy: number;
  score: number;
  rating: "ĐẠT CƠ BẢN" | "ĐẠT" | "TỐT" | "XUẤT SẮC";
};

const A4_LANDSCAPE_WIDTH = 841.89;
const A4_LANDSCAPE_HEIGHT = 595.28;

function textBytes(value: string) {
  return new TextEncoder().encode(value);
}

function concatBytes(parts: Uint8Array[]) {
  const length = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;
  parts.forEach((part) => {
    output.set(part, offset);
    offset += part.length;
  });
  return output;
}

export function buildSinglePageJpegPdf(jpegBytes: Uint8Array, pixelWidth: number, pixelHeight: number) {
  const content = textBytes(`q\n${A4_LANDSCAPE_WIDTH} 0 0 ${A4_LANDSCAPE_HEIGHT} 0 0 cm\n/Im0 Do\nQ`);
  const objects: Uint8Array[] = [
    textBytes("<< /Type /Catalog /Pages 2 0 R >>"),
    textBytes("<< /Type /Pages /Kids [3 0 R] /Count 1 >>"),
    textBytes(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4_LANDSCAPE_WIDTH} ${A4_LANDSCAPE_HEIGHT}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`),
    concatBytes([
      textBytes(`<< /Type /XObject /Subtype /Image /Width ${pixelWidth} /Height ${pixelHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`),
      jpegBytes,
      textBytes("\nendstream"),
    ]),
    concatBytes([
      textBytes(`<< /Length ${content.length} >>\nstream\n`),
      content,
      textBytes("\nendstream"),
    ]),
  ];

  const header = new Uint8Array([37, 80, 68, 70, 45, 49, 46, 52, 10, 37, 226, 227, 207, 211, 10]);
  const parts: Uint8Array[] = [header];
  const offsets: number[] = [0];
  let length = header.length;

  objects.forEach((object, index) => {
    offsets.push(length);
    const prefix = textBytes(`${index + 1} 0 obj\n`);
    const suffix = textBytes("\nendobj\n");
    parts.push(prefix, object, suffix);
    length += prefix.length + object.length + suffix.length;
  });

  const xrefOffset = length;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index <= objects.length; index += 1) {
    xref += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  xref += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  parts.push(textBytes(xref));
  return concatBytes(parts);
}

function drawCenteredText(
  context: CanvasRenderingContext2D,
  text: string,
  y: number,
  maxWidth: number,
  initialSize: number,
  fontFamily: string,
  color: string,
  weight: number | string = 700,
) {
  let size = initialSize;
  context.textAlign = "center";
  context.textBaseline = "alphabetic";
  context.fillStyle = color;
  do {
    context.font = `${weight} ${size}px ${fontFamily}`;
    if (context.measureText(text).width <= maxWidth || size <= 24) break;
    size -= 2;
  } while (size > 24);
  context.fillText(text, 877, y);
}

function drawCenteredWrappedText(
  context: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  startY: number,
  maxWidth: number,
  lineHeight: number,
) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  words.forEach((word) => {
    const candidate = line ? `${line} ${word}` : word;
    if (context.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  });
  if (line) lines.push(line);
  context.textAlign = "center";
  lines.forEach((item, index) => context.fillText(item, centerX, startY + index * lineHeight));
  return startY + Math.max(0, lines.length - 1) * lineHeight;
}

function certificateFileName(certificate: TrainingCertificate) {
  const safeName = certificate.displayName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || certificate.username || "hoc-vien";
  return `Chung-nhan-Canh-Giac-So-${safeName}.pdf`;
}

function applyCertificateTemplate(template: string, certificate: TrainingCertificate, config: CertificateTemplate) {
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
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : date.toLocaleDateString("vi-VN");
}

function drawHdbankWordmark(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  context.save();
  context.fillStyle = "rgba(255, 255, 255, 0.96)";
  context.strokeStyle = "rgba(148, 163, 184, 0.36)";
  context.lineWidth = 1.5;
  context.beginPath();
  context.roundRect(x, y, width, height, 16);
  context.fill();
  context.stroke();

  const left = x + 18;
  const baseline = y + Math.round(height * 0.58);
  const logoFontSize = Math.min(54, Math.round(height * 0.46));
  context.textAlign = "left";
  context.textBaseline = "alphabetic";
  context.font = `800 ${logoFontSize}px Arial, Helvetica, sans-serif`;
  context.fillStyle = "#e30613";
  context.fillText("HD", left, baseline);
  const hdWidth = context.measureText("HD").width;

  context.font = `700 ${logoFontSize}px Arial, Helvetica, sans-serif`;
  context.fillStyle = "#374151";
  context.fillText("Bank", left + hdWidth - 2, baseline);
  const bankWidth = context.measureText("Bank").width;

  const leafX = Math.min(x + width - 28, left + hdWidth + bankWidth + 12);
  const leafY = y + Math.round(height * 0.31);
  context.fillStyle = "#f2b705";
  context.beginPath();
  context.ellipse(leafX, leafY, 18, 8, -0.55, 0, Math.PI * 2);
  context.fill();
  context.beginPath();
  context.ellipse(leafX + 4, leafY + 18, 20, 9, 0.5, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "#6b7280";
  context.font = "500 12px Arial, Helvetica, sans-serif";
  context.fillText("Cam kết lợi ích cao nhất", left, y + height - 14, width - 36);
  context.restore();
}

export async function renderCertificateCanvas(certificate: TrainingCertificate, template: CertificateTemplate) {
  if ("fonts" in document) await document.fonts.ready;
  const canvas = document.createElement("canvas");
  canvas.width = 1754;
  canvas.height = 1240;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Trình duyệt không hỗ trợ tạo chứng chỉ.");

  if (template.design) {
    await renderDesignedCertificate(context, certificate, template, template.design);
    return canvas;
  }

  const background = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  background.addColorStop(0, "#fffaf0");
  background.addColorStop(0.58, "#f7f8f6");
  background.addColorStop(1, "#eef3f8");
  context.fillStyle = background;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.save();
  context.strokeStyle = "#d89a68";
  context.lineWidth = 4;
  context.setLineDash([12, 8]);
  context.beginPath();
  context.roundRect(76, 34, 1602, 1168, 24);
  context.stroke();
  context.restore();

  context.fillStyle = "#d90000";
  // save/restore does not reset paths; keep the logo fill off the frame.
  context.beginPath();
  context.roundRect(270, 92, 112, 112, 16);
  context.fill();
  context.fillStyle = "#ffffff";
  context.textAlign = "center";
  context.font = "700 48px Georgia, 'Times New Roman', serif";
  context.fillText("HD", 326, 162);

  context.textAlign = "left";
  context.fillStyle = "#c50000";
  context.font = "800 38px Arial, Helvetica, sans-serif";
  context.fillText(template.organizationName, 410, 145);
  context.fillStyle = "#334155";
  context.font = "700 22px Arial, Helvetica, sans-serif";
  context.fillText(template.departmentName, 410, 184, 900);

  // Keep the HDBank brand visible in the exported PDF even when a custom team logo is used on the left.
  drawHdbankWordmark(context, 1390, 82, 250, 118);

  context.fillStyle = "#9a3e00";
  context.textAlign = "center";
  context.font = "700 21px Arial, Helvetica, sans-serif";
  context.fillText(template.eyebrow, 877, 288);
  drawCenteredText(
    context,
    template.title,
    370,
    1450,
    53,
    "Georgia, 'Times New Roman', serif",
    "#0f172a",
    800,
  );

  context.fillStyle = "#475569";
  context.font = "italic 22px Georgia, 'Times New Roman', serif";
  context.fillText(template.recipientIntro, 877, 470);
  drawCenteredText(
    context,
    certificate.displayName.toLocaleUpperCase("vi-VN"),
    545,
    1260,
    54,
    "Georgia, 'Times New Roman', serif",
    "#b00000",
    800,
  );
  context.strokeStyle = "#d97706";
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(610, 570);
  context.lineTo(1144, 570);
  context.stroke();

  context.fillStyle = "#1e3a5f";
  context.font = "600 23px Arial, Helvetica, sans-serif";
  context.fillText(`${template.accountLabel}: @${certificate.username}  |  ${template.codeLabel}: ${certificate.certificateCode}`, 877, 612);

  context.fillStyle = "#0f2847";
  context.font = "23px Arial, Helvetica, sans-serif";
  const description = applyCertificateTemplate(template.description, certificate, template);
  drawCenteredWrappedText(context, description, 877, 710, 1200, 37);

  context.fillStyle = "#f5e3bf";
  context.strokeStyle = "#e87500";
  context.lineWidth = 2;
  context.beginPath();
  context.roundRect(690, 820, 374, 170, 15);
  context.fill();
  context.stroke();
  context.fillStyle = "#7c2d12";
  context.font = "700 20px Arial, Helvetica, sans-serif";
  context.fillText(template.ratingLabel, 877, 865);
  context.fillStyle = "#a00000";
  context.font = "800 31px Arial, Helvetica, sans-serif";
  context.fillText(certificate.rating, 877, 910);
  context.fillStyle = "#334155";
  context.font = "20px Arial, Helvetica, sans-serif";
  context.fillText(`Điểm: ${certificate.score} PTS  |  Tỷ lệ đúng: ${certificate.accuracy}%`, 877, 950);

  context.strokeStyle = "#eab308";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(120, 1055);
  context.lineTo(1634, 1055);
  context.stroke();

  context.fillStyle = "#475569";
  context.textAlign = "left";
  context.font = "17px Arial, Helvetica, sans-serif";
  context.fillText(`${template.issuedDateLabel}: ${formatIssuedDate(certificate.issuedAt)}`, 145, 1104);
  context.textAlign = "right";
  context.fillText(`${template.codeLabel}: ${certificate.certificateCode}`, 1609, 1104);
  context.textAlign = "center";
  context.fillStyle = "#64748b";
  context.font = "15px Arial, Helvetica, sans-serif";
  context.fillText(certificate.certificateCode.startsWith("CGS-GUEST-")
    ? "Bản ghi nhận chế độ khách - không phải chứng chỉ nội bộ đã xác minh."
    : template.footerNote, 877, 1150);
  return canvas;
}

export async function downloadTrainingCertificatePdf(certificate: TrainingCertificate, template: CertificateTemplate) {
  const canvas = await renderCertificateCanvas(certificate, template);
  const jpegBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Không thể kết xuất chứng chỉ."));
    }, "image/jpeg", 0.96);
  });
  const jpegBytes = new Uint8Array(await jpegBlob.arrayBuffer());
  const pdfBytes = buildSinglePageJpegPdf(jpegBytes, canvas.width, canvas.height);
  const pdfBlob = new Blob([pdfBytes], { type: "application/pdf" });
  const url = URL.createObjectURL(pdfBlob);
  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = certificateFileName(certificate);
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

async function renderDesignedCertificate(context: CanvasRenderingContext2D, certificate: TrainingCertificate, template: CertificateTemplate, design: CertificateDesign) {
  context.fillStyle = design.background;
  context.fillRect(0, 0, 1754, 1240);
  context.strokeStyle = design.border;
  context.lineWidth = 4;
  context.setLineDash([12, 8]);
  context.beginPath(); context.roundRect(76, 34, 1602, 1168, 24); context.stroke();
  context.setLineDash([]);
  const text = {
    ...template, logo: 'HD', recipient: certificate.displayName.toLocaleUpperCase('vi-VN'),
    account: `${template.accountLabel}: @${certificate.username} | ${template.codeLabel}: ${certificate.certificateCode}`,
    description: applyCertificateTemplate(template.description, certificate, template),
    rating: `${template.ratingLabel}\n${certificate.rating}\nĐiểm: ${certificate.score} PTS | Tỷ lệ đúng: ${certificate.accuracy}%`,
    issued: `${template.issuedDateLabel}: ${formatIssuedDate(certificate.issuedAt)} | ${template.codeLabel}: ${certificate.certificateCode}`,
    footerNote: certificate.certificateCode.startsWith('CGS-GUEST-') ? 'Bản ghi nhận chế độ khách - không phải chứng chỉ nội bộ đã xác minh.' : template.footerNote,
  };
  for (const key of certificateParts) {
    const e = design.elements[key];
    context.save();
    context.beginPath(); context.rect(e.x, e.y, e.width, e.height); context.clip();
    if (key === 'logo') {
      if (design.logo) {
        const image = new Image();
        image.src = design.logo;
        await image.decode();
        const scale = Math.min(e.width / image.naturalWidth, e.height / image.naturalHeight);
        context.drawImage(image, e.x + (e.width - image.naturalWidth * scale) / 2, e.y + (e.height - image.naturalHeight * scale) / 2, image.naturalWidth * scale, image.naturalHeight * scale);
      } else {
        context.fillStyle=e.color; context.fillRect(e.x,e.y,e.width,e.height);
        context.fillStyle='#ffffff';context.font=`bold ${Math.min(e.fontSize,e.height*.6)}px Georgia`;context.textAlign='center';context.textBaseline='middle';context.fillText('HD',e.x+e.width/2,e.y+e.height/2,e.width);
      }
      context.restore(); continue;
    }
    if (key==='rating') { context.fillStyle='#f5e3bf';context.fillRect(e.x,e.y,e.width,e.height); }
    let size=e.fontSize; let lines:string[]=[];
    const family=key==='title'||key==='recipient' ? 'Georgia' : 'Arial';
    do {
      context.font=`${key==='description'||key==='footerNote'||key==='issued'?400:700} ${size}px ${family}`;
      lines=[];
      for(const paragraph of text[key].split('\n')) {
        let line='';
        for(const word of paragraph.split(/\s+/)) {const next=line?`${line} ${word}`:word;if(context.measureText(next).width>e.width-12&&line){lines.push(line);line=word;}else line=next;}
        lines.push(line);
      }
      if(lines.length*size*1.3<=e.height-6||size<=10)break;
      size--;
    }while(size>=10);
    context.fillStyle=e.color;context.textAlign=e.align;context.textBaseline='middle';
    const x=e.align==='center'?e.x+e.width/2:e.align==='right'?e.x+e.width-6:e.x+6;
    lines.forEach((line,index)=>context.fillText(line,x,e.y+e.height/2+(index-(lines.length-1)/2)*size*1.3,e.width-12));
    context.restore();
  }

  // The right-side HDBank wordmark is intentionally outside the editable certificate parts
  // so it is always present in the final PDF and cannot be accidentally removed by layout edits.
  drawHdbankWordmark(context, 1390, 82, 250, 118);
}
