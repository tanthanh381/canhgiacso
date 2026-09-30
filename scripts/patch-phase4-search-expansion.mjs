import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, "public");
const HOME = path.join(ROOT, "github-pages", "index.html");

const priorityLinks = [
  ["/kien-thuc/lua-dao-cong-tac-vien-viec-nhe-luong-cao/", "Việc nhẹ lương cao"],
  ["/kien-thuc/kiem-tra-so-dien-thoai-lua-dao/", "Kiểm tra số điện thoại"],
  ["/kien-thuc/gia-mao-ngan-hang/", "Giả mạo ngân hàng"],
  ["/kien-thuc/kiem-tra-link-gia-mao/", "Kiểm tra link giả"],
  ["/kien-thuc/xu-ly-khi-bi-lua-dao-chuyen-tien/", "Đã chuyển tiền"],
  ["/kien-thuc/phishing-la-gi/", "Phishing là gì"],
];

const targets = [
  {
    file: "kien-thuc/lua-dao-cong-tac-vien-viec-nhe-luong-cao/index.html",
    title: "Nếu tình huống đã chuyển sang giao dịch",
    lead: "Khi lời mời việc làm bắt đầu yêu cầu nạp tiền, xác minh theo kịch bản giao dịch trước khi tiếp tục.",
    links: [
      ["/cong-cu/kiem-tra-truoc-khi-chuyen-tien/", "Checklist trước khi chuyển tiền"],
      ["/kien-thuc/bien-lai-chuyen-khoan-gia/", "Biên lai chuyển khoản giả"],
      ["/kien-thuc/lua-dao-dau-tu-telegram-zalo/", "Nhóm nhiệm vụ và đầu tư Telegram/Zalo"],
    ],
  },
  {
    file: "kien-thuc/kiem-tra-so-dien-thoai-lua-dao/index.html",
    title: "Nếu số lạ đang gây áp lực ngay lúc này",
    lead: "Chuyển từ tra cứu số sang đánh giá hành vi cuộc gọi, tin nhắn và kênh xác minh chính thức.",
    links: [
      ["/cong-cu/kiem-tra-cuoc-goi-la/", "Đánh giá cuộc gọi lạ"],
      ["/cong-cu/tra-cuu-kenh-chinh-thuc/", "Tra cứu kênh chính thức"],
      ["/kien-thuc/cuoc-goi-im-lang-lua-dao/", "Cuộc gọi im lặng có rủi ro gì?"],
    ],
  },
  {
    file: "kien-thuc/gia-mao-ngan-hang/index.html",
    title: "Nếu có yêu cầu đăng nhập, OTP hoặc chuyển khoản",
    lead: "Đừng chỉ nhìn logo ngân hàng. Hãy tách riêng rủi ro link, mã OTP và giao dịch trước khi phản hồi.",
    links: [
      ["/kien-thuc/kiem-tra-link-gia-mao/", "Kiểm tra link ngân hàng giả"],
      ["/kien-thuc/lua-dao-otp-chiem-doat-tai-khoan/", "Lừa đảo OTP"],
      ["/cong-cu/kiem-tra-truoc-khi-chuyen-tien/", "Checklist trước khi chuyển tiền"],
    ],
  },
  {
    file: "kien-thuc/kiem-tra-link-gia-mao/index.html",
    title: "Nếu link đi kèm SMS, QR hoặc trang đăng nhập",
    lead: "Các biến thể link giả thường đi theo một kênh cụ thể. Đối chiếu thêm kênh gửi để giảm kết luận nhầm.",
    links: [
      ["/kien-thuc/phishing-la-gi/", "Phishing là gì?"],
      ["/kien-thuc/sms-brandname-gia-mao/", "SMS Brandname giả mạo"],
      ["/cong-cu/kiem-tra-tin-nhan-dang-ngo/", "Kiểm tra tin nhắn đáng ngờ"],
    ],
  },
  {
    file: "kien-thuc/xu-ly-khi-bi-lua-dao-chuyen-tien/index.html",
    title: "Sau bước khẩn cấp, tiếp tục bảo toàn bằng chứng",
    lead: "Khi đã báo ngân hàng, ưu tiên lưu dấu vết và rà lại điểm mất quyền kiểm soát để tránh thiệt hại tiếp.",
    links: [
      ["/cong-cu/xu-ly-khi-bi-lua/", "Trợ lý xử lý khi bị lừa"],
      ["/kien-thuc/app-dieu-khien-dien-thoai-tu-xa/", "Đã cài app điều khiển từ xa"],
      ["/kien-thuc/bien-lai-chuyen-khoan-gia/", "Kiểm tra biên lai chuyển khoản"],
    ],
  },
  {
    file: "kien-thuc/phishing-la-gi/index.html",
    title: "Đi từ khái niệm sang kiểm tra tình huống thật",
    lead: "Sau khi hiểu phishing, chọn đúng checklist theo kênh: email, SMS, link rút gọn hoặc trang đăng nhập.",
    links: [
      ["/kien-thuc/nhan-dien-email-phishing/", "Nhận diện email phishing"],
      ["/kien-thuc/kiem-tra-link-gia-mao/", "Kiểm tra link lừa đảo"],
      ["/kien-thuc/sms-brandname-gia-mao/", "SMS Brandname giả"],
    ],
  },
];

function section({ title, lead, links }) {
  return `<section class="seo-phase4-next seo-note" data-phase4-search-expansion><strong>${title}</strong><p>${lead}</p><ul>${links.map(([href, label]) => `<li><a href="${href}">${label}</a></li>`).join("")}</ul></section>`;
}

async function patchHtml(file, block) {
  const full = path.join(PUBLIC, file);
  let html = await readFile(full, "utf8");
  html = html.replace(/<section class="seo-phase4-next seo-note" data-phase4-search-expansion>[\s\S]*?<\/section>/g, "");
  const marker = html.includes('<section class="seo-trust-note')
    ? '<section class="seo-trust-note'
    : html.includes('<section class="seo-related"')
      ? '<section class="seo-related"'
      : "</main>";
  html = html.replace(marker, `${block}${marker}`);
  await writeFile(full, html, "utf8");
}

for (const item of targets) {
  await patchHtml(item.file, section(item));
}

let home = await readFile(HOME, "utf8");
home = home.replace(/<section class="seo-phase4-next" data-phase4-home>[\s\S]*?<\/section>/g, "");
const homeBlock = `<section class="seo-phase4-next" data-phase4-home><h2>Đi nhanh theo tình huống đang gặp</h2><p>Nếu bạn cần kiểm tra ngay, hãy mở đúng hướng dẫn theo dữ kiện đang có thay vì tìm một kết luận chung.</p><ul>${priorityLinks.map(([href, label]) => `<li><a href="${href}">${label}</a></li>`).join("")}</ul></section>`;
home = home.replace("</main>", `${homeBlock}</main>`);
await writeFile(HOME, home, "utf8");

const hubFile = path.join(PUBLIC, "kien-thuc", "index.html");
let hub = await readFile(hubFile, "utf8");
hub = hub.replace(/<section class="seo-phase4-next" data-phase4-hub>[\s\S]*?<\/section>/g, "");
const hubBlock = `<section class="seo-phase4-next" data-phase4-hub><h2>Phase 4: nhóm hướng dẫn cần theo dõi organic</h2><p>Sáu trang này là cụm ưu tiên để đo organic landing, direct/unknown attribution và nhu cầu xử lý sự cố.</p><ul>${priorityLinks.map(([href, label]) => `<li><a href="${href}">${label}</a></li>`).join("")}</ul></section>`;
hub = hub.replace("</main>", `${hubBlock}</main>`);
await writeFile(hubFile, hub, "utf8");

console.log(`Phase 4 Search Expansion: patched ${targets.length} priority pages plus homepage and knowledge hub.`);
