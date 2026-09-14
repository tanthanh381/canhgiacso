import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const overrides = {
  "lua-dao-shipper-giao-hang": [
    "Lừa đảo shipper, giao hàng: Cách nhận biết trước khi chuyển tiền",
    "Lừa đảo shipper: Cách nhận biết trước khi chuyển tiền",
  ],
  "lua-dao-cong-tac-vien-viec-nhe-luong-cao": [
    "Lừa đảo cộng tác viên, việc nhẹ lương cao: Dấu hiệu nhận biết",
    "Lừa đảo cộng tác viên: Dấu hiệu việc nhẹ lương cao",
  ],
  "deepfake-gia-giong-nguoi-than": [
    "Deepfake giả giọng người thân: Cách xác minh trước chuyển tiền",
    "Deepfake giả giọng người thân: Xác minh trước chuyển tiền",
  ],
  "tai-khoan-bi-hack-phai-lam-gi": [
    "Tài khoản bị hack phải làm gì? 7 bước lấy lại quyền kiểm soát",
    "Tài khoản bị hack: 7 bước lấy lại quyền kiểm soát",
  ],
};

for (const [slug, [from, to]] of Object.entries(overrides)) {
  const file = path.join(root, "public", "kien-thuc", slug, "index.html");
  const html = await readFile(file, "utf8");
  await writeFile(file, html.split(from).join(to), "utf8");
}

console.log(`Trimmed ${Object.keys(overrides).length} long SEO titles.`);
