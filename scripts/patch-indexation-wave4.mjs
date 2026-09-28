import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const knowledgeRoot = path.join(ROOT, "public", "kien-thuc");
const UPDATED_ISO = "2026-09-15";
const UPDATED_DISPLAY = "15/09/2026";

const OFFICIAL = {
  bca2026: "https://bocongan.gov.vn/bai-viet/nang-cao-canh-giac-truoc-25-kich-ban-lua-dao-tren-khong-gian-mang-nam-2026-1788865614",
  bcaPhatNguoi: "https://www.bocongan.gov.vn/bai-viet/canh-bao-thu-doan-gia-danh-co-quan-cong-an-gui-tin-nhan-phat-nguoi-kem-duong-link-gia-mao-de-lua-dao-chiem-doat-tai-san-1788945012",
  sbv: "https://www.sbv.gov.vn/vi/web/sbv_portal/w/sbv592485",
};

const labels = {
  "phong-chong-lua-dao-truc-tuyen": "12 cách phòng chống lừa đảo trực tuyến",
  "nhan-dien-lua-dao-truc-tuyen": "10 dấu hiệu nhận diện lừa đảo",
  "nhan-dien-email-phishing": "Nhận diện email phishing và link giả",
  "an-toan-thong-tin-ca-nhan": "An toàn thông tin cá nhân",
  "xu-ly-khi-bi-lua-dao-chuyen-tien": "Xử lý khi đã bị lừa chuyển tiền",
  "lua-dao-ma-qr": "Lừa đảo mã QR",
  "gia-mao-cong-an-co-quan-nha-nuoc": "Giả mạo Công an, cơ quan nhà nước",
  "gia-mao-ngan-hang": "Giả mạo ngân hàng",
  "lua-dao-shipper-giao-hang": "Lừa đảo shipper, giao hàng",
  "lua-dao-cong-tac-vien-viec-nhe-luong-cao": "Lừa đảo cộng tác viên, việc nhẹ lương cao",
  "lua-dao-dau-tu-online": "Lừa đảo đầu tư online",
  "deepfake-gia-giong-nguoi-than": "Deepfake giả giọng người thân",
  "lua-dao-otp-chiem-doat-tai-khoan": "Lừa đảo OTP, chiếm đoạt tài khoản",
  "kiem-tra-link-gia-mao": "Kiểm tra link và website giả mạo",
  "tai-khoan-bi-hack-phai-lam-gi": "Tài khoản bị hack phải làm gì",
  "tra-cuu-lua-dao": "Tra cứu dấu hiệu lừa đảo",
  "kiem-tra-so-dien-thoai-lua-dao": "Kiểm tra số điện thoại lừa đảo",
  "tra-cuu-so-tai-khoan-lua-dao": "Tra cứu số tài khoản lừa đảo",
  "25-kich-ban-lua-dao-2026": "25 kịch bản lừa đảo năm 2026",
  "lua-dao-vneid-gia-mao": "Lừa đảo VNeID giả mạo",
  "lua-dao-phat-nguoi-qua-sms": "Lừa đảo phạt nguội qua SMS",
  "lua-dao-hoan-tien-don-hang": "Lừa đảo hoàn tiền đơn hàng",
};

const clusters = {
  foundation: [
    "phong-chong-lua-dao-truc-tuyen",
    "nhan-dien-lua-dao-truc-tuyen",
    "nhan-dien-email-phishing",
    "an-toan-thong-tin-ca-nhan",
    "xu-ly-khi-bi-lua-dao-chuyen-tien",
  ],
  impersonation: [
    "gia-mao-cong-an-co-quan-nha-nuoc",
    "gia-mao-ngan-hang",
    "lua-dao-vneid-gia-mao",
    "lua-dao-phat-nguoi-qua-sms",
    "deepfake-gia-giong-nguoi-than",
  ],
  transaction: [
    "lua-dao-ma-qr",
    "lua-dao-shipper-giao-hang",
    "lua-dao-hoan-tien-don-hang",
    "lua-dao-cong-tac-vien-viec-nhe-luong-cao",
    "lua-dao-dau-tu-online",
  ],
  verification: [
    "kiem-tra-link-gia-mao",
    "tra-cuu-lua-dao",
    "kiem-tra-so-dien-thoai-lua-dao",
    "tra-cuu-so-tai-khoan-lua-dao",
    "25-kich-ban-lua-dao-2026",
  ],
  account: [
    "lua-dao-otp-chiem-doat-tai-khoan",
    "tai-khoan-bi-hack-phai-lam-gi",
    "an-toan-thong-tin-ca-nhan",
    "nhan-dien-email-phishing",
    "gia-mao-ngan-hang",
  ],
};

const slugCluster = new Map();
for (const [name, slugs] of Object.entries(clusters)) {
  for (const slug of slugs) {
    if (!slugCluster.has(slug)) slugCluster.set(slug, name);
  }
}

const expansions = {
  "lua-dao-ma-qr": `
<section data-seo-wave4="depth">
  <h2>Quy trình 20 giây trước khi quét mã QR</h2>
  <p>Hãy coi mã QR như một đường link được che đi. Trước khi mở nội dung, kiểm tra bối cảnh xuất hiện của mã, người yêu cầu bạn quét và hành động tiếp theo mà họ muốn bạn thực hiện. Nếu điện thoại hiển thị tên miền đích, hãy đọc kỹ từng ký tự và dừng lại khi tên miền không đúng thương hiệu hoặc dùng URL rút gọn khó kiểm chứng.</p>
  <ol class="seo-checklist"><li>Quan sát xem QR có bị dán đè hoặc thay thế tại điểm thanh toán hay không.</li><li>Kiểm tra tên miền trước khi đăng nhập; nếu nghi ngờ, tự mở website hoặc ứng dụng chính thức.</li><li>Với QR chuyển tiền, đối chiếu tên người nhận, ngân hàng và số tiền ngay trên màn hình xác nhận.</li><li>Không cài APK, cấp quyền trợ năng hoặc chia sẻ màn hình chỉ vì nội dung sau QR yêu cầu.</li></ol>
  <p>Nếu QR dẫn tới trang đăng nhập hoặc thanh toán, hãy kết hợp với hướng dẫn <a href="/kien-thuc/kiem-tra-link-gia-mao/">kiểm tra link giả mạo</a>. Khi đã phát sinh giao dịch, chuyển sang quy trình <a href="/kien-thuc/xu-ly-khi-bi-lua-dao-chuyen-tien/">xử lý khi bị lừa chuyển tiền</a> thay vì tiếp tục trao đổi với người gửi mã.</p>
</section>`,
  "gia-mao-cong-an-co-quan-nha-nuoc": `
<section data-seo-wave4="depth">
  <h2>Cách tách “thẩm quyền thật” khỏi “kênh liên hệ giả”</h2>
  <p>Kẻ lừa đảo có thể biết họ tên, số căn cước, địa chỉ hoặc sử dụng hình ảnh giấy tờ để tăng độ tin cậy. Những dữ kiện đó không chứng minh người đang gọi là cán bộ thật. Hãy đánh giá bằng kênh làm việc: một cuộc gọi bất ngờ yêu cầu giữ bí mật, chuyển tiền, cung cấp OTP hoặc cài ứng dụng là tín hiệu phải dừng ngay.</p>
  <p>Quy trình an toàn là kết thúc cuộc gọi, ghi lại tên đơn vị mà người gọi tự xưng, sau đó tự tìm số điện thoại hoặc địa chỉ từ cổng thông tin chính thức. Không gọi lại số mà chính người đang gây áp lực cung cấp. Nếu cần làm việc trực tiếp, chủ động tới trụ sở hoặc sử dụng dịch vụ công chính thức.</p>
  <p>Đối với thông báo phạt, cập nhật định danh hoặc hồ sơ hành chính, hãy kiểm tra thêm các hướng dẫn về <a href="/kien-thuc/lua-dao-vneid-gia-mao/">VNeID giả mạo</a> và <a href="/kien-thuc/lua-dao-phat-nguoi-qua-sms/">phạt nguội qua SMS</a>.</p>
</section>`,
  "gia-mao-ngan-hang": `
<section data-seo-wave4="depth">
  <h2>Ba lớp xác minh khi có người tự xưng là ngân hàng</h2>
  <p><strong>Lớp 1 — kênh liên hệ:</strong> không dùng link hoặc số điện thoại được gửi trong tin nhắn đáng ngờ. Hãy tự mở ứng dụng ngân hàng đã cài từ trước, website chính thức hoặc gọi số hotline trên thẻ và kênh chính thức.</p>
  <p><strong>Lớp 2 — yêu cầu:</strong> cảnh giác cao nếu người liên hệ yêu cầu mật khẩu, OTP, PIN, CVV, mã khôi phục, cài ứng dụng ngoài kho chính thức, chia sẻ màn hình hoặc chuyển tiền sang “tài khoản an toàn”. Đây là các hành động có thể trực tiếp làm mất quyền kiểm soát tài khoản.</p>
  <p><strong>Lớp 3 — giao dịch:</strong> trước khi xác nhận chuyển tiền, đọc lại tên người nhận, ngân hàng, số tiền và nội dung giao dịch. Nếu đã lộ mã xác thực hoặc thông tin đăng nhập, thực hiện ngay hướng dẫn <a href="/kien-thuc/lua-dao-otp-chiem-doat-tai-khoan/">xử lý rủi ro OTP</a> và <a href="/kien-thuc/tai-khoan-bi-hack-phai-lam-gi/">khôi phục tài khoản bị chiếm quyền</a>.</p>
</section>`,
  "lua-dao-shipper-giao-hang": `
<section data-seo-wave4="depth">
  <h2>Đối chiếu 4 dữ kiện trước khi trả tiền cho shipper</h2>
  <p>Khi nhận cuộc gọi giao hàng, hãy kiểm tra đồng thời <strong>mã đơn, sản phẩm, nền tảng đặt hàng và trạng thái đơn</strong>. Một người chỉ biết tên hoặc số điện thoại của bạn chưa đủ để chứng minh họ đang xử lý đúng đơn hàng. Mở trực tiếp ứng dụng thương mại điện tử hoặc lịch sử mua hàng thay vì dựa vào ảnh chụp màn hình do người gọi gửi.</p>
  <p>Đặc biệt cảnh giác với chuỗi hành động “chuyển một khoản nhỏ → báo chuyển nhầm/đăng ký hội viên → gửi QR hoặc link hoàn tiền → yêu cầu chuyển thêm”. Việc khoản tiền ban đầu nhỏ không làm quy trình trở nên an toàn. Nếu xuất hiện bước hoàn tiền bất thường, xem thêm <a href="/kien-thuc/lua-dao-hoan-tien-don-hang/">lừa đảo hoàn tiền đơn hàng</a>.</p>
  <p>Nếu đã quét QR hoặc bấm link từ người tự xưng là shipper, hãy kiểm tra lại URL và phiên đăng nhập theo hướng dẫn <a href="/kien-thuc/kiem-tra-link-gia-mao/">kiểm tra website giả mạo</a>.</p>
</section>`,
  "lua-dao-cong-tac-vien-viec-nhe-luong-cao": `
<section data-seo-wave4="depth">
  <h2>Vì sao “nhiệm vụ có lời” vẫn có thể là bẫy?</h2>
  <p>Một kịch bản phổ biến là trả hoa hồng thật cho một hoặc vài nhiệm vụ nhỏ, sau đó tăng số tiền nạp và tạo lý do khiến người tham gia không thể rút. Khoản tiền rút được ban đầu chỉ là chi phí xây dựng niềm tin; nó không chứng minh nền tảng hoặc nhà tuyển dụng là hợp pháp.</p>
  <p>Trước khi nhận việc, kiểm tra pháp nhân, website chính thức, mô tả công việc, hợp đồng, cách trả lương và kênh tuyển dụng. Công việc hợp pháp không nên yêu cầu ứng viên nạp tiền cá nhân để “mở nhiệm vụ”, “nâng cấp tài khoản”, “sửa điểm tín nhiệm” hoặc giải phóng khoản tiền đang bị khóa.</p>
  <p>Nếu đã chuyển tiền và hệ thống tiếp tục yêu cầu nạp thêm để rút, hãy dừng giao dịch. Lưu bằng chứng và thực hiện các bước tại <a href="/kien-thuc/xu-ly-khi-bi-lua-dao-chuyen-tien/">hướng dẫn xử lý sau khi chuyển tiền</a>.</p>
</section>`,
  "lua-dao-dau-tu-online": `
<section data-seo-wave4="depth">
  <h2>Lợi nhuận hiển thị trên màn hình không phải bằng chứng có tài sản thật</h2>
  <p>Website hoặc ứng dụng giả có thể hiển thị số dư tăng đều, lịch sử giao dịch và biểu đồ lợi nhuận theo bất kỳ kịch bản nào. Dấu hiệu quan trọng là khả năng xác minh pháp nhân, giấy phép phù hợp, tài sản thực tế và đặc biệt là việc rút tiền mà không phải tiếp tục nộp thêm phí bất thường.</p>
  <ul class="seo-checklist"><li>Không quyết định chỉ dựa trên ảnh lợi nhuận, lời chứng thực hoặc nhóm chat đông người.</li><li>Không cài ứng dụng từ file APK hoặc cấu hình do người môi giới gửi riêng.</li><li>Cảnh giác khi muốn rút tiền nhưng bị yêu cầu đóng “thuế”, “phí mở khóa”, “phí xác minh” hoặc nạp thêm để đạt hạn mức.</li><li>Tách việc kiểm tra danh tính người giới thiệu khỏi việc kiểm tra tính hợp pháp của nền tảng.</li></ul>
  <p>Nếu trang đầu tư được gửi qua link lạ, hãy áp dụng trước quy trình <a href="/kien-thuc/kiem-tra-link-gia-mao/">kiểm tra tên miền và website giả mạo</a>.</p>
</section>`,
  "deepfake-gia-giong-nguoi-than": `
<section data-seo-wave4="depth">
  <h2>Xác minh người thân bằng “kênh cũ + câu hỏi riêng”</h2>
  <p>Deepfake giọng nói hoặc hình ảnh khiến việc “nghe đúng giọng” hay “thấy đúng khuôn mặt” không còn đủ để xác minh danh tính trong tình huống chuyển tiền khẩn cấp. Khi nhận yêu cầu bất thường, hãy chủ động gọi lại số điện thoại đã lưu từ trước hoặc liên hệ một người thân khác có thể kiểm chứng.</p>
  <p>Một câu hỏi riêng mà hai bên đã biết từ trước có giá trị hơn các dữ kiện công khai trên mạng xã hội. Tránh dùng ngày sinh, tên trường, tên công ty hoặc thông tin dễ tìm. Nếu người gọi liên tục né tránh việc xác minh, tạo tiếng ồn, báo mạng yếu hoặc thúc ép “chuyển trước rồi nói sau”, hãy coi đó là tín hiệu rủi ro.</p>
  <p>Deepfake thường được kết hợp với chiếm đoạt tài khoản mạng xã hội hoặc kịch bản chuyển tiền khẩn cấp. Vì vậy nên đọc thêm <a href="/kien-thuc/tai-khoan-bi-hack-phai-lam-gi/">cách xử lý tài khoản bị hack</a> và <a href="/kien-thuc/nhan-dien-lua-dao-truc-tuyen/">các dấu hiệu lừa đảo phổ biến</a>.</p>
</section>`,
  "lua-dao-otp-chiem-doat-tai-khoan": `
<section data-seo-wave4="depth">
  <h2>OTP là khóa xác nhận hành động, không phải thông tin để “đối chiếu”</h2>
  <p>Mã OTP thường được tạo để xác nhận đăng nhập, thay đổi thiết lập hoặc giao dịch. Khi bạn đọc mã cho người khác, họ có thể dùng chính mã đó để hoàn tất hành động trên một thiết bị khác. Vì vậy nội dung tin nhắn OTP và hành động đang được xác nhận quan trọng hơn lời giải thích của người gọi.</p>
  <p>Nếu bất ngờ nhận OTP mà bạn không yêu cầu, không nhập mã vào link được gửi kèm và không đọc mã qua điện thoại/chat. Hãy tự mở ứng dụng chính thức, kiểm tra hoạt động đăng nhập, thiết bị tin cậy và đổi mật khẩu nếu có dấu hiệu tài khoản đã bị truy cập.</p>
  <p>Đối với tài khoản ngân hàng, ưu tiên liên hệ ngân hàng qua kênh chính thức khi nghi ngờ đã lộ mã xác thực. Với email hoặc mạng xã hội, thực hiện ngay checklist <a href="/kien-thuc/tai-khoan-bi-hack-phai-lam-gi/">khôi phục quyền kiểm soát tài khoản</a>.</p>
</section>`,
  "tai-khoan-bi-hack-phai-lam-gi": `
<section data-seo-wave4="depth">
  <h2>Thứ tự khôi phục để tránh bị chiếm lại tài khoản</h2>
  <p>Ưu tiên bảo vệ email hoặc số điện thoại dùng để khôi phục trước, vì đây thường là “chìa khóa” để đặt lại mật khẩu cho nhiều dịch vụ khác. Đổi mật khẩu từ thiết bị sạch, sau đó đăng xuất các phiên lạ, kiểm tra địa chỉ email/số điện thoại khôi phục, ứng dụng đã cấp quyền và phương thức xác thực đa yếu tố.</p>
  <p>Không chỉ đổi mật khẩu rồi dừng lại. Nếu kẻ xấu đã thêm thiết bị tin cậy, khóa bảo mật, địa chỉ chuyển tiếp email hoặc ứng dụng OAuth, họ có thể quay lại mà không cần mật khẩu cũ. Hãy rà soát toàn bộ mục bảo mật và thu hồi những gì bạn không nhận ra.</p>
  <p>Nếu cùng mật khẩu từng được dùng ở nơi khác, đổi các tài khoản quan trọng theo thứ tự ưu tiên: email, ngân hàng/tài chính, mạng xã hội, lưu trữ đám mây. Sau đó xem lại <a href="/kien-thuc/an-toan-thong-tin-ca-nhan/">hướng dẫn bảo vệ thông tin cá nhân</a> để thiết lập phòng ngừa lâu dài.</p>
</section>`,
};

const sourceForSlug = (slug) => {
  if (slug === "lua-dao-phat-nguoi-qua-sms") {
    return { href: OFFICIAL.bcaPhatNguoi, label: "cảnh báo chính thức của Bộ Công an về lừa đảo phạt nguội qua SMS" };
  }
  if (["gia-mao-ngan-hang", "lua-dao-otp-chiem-doat-tai-khoan", "tai-khoan-bi-hack-phai-lam-gi", "xu-ly-khi-bi-lua-dao-chuyen-tien"].includes(slug)) {
    return { href: OFFICIAL.sbv, label: "khuyến cáo của Ngân hàng Nhà nước về phòng ngừa lừa đảo chiếm đoạt tiền trong tài khoản" };
  }
  return { href: OFFICIAL.bca2026, label: "cảnh báo 25 kịch bản lừa đảo trên không gian mạng năm 2026 của Bộ Công an" };
};

function clusterBlock(slug) {
  const clusterName = slugCluster.get(slug) ?? "foundation";
  const candidates = clusters[clusterName].filter((item) => item !== slug).slice(0, 4);
  const links = candidates.map((item) => `<li><a href="/kien-thuc/${item}/">${labels[item]}</a></li>`).join("");
  return `<aside class="seo-note seo-cluster-links" data-seo-wave4="cluster"><strong>Đi tiếp theo cụm chủ đề</strong><ul>${links}</ul></aside>`;
}

function trustBlock(slug) {
  const source = sourceForSlug(slug);
  return `<section data-seo-wave4="sources"><h2>Nguồn kiểm chứng và nguyên tắc cập nhật</h2><p>Cảnh Giác Số ưu tiên đối chiếu nội dung với nguồn chính thức và cập nhật khi thủ đoạn thay đổi. Với chủ đề này, bạn có thể kiểm tra thêm ${`<a href="${source.href}" rel="external noopener">${source.label}</a>`}. Xem thêm <a href="/phuong-phap-kiem-chung/">phương pháp kiểm chứng & nguyên tắc biên tập</a> của website.</p></section>`;
}

const entries = await readdir(knowledgeRoot, { withFileTypes: true });
let patchedPages = 0;
let deepenedPages = 0;

for (const entry of entries) {
  if (!entry.isDirectory()) continue;
  const slug = entry.name;
  const file = path.join(knowledgeRoot, slug, "index.html");
  let html;
  try {
    html = await readFile(file, "utf8");
  } catch {
    continue;
  }

  let changed = false;
  if (expansions[slug] && !html.includes('data-seo-wave4="depth"')) {
    const marker = '<section class="seo-related">';
    if (html.includes(marker)) {
      html = html.replace(marker, `${expansions[slug]}\n${marker}`);
      deepenedPages += 1;
      changed = true;
    }
  }

  if (!html.includes('data-seo-wave4="cluster"')) {
    const marker = '<section class="seo-related">';
    if (html.includes(marker)) {
      html = html.replace(marker, `${clusterBlock(slug)}\n${marker}`);
      changed = true;
    }
  }

  if (!html.includes('data-seo-wave4="sources"')) {
    const marker = '<section class="seo-related">';
    if (html.includes(marker)) {
      html = html.replace(marker, `${trustBlock(slug)}\n${marker}`);
      changed = true;
    }
  }

  html = html
    .replace(/(<meta\s+property=["']article:modified_time["']\s+content=["'])\d{4}-\d{2}-\d{2}(["'][^>]*>)/i, `$1${UPDATED_ISO}$2`)
    .replace(/"dateModified":"\d{4}-\d{2}-\d{2}"/g, `"dateModified":"${UPDATED_ISO}"`)
    .replace(/Cập nhật ngày \d{2}\/\d{2}\/\d{4}/g, `Cập nhật ngày ${UPDATED_DISPLAY}`);

  if (changed) {
    await writeFile(file, html, "utf8");
    patchedPages += 1;
  }
}

const sitemapFile = path.join(ROOT, "public", "sitemap.xml");
let sitemap = await readFile(sitemapFile, "utf8");
sitemap = sitemap.replace(/<url>([\s\S]*?<loc>https:\/\/canhgiacso\.com\/kien-thuc\/[\w-]+\/<\/loc>[\s\S]*?<lastmod>)\d{4}-\d{2}-\d{2}(<\/lastmod>[\s\S]*?<\/url>)/g, `<url>$1${UPDATED_ISO}$2`);
await writeFile(sitemapFile, sitemap, "utf8");

console.log(`SEO Wave 4 patched ${patchedPages} article pages; deepened ${deepenedPages} thin pages; refreshed article lastmod to ${UPDATED_ISO}.`);
