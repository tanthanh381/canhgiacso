import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, "public");
const HOME = path.join(ROOT, "github-pages", "index.html");
const SITE = "https://canhgiacso.com";
const UPDATED = "2026-09-23";
const UPDATED_LABEL = "23/09/2026";
const BRAND = '<span class="seo-brand-logo" aria-hidden="true"></span><span class="seo-brand-divider" aria-hidden="true"></span><span class="seo-product-lockup"><strong>CẢNH GIÁC SỐ</strong><small>IT SECURITY</small></span>';
const THEME = '<script src="/theme-init.js"></script>';
const CSP_META = '<meta http-equiv="Content-Security-Policy" content="default-src \'self\'; script-src \'self\' https://www.googletagmanager.com; style-src \'self\' \'unsafe-inline\'; img-src \'self\' data: blob: https://www.google-analytics.com https://www.googletagmanager.com; font-src \'self\' data:; connect-src \'self\' https://goietwyapiywrtibpkwo.supabase.co wss://goietwyapiywrtibpkwo.supabase.co https://www.google-analytics.com https://analytics.google.com https://region1.google-analytics.com https://www.googletagmanager.com; object-src \'none\'; base-uri \'self\'; form-action \'self\'; upgrade-insecure-requests" />';
const FOOTER = '<footer class="seo-footer"><div class="seo-shell"><strong>Cảnh Giác Số</strong><nav class="seo-footer-links" aria-label="Thông tin website"><a href="/gioi-thieu/">Giới thiệu</a><a href="/phuong-phap-kiem-chung/">Phương pháp kiểm chứng</a><a href="/quyen-rieng-tu/">Quyền riêng tư</a><a href="/sitemap/">Sơ đồ nội dung</a></nav><p class="seo-safety">Nội dung phục vụ giáo dục, nhận diện rủi ro và nâng cao nhận thức an toàn thông tin.</p></div></footer>';

const SOURCES = {
  mps2026: ["https://www.bocongan.gov.vn/bai-viet/nang-cao-canh-giac-truoc-25-kich-ban-lua-dao-tren-khong-gian-mang-nam-2026-1788865614", "Bộ Công an — 25 kịch bản lừa đảo trên không gian mạng năm 2026"],
  mps24: ["https://hvannd.bocongan.gov.vn/bv/ct/10060/24-hinh-thuc-lua-dao-dien-ra-tren-khong-gian-mang-viet-nam", "Học viện An ninh nhân dân — 24 hình thức lừa đảo trên không gian mạng"],
  mpsGuide: ["https://hvannd.bocongan.gov.vn/bv/ct/10051/nhan-dien-va-phong-chong-lua-dao-truc-tuyen", "Học viện An ninh nhân dân — Nhận diện và phòng chống lừa đảo trực tuyến"],
  evn: ["https://www.evn.com.vn/vi-VN/news-l/Thong-bao-va-khuyen-nghi-60-134", "EVN — Thông báo và khuyến nghị về giả mạo, nợ tiền điện"],
  bhxh: ["https://baohiemxahoi.gov.vn/tintuc/Pages/chuyen-doi-so.aspx?CateID=176&ItemID=25330", "BHXH Việt Nam — Cảnh báo website giả mạo Cổng dịch vụ công BHXH"],
  sim: ["https://bocongan.gov.vn/tin-tuc-su-kien/su-kien-chao-mung-ngay-thanh-lap-nganh/can-lam-gi-truoc-cac-cuoc-goi-va-tin-nhan-lua-dao-bang-hinh-thuc-thong-bao-khoa-thue-bao-s14-t34656.html", "Bộ Công an — Cảnh báo lừa đảo thông báo khóa thuê bao"],
  brand: ["https://cdcsnd1.bocongan.gov.vn/home/phap-luat/gia-mao-tin-nhan-thuong-hieu-de-lua-dao-8517", "CAND — Cảnh báo giả mạo tin nhắn thương hiệu"],
  vneid: ["https://bocongan.gov.vn/bai-viet/canh-bao-thu-doan-lua-dao-cai-ung-dung-vneid-gia-mao-d104-t45880", "Bộ Công an — Cảnh báo ứng dụng VNeID giả mạo chiếm quyền thiết bị"],
  kidnapping: ["https://www.bocongan.gov.vn/bai-viet/canh-bao-toi-pham-lua-dao-bang-thu-doan-tong-tien-truc-tuyen-1764129007", "Bộ Công an — Cảnh báo thủ đoạn tống tiền trực tuyến, thường gọi là bắt cóc online"],
  kidnapping2026: ["https://bocongan.gov.vn/bai-viet/ha-noi-cong-an-phuong-tay-ho-kip-thoi-ngan-chan-vu-bat-coc-online-bao-ve-an-toan-cho-nguoi-dan-1784087318", "Bộ Công an — Vụ việc bắt cóc online được ngăn chặn năm 2026"],
  extortion: ["https://www.bocongan.gov.vn/bai-viet/canh-bao-tinh-trang-quay-tro-lai-thu-doan-cat-ghep-hinh-anh-nhay-cam-nham-cuong-doat-tai-san-1788770637", "Bộ Công an — Cảnh báo cắt ghép hình ảnh nhạy cảm để cưỡng đoạt tài sản"],
  romance: ["https://bocongan.gov.vn/bai-viet/bat-giu-them-3-doi-tuong-cot-can-trong-duong-day-su-dung-app-tinh-cam-lua-dao-chiem-doat-hon-2-300-ty-dong-1785601105", "Bộ Công an — Đường dây dùng app tình cảm để lừa đảo chiếm đoạt tài sản"],
  recruitment: ["https://bocongan.gov.vn/bai-viet/canh-giac-voi-thu-doan-mua-ban-nguoi-nup-bong-tuyen-dung-viec-lam-1788002885", "Bộ Công an — Cảnh giác tuyển dụng việc làm giả mạo"],
};

const esc = (value) => value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const linksHtml = (items) => items.map((x) => `<li><a href="${x[0]}" target="_blank" rel="noopener noreferrer">${x[1]}</a></li>`).join("");
const relatedHtml = (items) => items.map((x) => `<li><a href="${x[0]}">${x[1]}</a></li>`).join("");

async function ensureDir(file) {
  await mkdir(path.dirname(file), { recursive: true });
}
async function write(relative, content) {
  const file = path.join(PUBLIC, relative);
  await ensureDir(file);
  await writeFile(file, content, "utf8");
}
async function exists(file) {
  try { await readFile(file); return true; } catch { return false; }
}
async function read(relative) {
  return readFile(path.join(PUBLIC, relative), "utf8");
}

function header(active = "") {
  return `<header class="seo-header"><div class="seo-shell seo-nav"><a class="seo-brand" href="/">${BRAND}</a><nav class="seo-nav-links" aria-label="Điều hướng"><a href="/">Thử thách</a><a href="/kien-thuc/"${active === "knowledge" ? ' aria-current="page"' : ""}>Cẩm nang</a><a href="/cong-cu/"${active === "tools" ? ' aria-current="page"' : ""}>Công cụ</a><a href="/canh-bao-lua-dao-hom-nay/"${active === "alerts" ? ' aria-current="page"' : ""}>Cảnh báo</a></nav></div></header>`;
}

function articleSchema(article) {
  const canonical = `${SITE}/kien-thuc/${article.slug}/`;
  return JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id": `${canonical}#article`,
        headline: article.h1,
        description: article.description,
        datePublished: UPDATED,
        dateModified: UPDATED,
        inLanguage: "vi-VN",
        mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
        image: { "@type": "ImageObject", url: `${SITE}/og.png`, width: 1731, height: 909 },
        author: { "@id": `${SITE}/#organization` },
        publisher: { "@id": `${SITE}/#organization` },
      },
      {
        "@type": "Organization",
        "@id": `${SITE}/#organization`,
        name: "Cảnh Giác Số",
        url: `${SITE}/`,
        logo: { "@type": "ImageObject", url: `${SITE}/search-logo.svg`, width: 800, height: 800 },
        publishingPrinciples: `${SITE}/phuong-phap-kiem-chung/`,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Cảnh Giác Số", item: `${SITE}/` },
          { "@type": "ListItem", position: 2, name: "Kiến thức", item: `${SITE}/kien-thuc/` },
          { "@type": "ListItem", position: 3, name: article.h1, item: canonical },
        ],
      },
    ],
  });
}

function articlePage(a) {
  const canonical = `${SITE}/kien-thuc/${a.slug}/`;
  const signs = a.signs.map((x) => `<li>${x}</li>`).join("");
  const verify = a.verify.map((x) => `<li>${x}</li>`).join("");
  const response = a.response.map((x) => `<li>${x}</li>`).join("");
  return `<!doctype html>
<html lang="vi-VN">
<head>
  ${CSP_META}
  ${THEME}
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="referrer" content="strict-origin-when-cross-origin" />
  <title>${esc(a.title)}</title>
  <meta name="description" content="${esc(a.description)}" />
  <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" />
  <meta name="author" content="Cảnh Giác Số" />
  <link rel="canonical" href="${canonical}" />
  <link rel="alternate" hreflang="vi-VN" href="${canonical}" />
  <link rel="alternate" hreflang="x-default" href="${canonical}" />
  <link rel="stylesheet" href="/seo.css" />
  <link rel="icon" type="image/png" href="/khien-so-logo.png" />
  <link rel="apple-touch-icon" href="/khien-so-logo.png" />
  <meta property="og:type" content="article" />
  <meta property="og:locale" content="vi_VN" />
  <meta property="og:site_name" content="Cảnh Giác Số" />
  <meta property="og:title" content="${esc(a.title)}" />
  <meta property="og:description" content="${esc(a.description)}" />
  <meta property="og:url" content="${canonical}" />
  <meta property="og:image" content="${SITE}/og.png" />
  <meta property="article:modified_time" content="${UPDATED}T00:00:00+07:00" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(a.title)}" />
  <meta name="twitter:description" content="${esc(a.description)}" />
  <meta name="twitter:image" content="${SITE}/og.png" />
  <script type="application/ld+json">${articleSchema(a)}</script>
</head>
<body>
${header("knowledge")}
<main class="seo-article">
  <div class="seo-breadcrumb"><a href="/">Cảnh Giác Số</a> › <a href="/kien-thuc/">Kiến thức</a> › ${a.breadcrumb}</div>
  <span class="seo-eyebrow">${a.eyebrow}</span>
  <h1>${a.h1}</h1>
  <p class="lead">${a.lead}</p>
  <section class="seo-answer-box" aria-label="Trả lời nhanh"><strong>Trả lời nhanh</strong><p>${a.quick}</p></section>
  <div class="seo-meta">Cập nhật: <time datetime="${UPDATED}">${UPDATED_LABEL}</time> · Kiểm chứng theo nguồn chính thức</div>

  <section><h2>${a.contextTitle}</h2><p>${a.context}</p><p>${a.context2}</p></section>
  <section><h2>Dấu hiệu cần dừng lại và kiểm tra</h2><ul class="seo-checklist">${signs}</ul></section>
  <section><h2>Cách xác minh an toàn</h2><ol class="seo-checklist">${verify}</ol></section>
  <section><h2>Nếu bạn đã làm theo hướng dẫn</h2><ol class="seo-checklist">${response}</ol><p>Không chuyển thêm tiền với lý do “mở khóa”, “hoàn tất xác minh” hoặc “thu hồi tiền”. Hãy ưu tiên bảo vệ tài khoản, lưu bằng chứng và liên hệ tổ chức liên quan qua kênh chính thức.</p></section>
  <section><h2>Vì sao kịch bản này dễ khiến người dùng tin?</h2><p>${a.psychology}</p><p>${a.boundary}</p></section>
  <section><h2>Nguồn kiểm chứng</h2><ul class="seo-checklist">${linksHtml(a.sources)}</ul></section>
  <section class="seo-search-cluster"><h2>Kiểm tra tiếp theo tình huống</h2><ul>${relatedHtml(a.related)}</ul></section>
  <section class="seo-related"><h2>Công cụ hỗ trợ</h2><ul><li><a href="/cong-cu/kiem-tra-cuoc-goi-la/">Kiểm tra tình huống cuộc gọi lạ</a></li><li><a href="/cong-cu/kiem-tra-truoc-khi-chuyen-tien/">Checklist trước khi chuyển tiền</a></li><li><a href="/cong-cu/xu-ly-khi-bi-lua/">Tôi vừa bị lừa — phải làm gì ngay?</a></li></ul></section>
</main>
${FOOTER}
</body>
</html>`;
}

const articles = [
  {
    slug:"bien-lai-chuyen-khoan-gia",
    title:"Biên lai chuyển khoản giả: 7 cách kiểm tra tiền đã vào chưa",
    description:"Cách nhận biết biên lai chuyển khoản giả và kiểm tra tiền đã thực sự vào tài khoản chưa trước khi giao hàng, hoàn tiền hoặc chuyển khoản ngược.",
    h1:"Biên lai chuyển khoản giả: 7 cách kiểm tra tiền đã thực sự vào tài khoản",
    breadcrumb:"Biên lai chuyển khoản giả",
    eyebrow:"CHUYỂN KHOẢN · MUA BÁN ONLINE",
    lead:"Ảnh biên lai, ảnh chụp màn hình hay file PDF có thể được chỉnh sửa và không chứng minh tiền đã được ghi có vào tài khoản người nhận.",
    quick:"Chỉ giao hàng hoặc hoàn tất giao dịch sau khi bạn tự kiểm tra lịch sử giao dịch/số dư trên ứng dụng hoặc kênh ngân hàng chính thức của mình; không dựa vào ảnh người mua gửi.",
    contextTitle:"Biên lai giả thường được dùng như thế nào?",
    context:"Đối tượng có thể đặt hàng giá trị cao, gửi ảnh “chuyển khoản thành công” rồi thúc người bán giao hàng. Một biến thể khác là gửi ảnh thể hiện chuyển dư tiền và yêu cầu nạn nhân hoàn lại phần chênh lệch.",
    context2:"Điểm mấu chốt không phải ảnh có đẹp hay logo có đúng hay không. Điều cần kiểm tra là giao dịch có xuất hiện trong tài khoản nhận của chính bạn, đúng số tiền, thời điểm và nội dung hay chưa.",
    signs:["Chỉ gửi ảnh/PDF nhưng tiền chưa xuất hiện trong tài khoản nhận.","Thúc giao hàng ngay vì “ngân hàng đang chậm cập nhật”.","Yêu cầu hoàn lại tiền dư về một tài khoản khác.","Ảnh có số tiền, thời gian hoặc font chữ bất thường.","Người mua né xác minh danh tính hoặc thay đổi tài khoản liên tục.","Dẫn bạn sang link/app lạ để “xác nhận đã nhận tiền”."],
    verify:["Mở ứng dụng/ngân hàng điện tử bằng lối truy cập bạn vẫn dùng từ trước.","Kiểm tra lịch sử giao dịch, số dư khả dụng và tên tài khoản gửi nếu hiển thị.","Đối chiếu số tiền, nội dung, thời gian và mã giao dịch phía tài khoản nhận.","Nếu giao dịch ở trạng thái chờ hoặc nghi ngờ, liên hệ ngân hàng qua hotline/app chính thức.","Không nhấp link trong biên lai hoặc tin nhắn để kiểm tra tiền."],
    response:["Nếu đã giao hàng, lưu thông tin đơn, hội thoại, địa chỉ nhận và biên lai giả.","Nếu đã “hoàn lại” tiền, liên hệ ngân hàng ngay để báo giao dịch và hỏi hướng dẫn tra soát.","Ngừng trao đổi nếu đối tượng tiếp tục yêu cầu chuyển thêm phí hoặc tiền xác minh.","Trình báo cơ quan Công an khi có dấu hiệu chiếm đoạt tài sản."],
    psychology:"Biên lai ngân hàng tạo cảm giác có bằng chứng khách quan, khiến người bán dễ bỏ qua bước kiểm tra phía tài khoản của mình. Kẻ gian thường kết hợp áp lực thời gian để nạn nhân xử lý theo thói quen.",
    boundary:"Một giao dịch chậm cập nhật không đồng nghĩa chắc chắn là lừa đảo; vì vậy Cảnh Giác Số không kết luận chỉ từ ảnh. Nguyên tắc an toàn là chờ xác nhận trực tiếp từ ngân hàng nhận.",
    sources:[SOURCES.mps24,SOURCES.mpsGuide],
    related:[["/kien-thuc/nguoi-mua-gui-link-nhan-tien-lua-dao/","Người mua gửi link nhận tiền có phải lừa đảo không?"],["/kien-thuc/dat-coc-mua-hang-online-lua-dao/","Đặt cọc mua hàng online: dấu hiệu cần kiểm tra"],["/cong-cu/kiem-tra-bien-lai-chuyen-khoan/","Công cụ checklist kiểm tra biên lai chuyển khoản"]],
  },
  {
    slug:"cuoc-goi-im-lang-lua-dao",
    title:"Cuộc gọi im lặng có phải lừa đảo không? Cách xử lý an toàn",
    description:"Cuộc gọi bắt máy nhưng không ai nói có phải lừa đảo không? Cách xử lý an toàn, tránh gọi lại số lạ và phân biệt giả thuyết thu giọng nói với dữ kiện thực tế.",
    h1:"Cuộc gọi im lặng có phải lừa đảo không? Cách xử lý an toàn",
    breadcrumb:"Cuộc gọi im lặng",
    eyebrow:"CUỘC GỌI LẠ · XÁC MINH",
    lead:"Một cuộc gọi im lặng có thể do tổng đài tự động, lỗi kết nối, telemarketing hoặc nhiều nguyên nhân khác; chỉ riêng việc không có tiếng nói không đủ để kết luận đó là lừa đảo.",
    quick:"Không cần nói thông tin cá nhân hay gọi lại ngay. Nếu cuộc gọi liên quan ngân hàng, cơ quan nhà nước hoặc dịch vụ quan trọng, hãy tự tìm kênh chính thức và xác minh độc lập.",
    contextTitle:"Có phải cuộc gọi im lặng dùng để thu giọng nói?",
    context:"Trên mạng có nhiều suy đoán rằng mọi cuộc gọi im lặng đều nhằm thu mẫu giọng nói để tạo deepfake. Hiện không nên coi giả thuyết đó là kết luận mặc định nếu không có thêm bằng chứng về kịch bản, yêu cầu hoặc hành vi sau cuộc gọi.",
    context2:"Rủi ro thực tế nằm ở chuỗi hành động tiếp theo: gọi lại số tính phí, tin cuộc gọi sau vì đối tượng biết thông tin cá nhân, hoặc bị dẫn sang link, ứng dụng, OTP và chuyển tiền.",
    signs:["Cuộc gọi lặp lại nhiều lần từ các số khác nhau rồi chuyển sang tin nhắn/link.","Người gọi sau đó tự xưng cơ quan/ngân hàng và nêu đúng một phần thông tin cá nhân.","Yêu cầu bạn xác nhận CCCD, tài khoản, OTP hoặc mật khẩu.","Đề nghị cài ứng dụng, chia sẻ màn hình hoặc bật quyền thiết bị.","Tạo áp lực phải xử lý ngay nếu không sẽ khóa tài khoản, phạt hoặc điều tra."],
    verify:["Không gọi lại chỉ vì tò mò; tìm số chính thức của tổ chức nếu nội dung có liên quan.","Không đọc lại thông tin cá nhân để “xác nhận danh tính” với người gọi đến.","Nếu nghi số giả mạo, kết thúc cuộc gọi và tự gọi lại kênh chính thức.","Ghi nhận thời gian, số gọi đến và nội dung nếu có dấu hiệu lặp lại/quấy rối.","Dùng công cụ kiểm tra tình huống cuộc gọi lạ để xác định bước xác minh phù hợp."],
    response:["Nếu chỉ bắt máy và chưa cung cấp gì, không cần hoảng; tiếp tục theo dõi và chặn nếu quấy rối.","Nếu đã cung cấp thông tin xác thực, đổi mật khẩu/khóa rủi ro theo dịch vụ liên quan.","Nếu đã cài app hoặc chia sẻ màn hình, ngắt kết nối và xử lý như sự cố chiếm quyền thiết bị.","Nếu đã chuyển tiền, liên hệ ngân hàng và lưu toàn bộ bằng chứng ngay."],
    psychology:"Sự mơ hồ khiến người nhận muốn gọi lại để biết ai vừa liên hệ. Kẻ gian có thể tận dụng tính tò mò hoặc một cuộc gọi tiếp theo có kịch bản thuyết phục hơn.",
    boundary:"Không nên lan truyền khẳng định “chỉ cần nói alo là mất tiền” hoặc “mọi cuộc gọi im lặng đều thu giọng nói”. Cảnh báo tốt cần tách khả năng kỹ thuật khỏi bằng chứng của từng tình huống.",
    sources:[SOURCES.mps2026,SOURCES.mpsGuide],
    related:[["/kien-thuc/kiem-tra-so-dien-thoai-lua-dao/","Kiểm tra số điện thoại lạ bằng nhiều nguồn"],["/kien-thuc/deepfake-gia-giong-nguoi-than/","Deepfake giả giọng người thân: cách xác minh"],["/cong-cu/kiem-tra-cuoc-goi-la/","Kiểm tra tình huống cuộc gọi lạ"]],
  },
  {
    slug:"lua-dao-khoa-sim-chuan-hoa-thue-bao",
    title:"Tin nhắn khóa SIM, chuẩn hóa thuê bao có phải lừa đảo không?",
    description:"Cách nhận biết cuộc gọi, SMS thông báo khóa SIM hoặc yêu cầu chuẩn hóa thuê bao; cách tự kiểm tra với nhà mạng mà không bấm link hay cung cấp OTP.",
    h1:"Tin nhắn khóa SIM, chuẩn hóa thuê bao có phải lừa đảo không?",
    breadcrumb:"Khóa SIM, chuẩn hóa thuê bao",
    eyebrow:"VIỄN THÔNG · GIẢ MẠO",
    lead:"Kẻ gian có thể lợi dụng các thủ tục viễn thông có thật để tạo áp lực rằng thuê bao sắp bị khóa, từ đó dụ người dùng cung cấp thông tin hoặc thực hiện thao tác có rủi ro.",
    quick:"Không làm theo link hoặc số điện thoại lạ. Mở ứng dụng chính thức của nhà mạng, truy cập website nhà mạng bằng địa chỉ bạn tự nhập hoặc gọi tổng đài công khai để kiểm tra tình trạng thuê bao.",
    contextTitle:"Vì sao thông báo khóa SIM dễ tạo áp lực?",
    context:"Điện thoại thường là kênh nhận OTP, khôi phục tài khoản và liên lạc chính. Vì sợ mất số, người dùng có thể vội cung cấp dữ liệu cá nhân hoặc làm theo hướng dẫn chuyển tiếp cuộc gọi.",
    context2:"Bộ Công an từng cảnh báo thủ đoạn lợi dụng việc chuẩn hóa thông tin thuê bao để lừa chiếm SIM, tài khoản ngân hàng và ví điện tử.",
    signs:["Thông báo sẽ khóa SIM trong vài giờ nếu không làm ngay.","Gửi link không thuộc domain chính thức của nhà mạng.","Yêu cầu OTP, mật khẩu, mã USSD hoặc thao tác chuyển tiếp cuộc gọi.","Đề nghị cài app/APK ngoài kho ứng dụng chính thức.","Yêu cầu thanh toán phí “mở khóa” vào tài khoản cá nhân."],
    verify:["Mở ứng dụng chính thức của Viettel, VinaPhone, MobiFone hoặc nhà mạng bạn sử dụng.","Tự gõ tên miền chính thức thay vì bấm link trong SMS.","Gọi tổng đài nhà mạng từ thông tin công khai trên website/app chính thức.","Không thực hiện mã lệnh, chuyển tiếp cuộc gọi hoặc đổi SIM theo người gọi lạ.","Nếu SIM đột ngột mất sóng bất thường, liên hệ nhà mạng ngay."],
    response:["Nếu đã cung cấp OTP hoặc thông tin tài khoản nhà mạng, đổi thông tin đăng nhập và liên hệ nhà mạng.","Nếu số điện thoại mất quyền kiểm soát, yêu cầu nhà mạng khóa/khôi phục SIM và đồng thời bảo vệ tài khoản ngân hàng/email.","Kiểm tra các tài khoản dùng số điện thoại đó làm kênh khôi phục.","Lưu SMS, số gọi đến và thời điểm để báo cáo khi cần."],
    psychology:"Thông báo mất số đánh trực tiếp vào nỗi sợ mất quyền truy cập ngân hàng và tài khoản online. Tốc độ phản ứng thường khiến người dùng bỏ qua việc kiểm tra domain hoặc kênh liên hệ.",
    boundary:"Không phải mọi thông báo chuẩn hóa đều giả. Điểm quyết định là bạn có thể xác minh cùng thông tin đó qua ứng dụng, website hoặc tổng đài chính thức mà không cần làm theo kênh người lạ cung cấp hay không.",
    sources:[SOURCES.sim,SOURCES.mps2026],
    related:[["/kien-thuc/lua-dao-otp-chiem-doat-tai-khoan/","OTP và chiếm đoạt tài khoản"],["/cong-cu/kiem-tra-tin-nhan-dang-ngo/","Kiểm tra tín hiệu rủi ro trong SMS"],["/cong-cu/tra-cuu-kenh-chinh-thuc/","Tra cứu kênh liên hệ chính thức"]],
  },
  {
    slug:"app-quyen-tro-nang-lua-dao",
    title:"App yêu cầu quyền Trợ năng có nguy hiểm không? Cách kiểm tra",
    description:"Quyền Trợ năng trên Android có thể bị lạm dụng thế nào trong app giả mạo? Cách kiểm tra Accessibility, SMS, thông báo, chia sẻ màn hình và nguồn cài đặt.",
    h1:"App yêu cầu quyền Trợ năng có nguy hiểm không? Cách kiểm tra trước khi cấp",
    breadcrumb:"Quyền Trợ năng Android",
    eyebrow:"ANDROID · QUYỀN ỨNG DỤNG",
    lead:"Accessibility/Trợ năng là tính năng hợp pháp để hỗ trợ người dùng, nhưng quyền mạnh này có thể bị ứng dụng độc hại lạm dụng để quan sát hoặc điều khiển thao tác trên thiết bị.",
    quick:"Nếu một ứng dụng được gửi qua link/APK và người gọi yêu cầu bật Trợ năng, đọc SMS, chia sẻ màn hình hoặc cấp quyền quản trị thiết bị, hãy dừng lại và xác minh nguồn ứng dụng.",
    contextTitle:"Vì sao quyền Trợ năng cần được kiểm tra kỹ?",
    context:"Bản thân quyền Trợ năng không đồng nghĩa ứng dụng độc hại. Nhiều ứng dụng hỗ trợ người khuyết tật hoặc tự động hóa hợp pháp cần quyền này. Rủi ro tăng mạnh khi nó đi cùng nguồn cài đặt không chính thống và kịch bản mạo danh.",
    context2:"Bộ Công an đã cảnh báo ứng dụng VNeID giả mạo được yêu cầu cấp quyền truy cập thiết bị ở mức cao, có thể đọc dữ liệu, SMS chứa OTP và hỗ trợ chiếm quyền tài khoản ngân hàng.",
    signs:["File APK được gửi qua Zalo, SMS, Telegram hoặc website lạ.","Người gọi hướng dẫn từng bước bật Accessibility/Trợ năng.","Ứng dụng đòi đọc SMS, thông báo, ghi màn hình và danh bạ dù chức năng không cần.","Yêu cầu tắt Play Protect hoặc cho phép cài từ nguồn không xác định.","Ứng dụng mạo danh cơ quan nhà nước, ngân hàng hoặc dịch vụ công."],
    verify:["Kiểm tra nhà phát triển và nguồn cài trên Google Play/website chính thức.","Xem quyền nào thực sự cần thiết cho chức năng ứng dụng.","Không bật quyền chỉ để hoàn tất cuộc gọi hỗ trợ từ người lạ.","Nếu nghi ngờ, tìm tên ứng dụng + nhà phát triển từ nguồn độc lập.","Dùng checklist quyền ứng dụng của Cảnh Giác Số trước khi cấp."],
    response:["Ngắt Internet nếu nghi thiết bị đang bị điều khiển từ xa.","Thu hồi quyền Trợ năng, Device Admin, đọc SMS/thông báo và chia sẻ màn hình của app lạ.","Không mở app ngân hàng trên thiết bị đang nghi nhiễm; liên hệ ngân hàng bằng thiết bị khác nếu cần.","Lưu tên gói/app, ảnh màn hình quyền đã cấp trước khi gỡ nếu cần báo cáo."],
    psychology:"Kẻ gian thường khoác cho quyền kỹ thuật một lý do có vẻ hợp lệ như “đồng bộ dữ liệu”, “xác thực sinh trắc học” hoặc “hỗ trợ cài đặt”, khiến người dùng bỏ qua cảnh báo hệ điều hành.",
    boundary:"Công cụ chỉ đánh giá mức độ nhạy cảm của quyền và bối cảnh cài đặt; nó không thể kết luận một ứng dụng là mã độc nếu không phân tích kỹ thuật ứng dụng.",
    sources:[SOURCES.vneid,SOURCES.mps2026],
    related:[["/kien-thuc/app-dieu-khien-dien-thoai-tu-xa/","Bị dụ cài app điều khiển từ xa phải làm gì?"],["/cong-cu/kiem-tra-quyen-ung-dung-android/","Checklist quyền ứng dụng Android"],["/kien-thuc/lua-dao-vneid-gia-mao/","VNeID giả mạo: dấu hiệu nhận biết"]],
  },
  {
    slug:"app-dieu-khien-dien-thoai-tu-xa",
    title:"Bị dụ cài app điều khiển điện thoại từ xa phải làm gì?",
    description:"Cách xử lý khi đã cài app điều khiển từ xa hoặc app giả mạo: ngắt kết nối, khóa rủi ro ngân hàng, thu hồi quyền, đổi mật khẩu và lưu bằng chứng.",
    h1:"Bị dụ cài app điều khiển điện thoại từ xa phải làm gì?",
    breadcrumb:"App điều khiển từ xa",
    eyebrow:"CHIẾM QUYỀN THIẾT BỊ · XỬ LÝ",
    lead:"Nếu người lạ đã hướng dẫn bạn cài ứng dụng, chia sẻ màn hình hoặc cấp quyền điều khiển thiết bị, hãy coi đây là sự cố cần xử lý ngay thay vì tiếp tục làm theo để “hoàn tất thủ tục”.",
    quick:"Ngắt kết nối mạng khi nghi có điều khiển từ xa, không mở app ngân hàng trên thiết bị đó, liên hệ ngân hàng từ thiết bị khác nếu có rủi ro và thu hồi các quyền nhạy cảm của ứng dụng lạ.",
    contextTitle:"Kẻ gian làm gì sau khi có quyền thiết bị?",
    context:"Ứng dụng độc hại hoặc công cụ điều khiển từ xa có thể bị lợi dụng để quan sát thao tác, đọc thông báo, lấy OTP, dẫn dắt giao dịch hoặc che giấu hành động trên màn hình.",
    context2:"Bộ Công an xếp ứng dụng chứa mã độc và phần mềm điều khiển từ xa vào nhóm thủ đoạn đánh cắp dữ liệu, chiếm quyền điều khiển thiết bị trong cảnh báo năm 2026.",
    signs:["Người gọi yêu cầu cài file/app ngoài kho chính thức.","Yêu cầu chia sẻ màn hình hoặc đọc mã hiển thị trong app điều khiển.","Bật Accessibility, Device Admin, đọc SMS/thông báo.","Màn hình tự thao tác, xuất hiện cửa sổ lạ hoặc ứng dụng ngân hàng hoạt động bất thường.","Người hỗ trợ yêu cầu không tắt máy, không gọi ngân hàng hoặc giữ bí mật."],
    verify:["Xác định tên ứng dụng và quyền đã cấp trong Settings.","Dùng thiết bị khác để liên hệ ngân hàng/dịch vụ liên quan.","Đối chiếu app có phải bản chính thức từ nhà phát triển thật hay không.","Kiểm tra phiên đăng nhập, thiết bị liên kết và giao dịch gần đây.","Không cho đối tượng hướng dẫn thêm bước “gỡ lỗi” qua cùng kênh."],
    response:["Ngắt Wi-Fi/dữ liệu di động nếu nghi điều khiển đang diễn ra.","Liên hệ ngân hàng để khóa rủi ro nếu thiết bị có app ngân hàng hoặc đã lộ OTP.","Thu hồi quyền đặc biệt và gỡ app lạ; cân nhắc sao lưu dữ liệu cần thiết và khôi phục thiết bị nếu có bằng chứng mã độc.","Đổi mật khẩu quan trọng từ một thiết bị tin cậy và đăng xuất phiên cũ."],
    psychology:"Đối tượng thường bắt đầu bằng vai trò nhân viên hỗ trợ, cán bộ hoặc ngân hàng, sau đó biến các thao tác cấp quyền thành một “quy trình kỹ thuật” mà nạn nhân cảm thấy phải làm đủ.",
    boundary:"Không phải phần mềm hỗ trợ từ xa nào cũng xấu; nguy cơ đến từ việc người dùng cấp quyền cho người không xác minh được danh tính hoặc cài ứng dụng từ nguồn không đáng tin.",
    sources:[SOURCES.mps2026,SOURCES.vneid],
    related:[["/kien-thuc/app-quyen-tro-nang-lua-dao/","Quyền Trợ năng trên Android: kiểm tra gì?"],["/cong-cu/xu-ly-khi-bi-lua/","Wizard xử lý khi vừa bị lừa"],["/cong-cu/kiem-tra-quyen-ung-dung-android/","Kiểm tra các quyền ứng dụng đã yêu cầu"]],
  },
  {
    slug:"lua-dao-hoan-thue-gia-mao",
    title:"Hoàn thuế có phải lừa đảo không? Cách nhận biết website, app giả",
    description:"Nhận biết lừa đảo hoàn thuế qua cuộc gọi, SMS, website, QR và app giả mạo; cách tự kiểm tra nghĩa vụ thuế mà không cung cấp OTP hay chuyển phí.",
    h1:"Hoàn thuế có phải lừa đảo không? Cách nhận biết website, app giả",
    breadcrumb:"Hoàn thuế giả mạo",
    eyebrow:"HOÀN THUẾ · GIẢ MẠO",
    lead:"Hoàn thuế là nghiệp vụ có thật, nhưng kẻ gian có thể mạo danh cơ quan thuế để dụ người dùng truy cập link, quét QR, cài ứng dụng hoặc cung cấp thông tin ngân hàng.",
    quick:"Không nhận hoàn thuế bằng cách đọc OTP, cài APK hay chuyển “phí xử lý” theo người gọi. Tự truy cập cổng/ứng dụng thuế chính thức bằng địa chỉ bạn chủ động tìm.",
    contextTitle:"Kịch bản hoàn thuế giả thường bắt đầu thế nào?",
    context:"Đối tượng tạo cảm giác bạn sắp nhận được một khoản tiền và cần hoàn tất bước cuối. Mồi nhử có thể là tiền hoàn thuế, điều chỉnh hồ sơ hoặc cập nhật thông tin tài khoản nhận.",
    context2:"Cảnh báo năm 2026 của Bộ Công an liệt kê mạo danh cơ quan/tổ chức với lý do “nhận hoàn tiền” là một trong các kịch bản phổ biến.",
    signs:["Tin nhắn/call thông báo được hoàn tiền dù bạn không chủ động yêu cầu.","Link có giao diện cơ quan nhà nước nhưng domain lạ.","Yêu cầu nhập thông tin ngân hàng, mật khẩu hoặc OTP.","Yêu cầu quét QR để “nhận tiền” hoặc “xác thực tài khoản”.","Đề nghị cài app/APK hoặc chia sẻ màn hình.","Yêu cầu đóng phí trước khi nhận khoản hoàn."],
    verify:["Tự mở cổng/ứng dụng thuế chính thức từ nguồn bạn đã biết hoặc tìm qua cổng chính phủ.","Kiểm tra thông báo trong tài khoản thuế thay vì làm theo SMS/chat.","Không chuyển tiền vào tài khoản cá nhân để nhận hoàn thuế.","Không đọc OTP/mật khẩu cho người tự xưng cán bộ.","Nếu không chắc, liên hệ cơ quan thuế qua thông tin công khai."],
    response:["Nếu đã nhập thông tin ngân hàng, đổi thông tin xác thực và báo ngân hàng.","Nếu đã cài app lạ, ngắt kết nối và kiểm tra quyền thiết bị.","Nếu đã chuyển tiền, liên hệ ngân hàng ngay và lưu thông tin tài khoản nhận.","Lưu link, QR, số điện thoại, ảnh chụp và hội thoại để trình báo."],
    psychology:"Khác với kịch bản đe dọa, hoàn thuế dùng động lực nhận tiền. Người dùng dễ bỏ qua các dấu hiệu bất thường vì tập trung vào việc “hoàn tất thủ tục” để nhận khoản hoàn.",
    boundary:"Không phải mọi thông báo về thuế đều giả. Cách an toàn là tách thông báo khỏi hành động: bạn có thể kiểm tra cùng thông tin trên kênh chính thức mà không dùng link/người liên hệ kia hay không.",
    sources:[SOURCES.mps2026,SOURCES.mpsGuide],
    related:[["/kien-thuc/lua-dao-hoan-tien-don-hang/","Lừa đảo hoàn tiền đơn hàng"],["/kien-thuc/lua-dao-vneid-gia-mao/","Giả mạo dịch vụ công/VNeID"],["/cong-cu/kiem-tra-tin-nhan-dang-ngo/","Phân tích tín hiệu rủi ro trong tin nhắn"]],
  },
  {
    slug:"gia-danh-giao-vien-bao-con-tai-nan",
    title:"Giáo viên gọi báo con bị tai nạn có phải lừa đảo không?",
    description:"Khi có người tự xưng giáo viên báo con bị tai nạn và yêu cầu chuyển tiền viện phí: cách xác minh nhà trường, bệnh viện và người thân trước khi giao dịch.",
    h1:"Giáo viên gọi báo con bị tai nạn có phải lừa đảo không?",
    breadcrumb:"Giả danh giáo viên",
    eyebrow:"PHỤ HUYNH · KHẨN CẤP GIẢ",
    lead:"Kịch bản giả danh giáo viên đánh vào nỗi sợ của phụ huynh bằng thông tin khẩn cấp về con, khiến nạn nhân dễ chuyển tiền trước khi xác minh.",
    quick:"Không tranh luận với người gọi. Hãy tạm dừng chuyển tiền, gọi trực tiếp số của giáo viên/nhà trường bạn đã lưu từ trước và đồng thời liên hệ người thân hoặc bệnh viện qua kênh độc lập.",
    contextTitle:"Vì sao kịch bản này đặc biệt hiệu quả?",
    context:"Khi nghe con đang cấp cứu, phụ huynh có xu hướng hành động ngay. Đối tượng có thể biết tên con, trường, lớp hoặc một phần thông tin cá nhân để tăng độ tin cậy.",
    context2:"Các tài liệu cảnh báo lừa đảo tại Việt Nam đã liệt kê thủ đoạn giả danh giáo viên/nhân viên y tế báo người thân đang cấp cứu.",
    signs:["Yêu cầu chuyển tiền viện phí ngay vào tài khoản cá nhân.","Không cho phụ huynh nói chuyện trực tiếp với con hoặc giáo viên quen biết.","Đưa tên bệnh viện nhưng thúc phải chuyển trước khi gọi xác minh.","Số gọi đến không phải số liên hệ nhà trường đã biết.","Thông tin có phần đúng nhưng câu chuyện liên tục thay đổi khi bị hỏi chi tiết."],
    verify:["Gọi giáo viên chủ nhiệm/nhà trường bằng số đã lưu hoặc từ website chính thức.","Gọi trực tiếp số của con/người thân đi cùng.","Tự tìm số bệnh viện rồi gọi tổng đài/khoa cấp cứu; không dùng số người gọi cung cấp.","Xác minh tên bệnh nhân, khoa, bác sĩ và quy trình thanh toán của bệnh viện.","Nếu không liên lạc được ngay, nhờ người thân khác kiểm tra song song thay vì chuyển tiền trước."],
    response:["Nếu đã chuyển tiền, gọi ngân hàng ngay để báo giao dịch.","Lưu số điện thoại, số tài khoản, tên người nhận và toàn bộ hội thoại.","Thông báo nhà trường để họ cảnh báo phụ huynh khác nếu có chiến dịch giả mạo.","Trình báo Công an khi có dấu hiệu chiếm đoạt."],
    psychology:"Kịch bản khai thác tình cảm và trách nhiệm của cha mẹ, giảm khả năng đánh giá bình tĩnh. Từ khóa “mổ gấp”, “cấp cứu”, “không liên lạc được” thường tạo cảm giác không có thời gian kiểm tra.",
    boundary:"Tai nạn thật vẫn có thể xảy ra. Mục tiêu không phải phủ nhận thông báo mà là tạo một đường xác minh thứ hai trước khi chuyển tiền.",
    sources:[SOURCES.mps24,SOURCES.mpsGuide],
    related:[["/kien-thuc/gia-danh-benh-vien-bao-nguoi-than-cap-cuu/","Giả danh bệnh viện báo người thân cấp cứu"],["/cong-cu/kiem-tra-cuoc-goi-la/","Kiểm tra tình huống cuộc gọi khẩn cấp"],["/cong-cu/kiem-tra-truoc-khi-chuyen-tien/","Checklist trước khi chuyển tiền"]],
  },
  {
    slug:"gia-danh-benh-vien-bao-nguoi-than-cap-cuu",
    title:"Bệnh viện báo người thân cấp cứu: Cách xác minh trước khi chuyển",
    description:"Cách xử lý khi có người tự xưng bệnh viện báo người thân cấp cứu, yêu cầu chuyển tiền mổ gấp: xác minh bệnh nhân, khoa, tài khoản và kênh bệnh viện.",
    h1:"Bệnh viện gọi báo người thân cấp cứu: cách xác minh trước khi chuyển tiền",
    breadcrumb:"Giả danh bệnh viện",
    eyebrow:"BỆNH VIỆN · MẠO DANH",
    lead:"Người gọi có thể dùng tên bệnh viện, bác sĩ hoặc tình trạng khẩn cấp để yêu cầu người nhà chuyển tiền ngay; thông tin nghe hợp lý vẫn cần được xác minh độc lập.",
    quick:"Tự gọi tổng đài bệnh viện bằng số trên website chính thức, hỏi thông tin bệnh nhân/khoa và quy trình thanh toán. Không chuyển viện phí vào tài khoản cá nhân chỉ vì người gọi tạo áp lực.",
    contextTitle:"Kịch bản thường diễn ra như thế nào?",
    context:"Đối tượng báo người thân bị tai nạn hoặc cần phẫu thuật khẩn cấp rồi cung cấp tài khoản nhận tiền. Một số trường hợp phối hợp giả danh giáo viên, đồng nghiệp hoặc người đi cùng để câu chuyện thuyết phục hơn.",
    context2:"Các cảnh báo lừa đảo chính thống đã nêu thủ đoạn giả danh nhân viên y tế báo người thân đang cấp cứu và yêu cầu chuyển tiền mổ gấp.",
    signs:["Yêu cầu thanh toán vào tài khoản cá nhân thay vì kênh bệnh viện.","Không cung cấp được mã bệnh nhân/khoa/phòng để xác minh.","Từ chối cho nói chuyện với người thân hoặc nhân viên khác.","Liên tục thúc giục vì “sắp vào phòng mổ”.","Số liên hệ không xuất hiện trên website/kênh chính thức của bệnh viện."],
    verify:["Tự tìm website bệnh viện và gọi tổng đài chính thức.","Gọi người thân/người đi cùng bằng số đã biết.","Hỏi quy trình thanh toán và tên đơn vị thụ hưởng chính thức.","Xác minh ít nhất hai dữ kiện độc lập: bệnh nhân có ở đó không và khoản tiền có đúng quy trình không.","Nếu cần, nhờ người thân gần bệnh viện đến trực tiếp."],
    response:["Nếu đã chuyển khoản, liên hệ ngân hàng để báo giao dịch ngay.","Lưu số tài khoản, số gọi đến, nội dung và thời điểm.","Thông báo bệnh viện nếu thương hiệu của họ đang bị mạo danh.","Trình báo cơ quan chức năng khi có dấu hiệu lừa đảo."],
    psychology:"Nỗi sợ mất người thân khiến nạn nhân ưu tiên tốc độ hơn quy trình. Kẻ gian cố rút ngắn thời gian xác minh bằng cách tạo tình huống “không thể chờ”.",
    boundary:"Không phải mọi cuộc gọi từ bệnh viện đều giả. Quy tắc an toàn là xác minh qua một kênh bạn tự tìm và kiểm tra tài khoản thanh toán trước khi giao dịch.",
    sources:[SOURCES.mps24,SOURCES.mpsGuide],
    related:[["/kien-thuc/gia-danh-giao-vien-bao-con-tai-nan/","Giả danh giáo viên báo con bị tai nạn"],["/cong-cu/kiem-tra-cuoc-goi-la/","Kiểm tra cuộc gọi lạ"],["/cong-cu/kiem-tra-truoc-khi-chuyen-tien/","Checklist chuyển tiền khẩn cấp"]],
  },
  {
    slug:"sms-brandname-gia-mao",
    title:"SMS Brandname giả là gì? Vì sao tin nhắn cùng luồng vẫn có thể giả",
    description:"SMS Brandname giả mạo có thể hiển thị cùng luồng tin nhắn thương hiệu. Cách kiểm tra link, nội dung, OTP và kênh ngân hàng trước khi đăng nhập hoặc chuyển tiền.",
    h1:"SMS Brandname giả là gì? Vì sao tin nhắn cùng luồng vẫn có thể giả",
    breadcrumb:"SMS Brandname giả",
    eyebrow:"SMS BRANDNAME · PHISHING",
    lead:"Tên thương hiệu hiển thị trên SMS không nên được dùng như bằng chứng duy nhất rằng tin nhắn là chính thức, đặc biệt khi nội dung yêu cầu đăng nhập, cung cấp OTP hoặc bấm link.",
    quick:"Nếu SMS yêu cầu thao tác nhạy cảm, hãy đóng tin nhắn và tự mở app/website chính thức. Không đăng nhập ngân hàng từ link SMS chỉ vì tin nhắn nằm trong cùng luồng Brandname cũ.",
    contextTitle:"Vì sao người dùng dễ tin Brandname?",
    context:"Điện thoại thường gom các tin cùng tên người gửi vào một luồng, tạo cảm giác liên tục với thông báo thật trước đó. Cảnh báo của lực lượng Công an từng nêu trường hợp tin nhắn giả mạo thương hiệu xuất hiện cùng thư mục với tin nhắn thật.",
    context2:"Nội dung giả thường đánh vào giao dịch bất thường, khóa tài khoản, nhận tiền hoặc xác minh thông tin để khiến người dùng bấm link ngay.",
    signs:["Tin nhắn chứa link đăng nhập hoặc tên miền lạ.","Thông báo giao dịch/khóa tài khoản nhưng bạn không thấy trong app chính thức.","Yêu cầu nhập OTP, mật khẩu, PIN, CVV.","Tên miền chỉ giống thương hiệu bằng chữ nhưng không phải domain chính thức.","Nội dung tạo áp lực phải xử lý ngay."],
    verify:["Không bấm link; tự mở app ngân hàng/dịch vụ đã cài từ trước.","Gõ domain chính thức hoặc dùng bookmark đã lưu.","Kiểm tra thông báo/giao dịch ngay trong ứng dụng chính thức.","Gọi hotline lấy từ mặt sau thẻ hoặc website/app chính thức nếu cần.","Dùng công cụ kiểm tra SMS của Cảnh Giác Số để nhận diện tín hiệu rủi ro, không dùng nó làm bằng chứng duy nhất."],
    response:["Nếu đã nhập mật khẩu, đổi ngay từ kênh chính thức và đăng xuất phiên lạ.","Nếu đã cung cấp OTP, gọi ngân hàng/dịch vụ liên quan ngay.","Nếu đã chuyển tiền, báo ngân hàng và lưu bằng chứng.","Báo cáo tin nhắn giả mạo theo kênh của nhà mạng/cơ quan chức năng nếu phù hợp."],
    psychology:"Brandname mượn uy tín của chuỗi tin nhắn thật, nên người dùng thường bỏ qua việc kiểm tra domain. Đây là ví dụ rõ ràng vì sao “trông giống thật” không đồng nghĩa “đến từ nguồn thật”.",
    boundary:"Không phải tin nhắn Brandname nào cũng nguy hiểm. Hãy đánh giá hành động mà tin nhắn yêu cầu và xác minh qua kênh độc lập.",
    sources:[SOURCES.brand,SOURCES.mps2026],
    related:[["/kien-thuc/nhan-dien-email-phishing/","Nhận diện email phishing"],["/kien-thuc/kiem-tra-link-gia-mao/","Kiểm tra link lừa đảo"],["/cong-cu/kiem-tra-tin-nhan-dang-ngo/","Phân tích SMS đáng ngờ"]],
  },
  {
    slug:"nguoi-mua-gui-link-nhan-tien-lua-dao",
    title:"Người mua gửi link nhận tiền có phải lừa đảo không?",
    description:"Người mua gửi link hoặc QR để người bán nhận tiền có an toàn không? Cách nhận biết phishing mua bán online, biên lai giả và trang thanh toán giả mạo.",
    h1:"Người mua gửi link nhận tiền có phải lừa đảo không?",
    breadcrumb:"Link nhận tiền từ người mua",
    eyebrow:"MUA BÁN ONLINE · LINK GIẢ",
    lead:"Người bán không nên đăng nhập ngân hàng hoặc nhập thông tin thẻ vào một link do người mua gửi chỉ để nhận tiền; giao dịch nhận tiền bình thường không cần bạn cung cấp OTP cho người mua.",
    quick:"Nếu người mua yêu cầu bấm link/QR để “xác nhận nhận tiền”, hãy dừng lại. Kiểm tra trực tiếp tài khoản ngân hàng hoặc dùng phương thức thanh toán của nền tảng chính thức.",
    contextTitle:"Kịch bản nhắm vào người bán diễn ra thế nào?",
    context:"Đối tượng giả làm người mua, đồng ý giá nhanh rồi gửi đường dẫn có giao diện giống đơn vị vận chuyển, sàn thương mại điện tử hoặc ngân hàng. Trang giả yêu cầu đăng nhập, nhập thẻ hoặc OTP.",
    context2:"Một biến thể kết hợp biên lai chuyển khoản giả, sau đó yêu cầu người bán trả phí hoặc hoàn lại tiền dư.",
    signs:["Người mua né tính năng thanh toán chính thức của sàn.","Gửi link “nhận tiền”, “xác nhận đơn”, “mở khóa thanh toán”.","Domain không thuộc nền tảng/ngân hàng chính thức.","Trang yêu cầu OTP, mật khẩu hoặc thông tin thẻ để nhận tiền.","Người mua thúc giục vì đơn sắp hủy hoặc tiền sắp hoàn."],
    verify:["Kiểm tra tiền trực tiếp trong tài khoản nhận.","Nếu bán qua sàn, chỉ dùng luồng thanh toán trong ứng dụng/sàn chính thức.","Không đăng nhập ngân hàng từ link người mua gửi.","Tra cứu domain trước khi mở nếu vẫn cần kiểm tra.","Không hoàn lại “tiền dư” khi giao dịch chưa ghi có thực tế."],
    response:["Nếu đã nhập mật khẩu/thẻ, khóa rủi ro và đổi thông tin xác thực.","Nếu đã đọc OTP, liên hệ ngân hàng ngay.","Nếu đã gửi hàng, lưu địa chỉ nhận và thông tin vận chuyển.","Báo cáo tài khoản người mua cho nền tảng và cơ quan chức năng nếu có dấu hiệu lừa đảo."],
    psychology:"Người bán thường tập trung vào chốt đơn và giao hàng nên có thể ít cảnh giác hơn với phishing. Đối tượng tận dụng quy trình “xác nhận đơn” nghe có vẻ quen thuộc.",
    boundary:"Một số nền tảng có quy trình thanh toán/nhận tiền riêng. Hãy vào ứng dụng chính thức từ đầu thay vì dùng link do người mua gửi để biết quy trình thật.",
    sources:[SOURCES.mps2026,SOURCES.mpsGuide],
    related:[["/kien-thuc/bien-lai-chuyen-khoan-gia/","Biên lai chuyển khoản giả"],["/kien-thuc/dat-coc-mua-hang-online-lua-dao/","Đặt cọc mua hàng online"],["/cong-cu/kiem-tra-bien-lai-chuyen-khoan/","Checklist biên lai"]],
  },
  {
    slug:"dat-coc-mua-hang-online-lua-dao",
    title:"Đặt cọc mua hàng online: 10 dấu hiệu shop có rủi ro lừa đảo",
    description:"Trước khi đặt cọc mua hàng online, hãy kiểm tra 10 dấu hiệu rủi ro: tài khoản mới, giá quá thấp, chuyển khoản cá nhân, đánh giá giả và né thanh toán an toàn.",
    h1:"Đặt cọc mua hàng online: 10 dấu hiệu shop có rủi ro lừa đảo",
    breadcrumb:"Đặt cọc mua hàng online",
    eyebrow:"MUA HÀNG ONLINE · ĐẶT CỌC",
    lead:"Đặt cọc không phải lúc nào cũng là lừa đảo, nhưng người mua nên đánh giá danh tính người bán, lịch sử hoạt động và khả năng khiếu nại trước khi chuyển tiền.",
    quick:"Không chuyển cọc chỉ vì giá tốt hoặc sợ hết hàng. Hãy kiểm tra người bán ở nhiều nguồn, ưu tiên thanh toán có cơ chế bảo vệ người mua và xác minh tên người nhận.",
    contextTitle:"10 dấu hiệu rủi ro trước khi đặt cọc",
    context:"Rủi ro thường tăng khi nhiều tín hiệu xuất hiện cùng lúc: giá thấp bất thường, tài khoản mới, không cho xem hàng, ép chuyển tiền và dùng tài khoản nhận không liên quan.",
    context2:"Kẻ gian có thể sao chép ảnh, đánh giá và nội dung từ shop thật. Vì vậy hình ảnh đẹp và lượng tương tác không phải bằng chứng đủ mạnh.",
    signs:["Giá thấp đáng kể so với mặt bằng và chỉ áp dụng nếu chuyển ngay.","Tài khoản/page mới tạo hoặc đổi tên nhiều lần.","Không cung cấp địa chỉ/đơn vị kinh doanh có thể xác minh.","Từ chối COD/đơn hàng qua nền tảng nhưng yêu cầu cọc cao.","Tên tài khoản nhận tiền không liên quan người bán/doanh nghiệp.","Đánh giá lặp lại, tài khoản đánh giá sơ sài hoặc ảnh sản phẩm bị sao chép.","Chỉ trao đổi qua tài khoản chat mới, không có kênh hỗ trợ khác.","Dùng ảnh CCCD để “bảo đảm uy tín” thay vì bằng chứng giao dịch.","Thúc giục vì “còn một sản phẩm cuối” hoặc “nhiều người đang chốt”.","Sau khi cọc lại yêu cầu thêm phí vận chuyển/bảo hiểm/mở khóa đơn."],
    verify:["Tìm tên shop, số điện thoại, tài khoản ngân hàng và hình ảnh ở nhiều nguồn.","Dùng tìm kiếm hình ảnh khi nghi ảnh bị lấy từ nơi khác.","Ưu tiên cơ chế thanh toán/giữ tiền của sàn có quy trình khiếu nại.","Đối chiếu tên người nhận và danh tính người bán trước khi chuyển.","Nếu giá trị lớn, yêu cầu video/live hoặc xác minh trực tiếp phù hợp."],
    response:["Nếu vừa chuyển cọc và phát hiện dấu hiệu bất thường, liên hệ ngân hàng sớm.","Lưu bài đăng, URL, tài khoản, số điện thoại và biên lai.","Báo cáo gian hàng/tài khoản cho nền tảng.","Không chuyển thêm tiền để “lấy lại cọc” hoặc “mở khóa đơn”."],
    psychology:"Kịch bản thường dùng tính khan hiếm và tâm lý sợ bỏ lỡ. Khi người mua đã cọc một phần, hiệu ứng “đã lỡ bỏ tiền” có thể khiến họ tiếp tục chuyển thêm.",
    boundary:"Một shop nhỏ có thể dùng tài khoản cá nhân và vẫn kinh doanh hợp pháp. Không nên kết luận chỉ từ một tín hiệu; hãy đánh giá tổ hợp dấu hiệu và khả năng xác minh.",
    sources:[SOURCES.mps2026,SOURCES.mpsGuide],
    related:[["/kien-thuc/nguoi-mua-gui-link-nhan-tien-lua-dao/","Người mua gửi link nhận tiền"],["/kien-thuc/bien-lai-chuyen-khoan-gia/","Biên lai chuyển khoản giả"],["/cong-cu/kiem-tra-truoc-khi-chuyen-tien/","Checklist trước khi chuyển khoản"]],
  },
  {
    slug:"trung-thuong-nhan-qua-dong-phi-lua-dao",
    title:"Trúng thưởng, nhận quà nhưng phải đóng phí: Có phải lừa đảo?",
    description:"Được báo trúng thưởng hoặc có quà từ người lạ nhưng phải đóng phí vận chuyển, thuế, hải quan? Cách kiểm tra trước khi chuyển tiền và cung cấp thông tin.",
    h1:"Trúng thưởng, nhận quà nhưng phải đóng phí: có phải lừa đảo?",
    breadcrumb:"Trúng thưởng, nhận quà",
    eyebrow:"TRÚNG THƯỞNG · PHÍ TRƯỚC",
    lead:"Một dấu hiệu rủi ro phổ biến là người nhận được hứa hẹn quà, tiền hoặc giải thưởng có giá trị nhưng phải chuyển một khoản phí trước để “mở khóa” quyền nhận.",
    quick:"Không chuyển phí chỉ dựa trên thông báo trúng thưởng/quà tặng. Tự xác minh chương trình, đơn vị tổ chức và điều khoản trên website chính thức trước khi cung cấp dữ liệu hoặc thanh toán.",
    contextTitle:"Vì sao phí nhỏ có thể dẫn tới mất nhiều tiền?",
    context:"Đối tượng thường bắt đầu bằng khoản phí vừa phải như vận chuyển, hải quan, thuế hoặc xác minh. Sau khi nạn nhân đã chuyển, họ có thể phát sinh thêm nhiều lý do để yêu cầu khoản lớn hơn.",
    context2:"Kịch bản quà tặng cũng có thể được kết hợp với romance scam, giả mạo thương hiệu hoặc “voucher du lịch” để xây dựng lòng tin.",
    signs:["Bạn không hề tham gia chương trình nhưng được thông báo trúng.","Không tìm thấy thể lệ/chương trình trên kênh chính thức.","Yêu cầu chuyển phí vào tài khoản cá nhân.","Liên tục phát sinh phí mới sau mỗi lần chuyển.","Yêu cầu gửi CCCD, thẻ ngân hàng hoặc OTP để nhận quà.","Đe dọa mất phần thưởng nếu không thanh toán ngay."],
    verify:["Tìm chương trình trên website chính thức của đơn vị tổ chức.","Gọi kênh chăm sóc khách hàng do bạn tự tìm.","Kiểm tra thể lệ, điều kiện, thời gian và cách trao giải.","Không cung cấp OTP/mật khẩu hoặc thanh toán qua link lạ.","Nếu là quà từ người quen online, xác minh danh tính và đơn vị vận chuyển độc lập."],
    response:["Dừng chuyển thêm nếu phí tiếp tục tăng.","Liên hệ ngân hàng nếu đã chuyển tiền và nghi ngờ.","Lưu hội thoại, tài khoản nhận tiền và thông báo trúng thưởng.","Báo nền tảng/cơ quan chức năng khi có dấu hiệu chiếm đoạt."],
    psychology:"Phần thưởng khiến nạn nhân tập trung vào giá trị sắp nhận và coi phí là nhỏ so với lợi ích. Sau lần chuyển đầu, tâm lý muốn “không mất khoản đã đóng” dễ dẫn đến chuyển tiếp.",
    boundary:"Một số giải thưởng hợp pháp có nghĩa vụ thuế/phí theo quy định, nhưng thông tin phải có thể kiểm chứng độc lập với đơn vị tổ chức và quy trình pháp lý rõ ràng.",
    sources:[SOURCES.mps2026,SOURCES.mpsGuide],
    related:[["/kien-thuc/romance-scam-lua-dao-tinh-cam/","Romance scam và quà từ nước ngoài"],["/kien-thuc/dat-coc-mua-hang-online-lua-dao/","Đặt cọc mua hàng online"],["/cong-cu/kiem-tra-truoc-khi-chuyen-tien/","Checklist trước khi chuyển tiền"]],
  },
  {
    slug:"romance-scam-lua-dao-tinh-cam",
    title:"Romance scam là gì? 9 dấu hiệu lừa tình qua mạng cần biết",
    description:"Romance scam là lừa đảo tình cảm qua Facebook, Zalo, app hẹn hò. Nhận biết 9 dấu hiệu: xây dựng tình cảm nhanh, quà từ nước ngoài, đầu tư và vay tiền.",
    h1:"Romance scam là gì? 9 dấu hiệu lừa tình qua mạng cần biết",
    breadcrumb:"Romance scam",
    eyebrow:"LỪA ĐẢO TÌNH CẢM · MẠNG XÃ HỘI",
    lead:"Romance scam là kịch bản tạo dựng quan hệ tình cảm hoặc lòng tin trong thời gian dài rồi chuyển sang yêu cầu tiền, đầu tư, nhận quà hoặc hỗ trợ tình huống khẩn cấp.",
    quick:"Đừng dùng mức độ thân thiết online làm bằng chứng danh tính. Khi xuất hiện yêu cầu tiền, đầu tư hoặc phí nhận quà, hãy xác minh con người và câu chuyện bằng nguồn độc lập.",
    contextTitle:"Romance scam thường phát triển theo nhiều giai đoạn",
    context:"Đối tượng có thể xây hồ sơ thành đạt, quân nhân, kỹ sư, doanh nhân hoặc người làm việc ở nước ngoài. Họ dành thời gian trò chuyện đều đặn để tạo cảm giác mối quan hệ thật trước khi đưa ra lý do tài chính.",
    context2:"Các vụ án gần đây cho thấy mô hình “app tình cảm” có thể được tổ chức quy mô lớn và kết hợp dụ đầu tư hoặc làm nhiệm vụ trên nền tảng giả.",
    signs:["Thể hiện tình cảm sâu rất nhanh dù chưa gặp trực tiếp.","Luôn có lý do tránh gặp hoặc gọi video rõ ràng.","Thông báo gửi quà/ngoại tệ nhưng cần đóng phí hải quan.","Rủ đầu tư vào nền tảng do họ giới thiệu.","Mượn tiền vì tình huống khẩn cấp ở nước ngoài.","Yêu cầu giữ bí mật với gia đình/bạn bè.","Ảnh hồ sơ quá hoàn hảo hoặc xuất hiện ở nhiều tên khác nhau.","Kể câu chuyện nghề nghiệp/địa điểm không nhất quán.","Sau khi chuyển một khoản, tiếp tục xuất hiện lý do cần thêm tiền."],
    verify:["Dùng tìm kiếm hình ảnh ngược với ảnh đại diện nếu có thể.","Xác minh danh tính qua nhiều kênh, không chỉ tài khoản chat.","Không đầu tư hoặc chuyển tiền dựa trên mối quan hệ chưa xác minh.","Nếu họ gửi quà, tự liên hệ đơn vị vận chuyển chính thức.","Trao đổi với người thân đáng tin cậy trước quyết định tài chính lớn."],
    response:["Dừng chuyển thêm tiền và không trả “phí lấy lại tiền”.","Lưu hồ sơ, hội thoại, tài khoản ngân hàng/crypto và URL nền tảng.","Liên hệ ngân hàng nếu vừa chuyển tiền.","Trình báo khi có dấu hiệu chiếm đoạt và báo tài khoản cho nền tảng."],
    psychology:"Kịch bản đầu tư nhiều thời gian vào cảm xúc, khiến nạn nhân coi cảnh báo từ bên ngoài là sự can thiệp vào mối quan hệ. Sự cô lập này làm giảm khả năng kiểm chứng.",
    boundary:"Không phải mối quan hệ online hay yêu xa đều là lừa đảo. Cảnh báo chỉ tăng khi có mâu thuẫn danh tính, né xác minh và đặc biệt là yêu cầu tài chính.",
    sources:[SOURCES.romance,SOURCES.mps2026],
    related:[["/kien-thuc/lua-dao-dau-tu-telegram-zalo/","Đầu tư qua Telegram/Zalo và nền tảng giả"],["/kien-thuc/trung-thuong-nhan-qua-dong-phi-lua-dao/","Quà tặng yêu cầu đóng phí"],["/cong-cu/kiem-tra-truoc-khi-chuyen-tien/","Checklist trước khi chuyển tiền"]],
  },
  {
    slug:"lua-dao-dau-tu-telegram-zalo",
    title:"Đầu tư qua Telegram, Zalo có lừa đảo không? Dấu hiệu cần dừng",
    description:"Nhận biết nhóm đầu tư Telegram, Zalo và app giao dịch giả: lợi nhuận ảo, chuyên gia dẫn lệnh, cho rút tiền ban đầu rồi khóa rút và yêu cầu nạp thêm.",
    h1:"Đầu tư qua Telegram, Zalo có lừa đảo không? Dấu hiệu cần dừng",
    breadcrumb:"Đầu tư Telegram, Zalo",
    eyebrow:"ĐẦU TƯ ONLINE · NHÓM CHAT",
    lead:"Nhóm chat đông người, ảnh lợi nhuận và việc rút được một khoản nhỏ ban đầu không chứng minh nền tảng đầu tư là hợp pháp hay tiền của bạn có thể rút tự do về sau.",
    quick:"Nếu nền tảng yêu cầu nạp thêm để mở khóa rút tiền, đóng thuế/phí vào tài khoản cá nhân hoặc chỉ hoạt động qua nhóm Telegram/Zalo, hãy dừng và xác minh pháp nhân, giấy phép và tên miền.",
    contextTitle:"Vì sao ban đầu vẫn có thể rút được tiền?",
    context:"Một số mô hình cho phép nạn nhân rút khoản nhỏ để tạo niềm tin. Khi số tiền nạp tăng, tài khoản có thể bị báo lỗi, khóa rút hoặc phát sinh “thuế”, “phí xác minh”, “ký quỹ” trước khi rút.",
    context2:"Nhóm chat còn có thể dùng nhiều tài khoản đóng vai thành viên đã có lãi để tạo bằng chứng xã hội giả.",
    signs:["Cam kết lợi nhuận cao hoặc tỷ lệ thắng gần như chắc chắn.","Chuyên gia/mentor thúc nạp tiền theo “cơ hội chỉ hôm nay”.","Chuyển tiền vào tài khoản cá nhân hoặc nhiều tài khoản thay đổi.","Lãi hiển thị trên app/web nhưng không thể rút tự do.","Yêu cầu nạp thêm để rút khoản đang có.","Nhóm chat xóa người đặt câu hỏi hoặc cấm kiểm chứng bên ngoài.","Không xác minh được pháp nhân, giấy phép, địa chỉ vận hành."],
    verify:["Kiểm tra pháp nhân và giấy phép trên nguồn quản lý phù hợp với loại hình đầu tư.","Tra cứu domain, lịch sử và thông tin doanh nghiệp độc lập.","Không coi ảnh lợi nhuận trong nhóm là bằng chứng.","Thử hiểu cơ chế rút tiền và phí từ tài liệu chính thức trước khi nạp.","Không vay tiền hoặc chuyển thêm để “cứu” tài khoản đang bị khóa."],
    response:["Dừng nạp thêm ngay khi việc rút tiền phụ thuộc vào khoản nạp mới.","Lưu URL, tài khoản, nhóm chat, lịch sử nạp/rút và nội dung tư vấn.","Liên hệ ngân hàng nếu giao dịch vừa xảy ra.","Cảnh giác với người tự xưng hỗ trợ thu hồi tiền và yêu cầu phí trước."],
    psychology:"Lợi nhuận ban đầu và nhóm đông người tạo cảm giác cơ hội đã được nhiều người xác nhận. Khi tài khoản hiển thị số dư lớn, nạn nhân dễ bỏ thêm tiền để cố rút.",
    boundary:"Đầu tư hợp pháp vẫn có rủi ro thua lỗ; cảnh báo ở đây tập trung vào dấu hiệu gian dối, không minh bạch pháp nhân và yêu cầu nạp thêm để rút tiền.",
    sources:[SOURCES.mps2026,SOURCES.mpsGuide],
    related:[["/kien-thuc/lua-dao-dau-tu-online/","Lừa đảo đầu tư online: sàn giả và lợi nhuận ảo"],["/kien-thuc/romance-scam-lua-dao-tinh-cam/","Romance scam kết hợp đầu tư"],["/cong-cu/kiem-tra-truoc-khi-chuyen-tien/","Checklist trước khi chuyển tiền"]],
  },
  {
    slug:"bat-coc-online",
    title:"Bắt cóc online là gì? Phụ huynh, học sinh cần làm gì ngay",
    description:"Bắt cóc online thực chất là thủ đoạn tống tiền trực tuyến, thường giả danh công an để cô lập nạn nhân. Dấu hiệu, cách xử lý cho học sinh, sinh viên và gia đình.",
    h1:"Bắt cóc online là gì? Phụ huynh, học sinh cần làm gì ngay",
    breadcrumb:"Bắt cóc online",
    eyebrow:"TỐNG TIỀN TRỰC TUYẾN · HỌC SINH SINH VIÊN",
    lead:"“Bắt cóc online” thường không phải một vụ bắt cóc vật lý theo nghĩa truyền thống; nạn nhân bị thao túng tâm lý, cô lập khỏi gia đình và buộc làm theo hướng dẫn qua điện thoại/video.",
    quick:"Nếu người tự xưng Công an/Tòa án yêu cầu giữ bí mật, rời khỏi nơi ở, thuê phòng, bật video liên tục hoặc chuyển tiền để chứng minh vô tội, hãy ngắt liên lạc và gọi người thân/Công an địa phương.",
    contextTitle:"Kịch bản cô lập nạn nhân diễn ra như thế nào?",
    context:"Đối tượng thường thông báo nạn nhân liên quan vụ án, rửa tiền hoặc ma túy. Sau đó họ yêu cầu chuyển sang ứng dụng gọi video, giữ bí mật với gia đình và di chuyển đến nơi riêng tư.",
    context2:"Khi nạn nhân đã bị cô lập, nhóm lừa đảo có thể liên hệ gia đình, dựng câu chuyện bắt cóc và yêu cầu chuyển tiền. Bộ Công an đã ghi nhận nhiều vụ nhắm vào học sinh, sinh viên.",
    signs:["Tự xưng cơ quan tố tụng nhưng “làm việc” hoàn toàn qua điện thoại/video.","Yêu cầu giữ bí mật, không gọi gia đình/nhà trường.","Buộc nạn nhân rời nhà, thuê khách sạn/phòng riêng.","Yêu cầu bật camera liên tục hoặc gửi hình ảnh bị trói/đe dọa.","Đòi chuyển tiền để chứng minh vô tội hoặc bảo đảm an toàn.","Gia đình nhận cuộc gọi đòi tiền trong khi không liên lạc được với con."],
    verify:["Cơ quan chức năng không giải quyết vụ án bằng cách yêu cầu chuyển tiền qua điện thoại.","Ngắt liên lạc và gọi người thân/nhà trường/Công an địa phương.","Nếu gia đình mất liên lạc với con, trình báo ngay thay vì tự thương lượng với người đòi tiền.","Chia sẻ trước với học sinh/sinh viên quy tắc: không cô lập bản thân theo lệnh người lạ.","Dùng câu hỏi bí mật gia đình nếu xuất hiện yêu cầu chuyển tiền khẩn."],
    response:["Nếu nạn nhân đang bị điều khiển qua video, ưu tiên tìm vị trí an toàn và liên hệ người thân/Công an.","Gia đình lưu số gọi đến, tin nhắn, tài khoản nhận tiền nhưng không làm theo yêu cầu chuyển tiền chưa xác minh.","Thông báo nhà trường/ký túc xá nếu nạn nhân là học sinh, sinh viên.","Sau sự cố, thay đổi thông tin tài khoản đã lộ và hỗ trợ nạn nhân ổn định tâm lý."],
    psychology:"Đối tượng sử dụng quyền lực giả, đe dọa pháp lý và cô lập nạn nhân để cắt đứt nguồn kiểm chứng. Khi nạn nhân sợ hãi, họ có thể tự làm các hành động khiến gia đình tin rằng đang bị bắt cóc.",
    boundary:"Tên gọi “bắt cóc online” dễ gây hiểu nhầm; Bộ Công an cũng lưu ý bản chất thường là lừa đảo/tống tiền trực tuyến bằng thao túng tâm lý.",
    sources:[SOURCES.kidnapping,SOURCES.kidnapping2026],
    related:[["/kien-thuc/gia-mao-cong-an-co-quan-nha-nuoc/","Giả mạo Công an, cơ quan nhà nước"],["/cong-cu/kiem-tra-cuoc-goi-la/","Kiểm tra cuộc gọi tự xưng cơ quan chức năng"],["/cong-cu/xu-ly-khi-bi-lua/","Wizard xử lý sự cố"]],
  },
  {
    slug:"ai-ghep-anh-video-tong-tien",
    title:"AI ghép ảnh, video để tống tiền: Cách xử lý khi bị đe dọa",
    description:"Bị gửi ảnh/video nhạy cảm do AI hoặc deepfake cắt ghép và yêu cầu chuyển tiền? Cách giữ bằng chứng, khóa quyền riêng tư, không trả tiền và trình báo.",
    h1:"AI ghép ảnh, video để tống tiền: cách xử lý khi bị đe dọa",
    breadcrumb:"AI/deepfake tống tiền",
    eyebrow:"AI DEEPFAKE · CƯỠNG ĐOẠT",
    lead:"Kẻ xấu có thể lấy ảnh công khai của nạn nhân rồi cắt ghép hoặc dùng AI tạo nội dung nhạy cảm để đe dọa phát tán, gây áp lực chuyển tiền.",
    quick:"Không chuyển tiền để mua sự im lặng. Lưu bằng chứng, hạn chế tương tác, khóa quyền riêng tư tài khoản và liên hệ cơ quan Công an khi bị đe dọa/cưỡng đoạt.",
    contextTitle:"Thủ đoạn hiện nay được thực hiện ra sao?",
    context:"Đối tượng thu thập ảnh chân dung và dữ liệu cá nhân công khai, sau đó tạo ảnh/video nhạy cảm giả. Tin nhắn thường kèm thời hạn, đe dọa gửi cho đồng nghiệp, gia đình hoặc đăng mạng xã hội.",
    context2:"Bộ Công an đã cảnh báo sự quay trở lại của thủ đoạn này trong năm 2026 và khuyến nghị không chuyển tiền theo yêu cầu của đối tượng.",
    signs:["Gửi ảnh/video nhạy cảm bất ngờ từ số/tài khoản lạ.","Đe dọa phát tán tới cơ quan, gia đình hoặc mạng xã hội.","Yêu cầu thanh toán bằng chuyển khoản hoặc tài sản số.","Nội dung có lỗi hình ảnh, chuyển động hoặc bối cảnh không khớp.","Đối tượng biết dữ liệu cá nhân lấy từ hồ sơ công khai.","Sau khi trả tiền tiếp tục đòi thêm."],
    verify:["Không cần chứng minh nội dung giả trước khi từ chối trả tiền.","Chụp/lưu tin nhắn, tài khoản, địa chỉ ví và file gốc nếu an toàn.","Kiểm tra phạm vi thông tin công khai trên mạng xã hội và siết quyền riêng tư.","Thông báo người thân/cơ quan đáng tin cậy nếu cần để giảm sức ép tâm lý.","Trình báo cơ quan chức năng khi có đe dọa/cưỡng đoạt."],
    response:["Không chuyển tiền hoặc thương lượng kéo dài.","Không xóa hội thoại trước khi sao lưu bằng chứng.","Đổi mật khẩu và bật MFA nếu đối tượng có dấu hiệu truy cập tài khoản.","Nếu nội dung bị đăng tải, dùng cơ chế báo cáo của nền tảng song song với trình báo."],
    psychology:"Tội phạm khai thác nỗi sợ mất danh dự và xu hướng muốn giải quyết bí mật. Càng cô lập, nạn nhân càng dễ trả tiền để tránh người khác biết.",
    boundary:"Nội dung có thể là giả hoàn toàn, cắt ghép hoặc lấy từ nguồn khác; xử lý an toàn không phụ thuộc việc bạn tự xác định chính xác kỹ thuật tạo nội dung.",
    sources:[SOURCES.extortion,SOURCES.mps2026],
    related:[["/kien-thuc/deepfake-gia-giong-nguoi-than/","Deepfake giả giọng người thân"],["/kien-thuc/bao-cao-lua-dao-truc-tuyen/","Báo cáo lừa đảo trực tuyến"],["/cong-cu/xu-ly-khi-bi-lua/","Wizard xử lý sự cố"]],
  },
  {
    slug:"gia-mao-lanh-dao-yeu-cau-chuyen-tien-bec",
    title:"Giả mạo lãnh đạo yêu cầu chuyển tiền: BEC/CEO Fraud là gì?",
    description:"BEC/CEO Fraud là giả mạo lãnh đạo hoặc đối tác để yêu cầu kế toán chuyển tiền. Dấu hiệu email/chat giả, thay đổi tài khoản và quy trình xác minh hai kênh.",
    h1:"Giả mạo lãnh đạo yêu cầu chuyển tiền: BEC/CEO Fraud là gì?",
    breadcrumb:"BEC/CEO Fraud",
    eyebrow:"DOANH NGHIỆP · GIẢ MẠO LÃNH ĐẠO",
    lead:"Business Email Compromise (BEC) và CEO Fraud lợi dụng danh tính lãnh đạo, đối tác hoặc nhà cung cấp để khiến nhân viên thực hiện giao dịch tưởng là công việc hợp lệ.",
    quick:"Mọi yêu cầu thay đổi tài khoản nhận tiền hoặc chuyển khoản khẩn từ lãnh đạo/đối tác cần được xác minh qua kênh thứ hai đã biết từ trước, đặc biệt khi email/chat yêu cầu bỏ qua quy trình.",
    contextTitle:"Kịch bản giả mạo trong doanh nghiệp",
    context:"Đối tượng có thể giả địa chỉ email gần giống, chiếm tài khoản thật hoặc nhắn qua ứng dụng chat. Nội dung thường nhấn mạnh tính bí mật, khẩn cấp và quyền hạn của người yêu cầu.",
    context2:"AI/deepfake còn có thể được dùng để tăng độ thuyết phục bằng giọng nói hoặc hình ảnh giả, nhưng kiểm soát quy trình vẫn là lớp phòng vệ quan trọng.",
    signs:["Địa chỉ email khác một ký tự hoặc dùng domain gần giống.","Yêu cầu thay đổi tài khoản ngân hàng của nhà cung cấp ngay trước kỳ thanh toán.","Lãnh đạo yêu cầu chuyển gấp và bỏ qua phê duyệt bình thường.","Yêu cầu giữ bí mật vì thương vụ nhạy cảm.","Ngôn ngữ/phong cách viết khác thường hoặc gửi ngoài giờ.","Cuộc gọi/video xác nhận ngắn, chất lượng kém và tránh câu hỏi bất ngờ."],
    verify:["Xác minh yêu cầu qua số điện thoại/kênh nội bộ đã lưu từ trước.","Áp dụng callback với nhà cung cấp khi thay đổi tài khoản nhận.","Tách người tạo lệnh và người phê duyệt giao dịch giá trị cao.","Kiểm tra đầy đủ domain người gửi, Reply-To và chuỗi email.","Dùng từ khóa/câu hỏi nội bộ cho tình huống chuyển tiền khẩn."],
    response:["Nếu đã chuyển, gọi ngân hàng ngay để báo gian lận và yêu cầu hỗ trợ.","Bảo toàn email gốc/header, log chat, số điện thoại và chứng từ.","Khóa/đổi mật khẩu tài khoản doanh nghiệp có dấu hiệu bị chiếm.","Kích hoạt quy trình ứng phó sự cố và thông báo bộ phận ATTT/pháp chế."],
    psychology:"Kịch bản tận dụng thẩm quyền lãnh đạo, áp lực thời gian và tâm lý không muốn làm chậm công việc. Nhân viên có thể ưu tiên tuân lệnh thay vì xác minh.",
    boundary:"Email khẩn hoặc thay đổi tài khoản có thể hợp lệ; mục tiêu là buộc mọi thay đổi nhạy cảm đi qua một kênh xác minh độc lập thay vì đánh giá bằng cảm tính.",
    sources:[SOURCES.mps2026,SOURCES.mpsGuide],
    related:[["/kien-thuc/deepfake-gia-giong-nguoi-than/","Deepfake và xác minh giọng nói/video"],["/cong-cu/kiem-tra-truoc-khi-chuyen-tien/","Checklist trước khi chuyển tiền"],["/kien-thuc/an-toan-thong-tin-ca-nhan/","Bảo vệ tài khoản và dữ liệu"]],
  },
];

for (const article of articles) {
  await write(`kien-thuc/${article.slug}/index.html`, articlePage(article));
}

const existingUpdates = [
  {
    slug:"lua-dao-tien-dien-gia-mao-evn",
    title:"Điện lực gọi báo nợ tiền điện có phải lừa đảo không?",
    description:"Điện lực gọi báo nợ hoặc dọa cắt điện có phải lừa đảo? Cách xác minh hóa đơn EVN, app, QR và tài khoản nhận trước khi cài ứng dụng hoặc chuyển tiền.",
    h1:"Điện lực gọi báo nợ tiền điện có phải lừa đảo không?",
    quick:"EVN có cảnh báo giả mạo thông báo nợ tiền điện và ứng dụng chăm sóc khách hàng. Hãy kiểm tra hóa đơn qua app/website/tổng đài điện lực chính thức; không chuyển tiền vào tài khoản cá nhân chỉ vì bị dọa cắt điện.",
    source:SOURCES.evn,
  },
  {
    slug:"lua-dao-bao-hiem-xa-hoi-vssid",
    title:"BHXH gọi yêu cầu cập nhật VssID có phải lừa đảo không?",
    description:"BHXH gọi cập nhật VssID, đồng bộ CCCD hoặc nhận quyền lợi có phải lừa đảo? Cách kiểm tra website, app, QR và kênh BHXH chính thức trước khi cung cấp dữ liệu.",
    h1:"BHXH gọi yêu cầu cập nhật VssID có phải lừa đảo không?",
    quick:"BHXH Việt Nam đã cảnh báo website giả mạo. Không cung cấp OTP, mật khẩu hoặc cài app theo cuộc gọi; tự mở VssID/Cổng dịch vụ công BHXH bằng kênh chính thức để kiểm tra.",
    source:SOURCES.bhxh,
  },
  {
    slug:"lua-dao-tuyen-dung-online",
    title:"Tuyển dụng yêu cầu đóng phí có lừa đảo không? Cách kiểm tra",
    description:"Nhà tuyển dụng yêu cầu phí hồ sơ, đồng phục, đào tạo hoặc đặt cọc có đáng tin? Cách xác minh công ty, domain, tài khoản nhận và việc làm trước khi chuyển tiền.",
    h1:"Tuyển dụng yêu cầu đóng phí có lừa đảo không? Cách kiểm tra",
    quick:"Không phải mọi khoản phí đều chứng minh lừa đảo, nhưng tuyển dụng online yêu cầu chuyển tiền trước là tín hiệu cần xác minh mạnh. Kiểm tra pháp nhân, website, email công ty và người tuyển dụng bằng kênh độc lập.",
    source:SOURCES.recruitment,
  },
  {
    slug:"lua-dao-dau-tu-online",
    title:"Lừa đảo đầu tư online: Vì sao ban đầu vẫn có thể rút tiền?",
    description:"Lừa đảo đầu tư online có thể cho rút tiền nhỏ ban đầu rồi khóa rút khi số tiền tăng. Dấu hiệu sàn giả, lợi nhuận ảo, phí mở khóa và yêu cầu nạp thêm.",
    h1:"Lừa đảo đầu tư online: vì sao ban đầu vẫn có thể rút tiền?",
    quick:"Việc rút được khoản nhỏ ban đầu không chứng minh nền tảng an toàn. Hãy kiểm tra pháp nhân/giấy phép và dừng ngay khi việc rút tiền phụ thuộc vào nạp thêm, đóng thuế hoặc phí mở khóa.",
    source:SOURCES.mps2026,
  },
];

function updateExisting(html, u) {
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${u.title}</title>`);
  html = html.replace(/<meta name="description" content="[^"]*"/i, `<meta name="description" content="${u.description}"`);
  html = html.replace(/<h1>[\s\S]*?<\/h1>/i, `<h1>${u.h1}</h1>`);
  html = html.replace(/<meta property="og:title" content="[^"]*"/i, `<meta property="og:title" content="${u.title}"`);
  html = html.replace(/<meta property="og:description" content="[^"]*"/i, `<meta property="og:description" content="${u.description}"`);
  html = html.replace(/<meta name="twitter:title" content="[^"]*"/i, `<meta name="twitter:title" content="${u.title}"`);
  html = html.replace(/<meta name="twitter:description" content="[^"]*"/i, `<meta name="twitter:description" content="${u.description}"`);
  const box = `<section class="seo-answer-box" aria-label="Trả lời nhanh"><strong>Trả lời nhanh</strong><p>${u.quick}</p></section>`;
  if (/<section class="seo-answer-box"[\s\S]*?<\/section>/i.test(html)) html = html.replace(/<section class="seo-answer-box"[\s\S]*?<\/section>/i, box);
  else {
    const lead = html.match(/<p class="lead">[\s\S]*?<\/p>/i)?.[0];
    if (lead) html = html.replace(lead, `${lead}${box}`);
  }
  if (!html.includes(u.source[0])) {
    html = html.replace(/<section class="seo-related">/i, `<section class="seo-note"><strong>Nguồn cập nhật</strong><p><a href="${u.source[0]}" target="_blank" rel="noopener noreferrer">${u.source[1]}</a>.</p></section><section class="seo-related">`);
  }
  return html;
}
for (const u of existingUpdates) {
  const rel = `kien-thuc/${u.slug}/index.html`;
  if (await exists(path.join(PUBLIC, rel))) await write(rel, updateExisting(await read(rel), u));
}

function simpleSchema({ type="WebPage", canonical, name, description }) {
  return JSON.stringify({
    "@context":"https://schema.org",
    "@graph":[
      { "@type":type, "@id":`${canonical}#page`, url:canonical, name, description, inLanguage:"vi-VN", dateModified:UPDATED, isPartOf:{ "@id":`${SITE}/#website` } },
      { "@type":"Organization", "@id":`${SITE}/#organization`, name:"Cảnh Giác Số", url:`${SITE}/`, logo:{ "@type":"ImageObject", url:`${SITE}/search-logo.svg`, width:800, height:800 } },
      { "@type":"BreadcrumbList", itemListElement:[{ "@type":"ListItem", position:1, name:"Cảnh Giác Số", item:`${SITE}/` },{ "@type":"ListItem", position:2, name, item:canonical }] },
    ],
  });
}

function standardHead({ title, description, canonical, schema }) {
  return `<head>
  ${CSP_META}
  ${THEME}
  <meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><meta name="referrer" content="strict-origin-when-cross-origin" />
  <title>${esc(title)}</title><meta name="description" content="${esc(description)}" /><meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" />
  <link rel="canonical" href="${canonical}" /><link rel="alternate" hreflang="vi-VN" href="${canonical}" /><link rel="alternate" hreflang="x-default" href="${canonical}" />
  <link rel="stylesheet" href="/seo.css" /><link rel="icon" type="image/png" href="/khien-so-logo.png" /><link rel="apple-touch-icon" href="/khien-so-logo.png" />
  <meta property="og:type" content="website" /><meta property="og:locale" content="vi_VN" /><meta property="og:site_name" content="Cảnh Giác Số" /><meta property="og:title" content="${esc(title)}" /><meta property="og:description" content="${esc(description)}" /><meta property="og:url" content="${canonical}" /><meta property="og:image" content="${SITE}/og.png" />
  <meta name="twitter:card" content="summary_large_image" /><meta name="twitter:title" content="${esc(title)}" /><meta name="twitter:description" content="${esc(description)}" /><meta name="twitter:image" content="${SITE}/og.png" />
  <script type="application/ld+json">${schema}</script>
</head>`;
}

const alertsCanonical = `${SITE}/canh-bao-lua-dao-hom-nay/`;
const alertsTitle = "Cảnh báo lừa đảo hôm nay: thủ đoạn mới cần chú ý";
const alertsDesc = "Cảnh báo lừa đảo trực tuyến đang đáng chú ý tại Việt Nam, cập nhật theo nguồn Bộ Công an, EVN và cơ quan chính thức; kèm hướng dẫn xác minh an toàn.";
const alerts = [
  ["08/09/2026","25 kịch bản lừa đảo năm 2026","Bộ Công an nhóm các thủ đoạn phổ biến thành 5 nhóm lớn: mạo danh tổ chức, AI/deepfake, đầu tư–việc làm, mua bán online và chiếm quyền thiết bị.",SOURCES.mps2026[0],"/kien-thuc/25-kich-ban-lua-dao-2026/"],
  ["09/09/2026","Tin nhắn phạt nguội kèm link giả","Bộ Công an cảnh báo tin nhắn giả danh CSGT dẫn người dùng tới website giả nhằm đánh cắp thông tin và tài sản.","https://bocongan.gov.vn/bai-viet/canh-bao-thu-doan-gia-danh-co-quan-cong-an-gui-tin-nhan-phat-nguoi-kem-duong-link-gia-mao-de-lua-dao-chiem-doat-tai-san-1788945012","/kien-thuc/lua-dao-phat-nguoi-qua-sms/"],
  ["07/09/2026","AI/deepfake cắt ghép ảnh nhạy cảm để tống tiền","Đối tượng thu thập ảnh công khai, cắt ghép nội dung nhạy cảm rồi đe dọa phát tán nếu nạn nhân không chuyển tiền.",SOURCES.extortion[0],"/kien-thuc/ai-ghep-anh-video-tong-tien/"],
  ["04/09/2026","Giả mạo điện lực, báo nợ và yêu cầu cài app","EVN tiếp tục cảnh báo việc mạo danh thông báo nợ, website và ứng dụng chăm sóc khách hàng giả.",SOURCES.evn[0],"/kien-thuc/lua-dao-tien-dien-gia-mao-evn/"],
  ["29/08/2026","Tuyển dụng việc làm hấp dẫn và nguy cơ mua bán người","Bộ Công an cảnh báo lời mời lương cao, thủ tục đơn giản, yêu cầu cọc hoặc đưa người ra nước ngoài theo con đường không chính thống.",SOURCES.recruitment[0],"/kien-thuc/lua-dao-tuyen-dung-online/"],
  ["15/07/2026","Bắt cóc online nhắm vào sinh viên","Công an ghi nhận các vụ giả danh điều tra, cô lập nạn nhân rồi yêu cầu gia đình chuyển tiền.",SOURCES.kidnapping2026[0],"/kien-thuc/bat-coc-online/"],
];
const alertsHtml = alerts.map((a)=>`<article class="alert-item"><time>${a[0]}</time><h2>${a[1]}</h2><p>${a[2]}</p><p><a href="${a[4]}">Hướng dẫn xử lý trên Cảnh Giác Số</a> · <a href="${a[3]}" target="_blank" rel="noopener noreferrer">Nguồn chính thức</a></p></article>`).join("");
await write("canh-bao-lua-dao-hom-nay/index.html", `<!doctype html><html lang="vi-VN">${standardHead({title:alertsTitle,description:alertsDesc,canonical:alertsCanonical,schema:simpleSchema({canonical:alertsCanonical,name:alertsTitle,description:alertsDesc})})}<body>${header("alerts")}<main class="seo-article"><div class="seo-breadcrumb"><a href="/">Cảnh Giác Số</a> › Cảnh báo lừa đảo hôm nay</div><span class="seo-eyebrow">CẬP NHẬT THEO NGUỒN CHÍNH THỨC</span><h1>Cảnh báo lừa đảo hôm nay</h1><p class="lead">Trang tổng hợp các cảnh báo đáng chú ý đang được cơ quan chính thức công bố. Mỗi cảnh báo được nối với một hướng dẫn thực hành để bạn biết cách xác minh trước khi chuyển tiền, cài ứng dụng hoặc cung cấp dữ liệu.</p><div class="seo-meta">Cập nhật nội dung: <time datetime="${UPDATED}">${UPDATED_LABEL}</time></div><section class="seo-note"><strong>Nguyên tắc sử dụng</strong><p>Danh sách này không phải “blacklist” cá nhân hay số điện thoại. Cảnh báo tập trung vào kịch bản, hành động rủi ro và nguồn kiểm chứng.</p></section><div class="alert-stream">${alertsHtml}</div><section class="seo-related"><h2>Kiểm tra ngay nếu bạn đang gặp tình huống đáng ngờ</h2><ul><li><a href="/cong-cu/kiem-tra-cuoc-goi-la/">Cuộc gọi lạ</a></li><li><a href="/cong-cu/kiem-tra-tin-nhan-dang-ngo/">Tin nhắn đáng ngờ</a></li><li><a href="/cong-cu/xu-ly-khi-bi-lua/">Đã làm theo hoặc đã chuyển tiền</a></li></ul></section></main>${FOOTER}</body></html>`);

const questionCanonical = `${SITE}/co-phai-lua-dao-khong/`;
const questionTitle = "Có phải lừa đảo không? Kiểm tra theo tình huống thực tế";
const questionDesc = "Nhận cuộc gọi, SMS, link, yêu cầu chuyển tiền hoặc đóng phí và tự hỏi có phải lừa đảo không? Chọn tình huống để xem dấu hiệu và cách xác minh an toàn.";
const questionCards = [
  ["/kien-thuc/cuoc-goi-im-lang-lua-dao/","Cuộc gọi im lặng có phải lừa đảo không?","Cuộc gọi không ai nói, gọi lặp lại hoặc chuyển sang kịch bản mạo danh."],
  ["/kien-thuc/lua-dao-tien-dien-gia-mao-evn/","Điện lực gọi báo nợ có phải lừa đảo không?","Xác minh hóa đơn và kênh EVN trước khi chuyển tiền/cài app."],
  ["/kien-thuc/lua-dao-bao-hiem-xa-hoi-vssid/","BHXH gọi cập nhật VssID có phải lừa đảo không?","Kiểm tra website, app và lý do cập nhật dữ liệu."],
  ["/kien-thuc/lua-dao-khoa-sim-chuan-hoa-thue-bao/","Tin nhắn khóa SIM có phải lừa đảo không?","Kiểm tra nhà mạng trước khi làm theo link hoặc mã lệnh."],
  ["/kien-thuc/nguoi-mua-gui-link-nhan-tien-lua-dao/","Người mua gửi link nhận tiền có phải lừa đảo không?","Bảo vệ người bán khỏi trang thanh toán và biên lai giả."],
  ["/kien-thuc/trung-thuong-nhan-qua-dong-phi-lua-dao/","Nhận quà nhưng phải đóng phí có phải lừa đảo không?","Kiểm tra chương trình, đơn vị vận chuyển và khoản phí."],
  ["/kien-thuc/lua-dao-tuyen-dung-online/","Tuyển dụng yêu cầu đóng phí có phải lừa đảo không?","Xác minh công ty, email, pháp nhân và tài khoản nhận."],
  ["/kien-thuc/lua-dao-dau-tu-telegram-zalo/","Đầu tư Telegram/Zalo có phải lừa đảo không?","Nhận diện sàn giả, lợi nhuận ảo và khóa rút tiền."],
];
await write("co-phai-lua-dao-khong/index.html", `<!doctype html><html lang="vi-VN">${standardHead({title:questionTitle,description:questionDesc,canonical:questionCanonical,schema:simpleSchema({canonical:questionCanonical,name:questionTitle,description:questionDesc})})}<body>${header()}<main class="seo-article"><div class="seo-breadcrumb"><a href="/">Cảnh Giác Số</a> › Có phải lừa đảo không?</div><span class="seo-eyebrow">TÌNH HUỐNG → CÁCH XÁC MINH</span><h1>Có phải lừa đảo không? Chọn đúng tình huống bạn đang gặp</h1><p class="lead">Bạn không cần chứng minh chắc chắn đối tượng là kẻ lừa đảo trước khi dừng giao dịch. Chỉ cần có dấu hiệu bất thường là đủ để chuyển sang xác minh qua kênh độc lập.</p><div class="growth-grid">${questionCards.map((x)=>`<a class="growth-card" href="${x[0]}"><strong>${x[1]}</strong><span>${x[2]}</span></a>`).join("")}</div><section class="seo-note"><strong>Không thấy tình huống phù hợp?</strong><p><a href="/cong-cu/kiem-tra-cuoc-goi-la/">Dùng công cụ kiểm tra tình huống</a> hoặc xem <a href="/kien-thuc/">toàn bộ cẩm nang chống lừa đảo</a>.</p></section></main>${FOOTER}</body></html>`);

const dictCanonical = `${SITE}/tu-dien-lua-dao/`;
const dictTitle = "Từ điển lừa đảo: Phishing, smishing, vishing, BEC, deepfake";
const dictDesc = "Từ điển thuật ngữ chống lừa đảo: phishing, smishing, vishing, quishing, spoofing, social engineering, romance scam, BEC, SIM swapping, RAT và infostealer.";
const terms = [
 ["Phishing","Giả mạo nguồn đáng tin để dụ nạn nhân bấm link, đăng nhập trang giả, cung cấp dữ liệu hoặc cài phần mềm.","/kien-thuc/phishing-la-gi/"],
 ["Smishing","Phishing qua SMS/tin nhắn, thường gắn link và tạo áp lực xử lý tài khoản, phạt, giao hàng hoặc hoàn tiền.","/cong-cu/kiem-tra-tin-nhan-dang-ngo/"],
 ["Vishing","Lừa đảo qua cuộc gọi thoại, trong đó đối tượng mạo danh tổ chức/người quen để yêu cầu thông tin hoặc tiền.","/cong-cu/kiem-tra-cuoc-goi-la/"],
 ["Quishing","Phishing dùng mã QR để che đường dẫn đích và dẫn nạn nhân tới trang giả hoặc luồng thanh toán nguy hiểm.","/kien-thuc/lua-dao-ma-qr/"],
 ["Pharming","Điều hướng người dùng tới website giả dù họ tưởng đang truy cập địa chỉ hợp lệ, thường liên quan thao túng DNS/thiết bị.","/kien-thuc/kiem-tra-link-gia-mao/"],
 ["Spoofing","Giả mạo thông tin hiển thị như số gọi đến, email, domain hoặc danh tính người gửi để tăng độ tin cậy.","/kien-thuc/kiem-tra-so-dien-thoai-lua-dao/"],
 ["Social engineering","Kỹ thuật thao túng tâm lý khiến con người tự thực hiện hành động có hại thay vì tấn công thuần kỹ thuật.","/kien-thuc/nhan-dien-lua-dao-truc-tuyen/"],
 ["Romance scam","Lừa đảo xây dựng quan hệ tình cảm/lòng tin rồi chuyển sang yêu cầu tiền, đầu tư hoặc phí nhận quà.","/kien-thuc/romance-scam-lua-dao-tinh-cam/"],
 ["Pig butchering","Mô hình nuôi dưỡng niềm tin trong thời gian dài rồi dụ đầu tư hoặc chuyển tiền ngày càng lớn vào nền tảng giả.","/kien-thuc/lua-dao-dau-tu-telegram-zalo/"],
 ["BEC / CEO Fraud","Giả mạo email/danh tính lãnh đạo hoặc đối tác để thay đổi tài khoản thanh toán hay yêu cầu chuyển tiền.","/kien-thuc/gia-mao-lanh-dao-yeu-cau-chuyen-tien-bec/"],
 ["SIM swapping","Chiếm quyền số điện thoại/SIM để nhận OTP hoặc khôi phục tài khoản; có thể kết hợp social engineering với nhà mạng.","/kien-thuc/lua-dao-khoa-sim-chuan-hoa-thue-bao/"],
 ["Credential stuffing","Dùng cặp email/mật khẩu đã lộ ở dịch vụ khác để thử đăng nhập hàng loạt nơi, đặc biệt nguy hiểm khi dùng lại mật khẩu.","/kien-thuc/an-toan-thong-tin-ca-nhan/"],
 ["RAT / remote access","Phần mềm cho phép điều khiển thiết bị từ xa; hợp pháp trong hỗ trợ kỹ thuật nhưng có thể bị lạm dụng khi cấp cho người lạ.","/kien-thuc/app-dieu-khien-dien-thoai-tu-xa/"],
 ["Infostealer","Mã độc chuyên thu thập dữ liệu như cookie, mật khẩu, ví số hoặc thông tin trình duyệt để phục vụ chiếm tài khoản.","/kien-thuc/an-toan-thong-tin-ca-nhan/"],
 ["Deepfake / DeepVoice","Nội dung hình ảnh, video hoặc giọng nói tổng hợp/chỉnh sửa bằng AI để mạo danh hoặc tống tiền.","/kien-thuc/deepfake-gia-giong-nguoi-than/"],
];
await write("tu-dien-lua-dao/index.html", `<!doctype html><html lang="vi-VN">${standardHead({title:dictTitle,description:dictDesc,canonical:dictCanonical,schema:simpleSchema({canonical:dictCanonical,name:dictTitle,description:dictDesc})})}<body>${header()}<main class="seo-article"><div class="seo-breadcrumb"><a href="/">Cảnh Giác Số</a> › Từ điển lừa đảo</div><span class="seo-eyebrow">SCAM DICTIONARY</span><h1>Từ điển lừa đảo & thuật ngữ an toàn số</h1><p class="lead">Giải thích ngắn gọn các thuật ngữ thường gặp trong phishing, social engineering, chiếm tài khoản và lừa đảo tài chính; mỗi mục dẫn tới hướng dẫn thực hành liên quan.</p><div class="scam-dictionary-grid">${terms.map((t)=>`<article id="${t[0].toLowerCase().replace(/[^a-z0-9]+/g,"-")}"><h2>${t[0]}</h2><p>${t[1]}</p><a href="${t[2]}">Xem hướng dẫn liên quan</a></article>`).join("")}</div><section><h2>Cách dùng từ điển này</h2><p>Thuật ngữ giúp bạn gọi tên kỹ thuật, nhưng khi xử lý một tình huống thật hãy ưu tiên hành động: dừng, kiểm tra danh tính, xác minh bằng kênh độc lập và báo cáo khi cần. Một kịch bản có thể kết hợp nhiều kỹ thuật cùng lúc.</p></section></main>${FOOTER}</body></html>`);

function resultBox() {
  return '<div class="scam-tool-result" data-tool-result hidden><span class="scam-result-level" data-result-level>Kết quả</span><p data-result-summary></p><ul data-result-list></ul></div>';
}
function toolPage({ slug,title,description,h1,lead,tool,content }) {
  const canonical = `${SITE}/cong-cu/${slug}/`;
  const schema = simpleSchema({type:"WebApplication",canonical,name:h1,description});
  return `<!doctype html><html lang="vi-VN">${standardHead({title,description,canonical,schema})}<body>${header("tools")}<main class="seo-article"><div class="seo-breadcrumb"><a href="/">Cảnh Giác Số</a> › <a href="/cong-cu/">Công cụ</a> › ${h1}</div><span class="seo-eyebrow">CÔNG CỤ KIỂM CHỨNG</span><h1>${h1}</h1><p class="lead">${lead}</p><section class="seo-note"><strong>Quyền riêng tư</strong><p>Công cụ chạy trên trình duyệt. Nội dung bạn nhập vào công cụ không được gửi lên server bởi mã công cụ này. Kết quả là checklist rủi ro, không phải kết luận pháp lý.</p></section>${tool}${content}<section class="seo-related"><h2>Nguyên tắc chung</h2><p>Dừng — Kiểm tra — Xác minh độc lập — Báo cáo. Không cần chứng minh chắc chắn người kia là kẻ lừa đảo trước khi từ chối một giao dịch đáng ngờ.</p></section></main>${FOOTER}<script src="/scam-tools.js" defer></script></body></html>`;
}

const tools = [
  {
    slug:"kiem-tra-cuoc-goi-la", title:"Kiểm tra cuộc gọi lạ: Ai gọi và họ đang yêu cầu gì?", description:"Công cụ kiểm tra cuộc gọi lạ theo người tự xưng, hành động được yêu cầu, áp lực và bí mật; đưa ra tín hiệu rủi ro và bước xác minh an toàn.", h1:"Tôi vừa nhận cuộc gọi lạ — kiểm tra ngay", lead:"Chọn người gọi tự xưng là ai và họ yêu cầu bạn làm gì. Công cụ không tra cứu danh tính số điện thoại; nó đánh giá kịch bản và hướng dẫn cách xác minh.",
    tool:`<section class="scam-tool-panel" data-scam-tool="call-triage"><form><fieldset><legend>Người gọi tự xưng là ai?</legend><select name="claim"><option value="">Không rõ/người lạ</option><option value="police">Công an/Tòa án/Viện kiểm sát</option><option value="bank">Ngân hàng/tổ chức tài chính</option><option value="school">Giáo viên/nhà trường</option><option value="hospital">Bệnh viện/nhân viên y tế</option><option value="electricity">Điện lực/viễn thông</option><option value="insurance">BHXH/cơ quan nhà nước</option></select></fieldset><fieldset><legend>Họ yêu cầu gì?</legend><select name="request"><option value="">Chỉ trao đổi thông tin</option><option value="transfer">Chuyển tiền/đóng phí</option><option value="otp">Đọc OTP/mã xác thực</option><option value="password">Cung cấp mật khẩu/PIN/CVV</option><option value="install">Cài app/APK</option><option value="screen">Chia sẻ màn hình/cấp quyền</option></select></fieldset><label><input type="checkbox" name="urgency" /> Họ tạo áp lực phải làm ngay</label><label><input type="checkbox" name="secrecy" /> Họ yêu cầu giữ bí mật/không gọi người khác</label><button type="submit">Đánh giá tình huống</button></form>${resultBox()}</section>`,
    content:`<section><h2>Công cụ đánh giá điều gì?</h2><p>Nó ưu tiên hành động rủi ro như chuyển tiền, cung cấp OTP, cài ứng dụng và chia sẻ màn hình; không coi danh xưng của người gọi là bằng chứng thật hay giả. Nếu cần tra cứu số, xem <a href="/kien-thuc/kiem-tra-so-dien-thoai-lua-dao/">hướng dẫn kiểm tra số điện thoại</a>.</p></section>`,
  },
  {
    slug:"xu-ly-khi-bi-lua", title:"Tôi vừa bị lừa phải làm gì? Wizard xử lý theo sự cố", description:"Wizard xử lý khi vừa bị lừa: đã chuyển tiền, lộ mật khẩu/OTP, cài app, chia sẻ màn hình hoặc mất tài khoản; sắp xếp các bước cần ưu tiên.", h1:"Tôi vừa bị lừa — phải làm gì ngay?", lead:"Chọn những việc đã xảy ra để nhận danh sách hành động ưu tiên. Mục tiêu là giảm thiệt hại, bảo vệ tài khoản và lưu bằng chứng.",
    tool:`<section class="scam-tool-panel" data-scam-tool="incident-response"><form><fieldset><legend>Điều nào đã xảy ra?</legend><label><input type="checkbox" name="incident" value="money" /> Tôi đã chuyển tiền</label><label><input type="checkbox" name="incident" value="password" /> Tôi đã nhập/cung cấp mật khẩu</label><label><input type="checkbox" name="incident" value="otp" /> Tôi đã cung cấp OTP/mã xác thực</label><label><input type="checkbox" name="incident" value="app" /> Tôi đã cài app/APK lạ</label><label><input type="checkbox" name="incident" value="screen" /> Tôi đã chia sẻ màn hình/cấp quyền thiết bị</label><label><input type="checkbox" name="incident" value="account" /> Tài khoản đã bị chiếm/đổi thông tin khôi phục</label></fieldset><button type="submit">Tạo danh sách xử lý</button></form>${resultBox()}</section>`,
    content:`<section><h2>Khi nào cần ưu tiên ngân hàng?</h2><p>Nếu đã chuyển tiền, cung cấp OTP liên quan giao dịch hoặc thiết bị có app ngân hàng bị điều khiển, hãy liên hệ ngân hàng bằng kênh chính thức càng sớm càng tốt. Xem thêm <a href="/kien-thuc/xu-ly-khi-bi-lua-dao-chuyen-tien/">hướng dẫn sau khi bị lừa chuyển tiền</a>.</p></section>`,
  },
  {
    slug:"kiem-tra-bien-lai-chuyen-khoan", title:"Kiểm tra biên lai chuyển khoản: Tiền đã thực sự vào chưa?", description:"Checklist kiểm tra biên lai chuyển khoản trước khi giao hàng hoặc hoàn tiền: xác nhận giao dịch trên tài khoản nhận, ảnh biên lai và dấu hiệu chuyển dư.", h1:"Kiểm tra biên lai chuyển khoản trước khi giao hàng", lead:"Không phân tích ảnh để đoán thật/giả. Công cụ giúp bạn kiểm tra điều quan trọng hơn: tiền có thực sự xuất hiện phía tài khoản nhận hay không.",
    tool:`<section class="scam-tool-panel" data-scam-tool="receipt-check"><form><fieldset><legend>Tiền đã xuất hiện trong lịch sử giao dịch/tài khoản nhận của bạn?</legend><select name="credited"><option value="no">Chưa thấy/không chắc</option><option value="yes">Có, tôi tự kiểm tra trên app/ngân hàng</option></select></fieldset><fieldset><legend>Bạn đang dựa vào bằng chứng nào?</legend><select name="evidence"><option value="image">Ảnh/PDF biên lai người gửi cung cấp</option><option value="bank">Lịch sử giao dịch trên tài khoản nhận</option></select></fieldset><label><input type="checkbox" name="pressure" /> Người gửi yêu cầu giao hàng ngay hoặc hoàn lại “tiền dư”</label><button type="submit">Kiểm tra</button></form>${resultBox()}</section>`,
    content:`<section><h2>Vì sao không dùng OCR/AI để kết luận biên lai?</h2><p>Biên lai có thể được chỉnh sửa rất tinh vi và mẫu giao diện ngân hàng thay đổi. Nguồn sự thật tốt hơn là trạng thái giao dịch phía tài khoản nhận. Xem <a href="/kien-thuc/bien-lai-chuyen-khoan-gia/">hướng dẫn biên lai chuyển khoản giả</a>.</p></section>`,
  },
  {
    slug:"kiem-tra-tin-nhan-dang-ngo", title:"Kiểm tra tin nhắn đáng ngờ: Phát hiện tín hiệu phishing, OTP, link", description:"Dán SMS/tin nhắn đáng ngờ để kiểm tra cục bộ các tín hiệu phổ biến: link, OTP, áp lực, chuyển tiền, cài app và mạo danh tổ chức. Không gửi dữ liệu lên server.", h1:"Kiểm tra tin nhắn đáng ngờ", lead:"Dán nội dung SMS hoặc tin nhắn. Công cụ chỉ tìm các tín hiệu phổ biến và không thể chứng minh tin nhắn an toàn hay lừa đảo.",
    tool:`<section class="scam-tool-panel" data-scam-tool="sms-check"><label for="sms-input"><strong>Nội dung tin nhắn</strong></label><textarea id="sms-input" placeholder="Dán nội dung cần kiểm tra. Hãy xóa thông tin cá nhân không cần thiết trước khi phân tích."></textarea><button type="button" data-analyze>Phân tích tín hiệu</button>${resultBox()}</section>`,
    content:`<section><h2>Công cụ không làm gì?</h2><p>Công cụ không truy cập link, không gửi nội dung tới dịch vụ AI bên ngoài và không tra cứu chủ sở hữu số điện thoại. Với SMS Brandname, xem thêm <a href="/kien-thuc/sms-brandname-gia-mao/">vì sao cùng luồng tin nhắn vẫn cần kiểm tra link</a>.</p></section>`,
  },
  {
    slug:"kiem-tra-quyen-ung-dung-android", title:"Kiểm tra quyền ứng dụng Android: Trợ năng, SMS, màn hình", description:"Checklist quyền ứng dụng Android thường bị lạm dụng trong lừa đảo: Accessibility/Trợ năng, Device Admin, SMS, thông báo, chia sẻ màn hình và nguồn cài APK.", h1:"Kiểm tra quyền ứng dụng Android trước khi cấp", lead:"Chọn các quyền ứng dụng đang yêu cầu. Công cụ giải thích mức độ nhạy cảm theo bối cảnh lừa đảo; quyền nhạy cảm không tự động có nghĩa ứng dụng là mã độc.",
    tool:`<section class="scam-tool-panel" data-scam-tool="permission-check"><form><fieldset><legend>Ứng dụng đang yêu cầu quyền nào?</legend><label><input type="checkbox" name="permission" value="accessibility" /> Trợ năng / Accessibility</label><label><input type="checkbox" name="permission" value="admin" /> Device Admin / quản trị thiết bị</label><label><input type="checkbox" name="permission" value="sms" /> Đọc SMS</label><label><input type="checkbox" name="permission" value="notifications" /> Đọc thông báo</label><label><input type="checkbox" name="permission" value="screen" /> Chia sẻ/ghi màn hình</label><label><input type="checkbox" name="permission" value="install" /> Cài từ nguồn không xác định/APK</label><label><input type="checkbox" name="permission" value="contacts" /> Danh bạ</label></fieldset><button type="submit">Đánh giá quyền</button></form>${resultBox()}</section>`,
    content:`<section><h2>Tín hiệu quan trọng nhất là tổ hợp quyền + nguồn cài</h2><p>Ứng dụng từ link lạ yêu cầu Trợ năng, đọc SMS và chia sẻ màn hình có mức rủi ro cao hơn nhiều so với ứng dụng chính thức có lý do chức năng rõ ràng. Xem <a href="/kien-thuc/app-quyen-tro-nang-lua-dao/">giải thích chi tiết về quyền Trợ năng</a>.</p></section>`,
  },
  {
    slug:"kiem-tra-truoc-khi-chuyen-tien", title:"Checklist trước khi chuyển tiền: 30 giây để giảm rủi ro lừa đảo", description:"Checklist 30 giây trước khi chuyển tiền: xác minh người nhận, tài khoản thay đổi, áp lực chuyển gấp và các khoản phí mở khóa hoặc bảo chứng.", h1:"Kiểm tra trước khi chuyển tiền — checklist 30 giây", lead:"Trước khi bấm xác nhận giao dịch, kiểm tra nhanh các tín hiệu làm tăng rủi ro giả mạo và lừa đảo.",
    tool:`<section class="scam-tool-panel" data-scam-tool="transfer-check"><form><fieldset><legend>Bạn có biết/xác minh được người nhận?</legend><select name="known"><option value="yes">Có</option><option value="no">Không hoặc chỉ biết qua online</option></select></fieldset><fieldset><legend>Bạn đã xác minh yêu cầu qua kênh độc lập?</legend><select name="verified"><option value="no">Chưa</option><option value="yes">Có</option></select></fieldset><label><input type="checkbox" name="changed" /> Tài khoản nhận vừa thay đổi so với trước</label><label><input type="checkbox" name="urgent" /> Tôi đang bị thúc phải chuyển ngay</label><label><input type="checkbox" name="fee" /> Đây là phí để mở khóa/rút tiền/xác minh/nhận quà</label><button type="submit">Đánh giá trước khi chuyển</button></form>${resultBox()}</section>`,
    content:`<section><h2>Checklist phù hợp với những tình huống nào?</h2><p>Chuyển tiền cho người quen, nhà cung cấp, đặt cọc, đầu tư, nhận quà hoặc xử lý “khẩn cấp”. Với doanh nghiệp, xem thêm <a href="/kien-thuc/gia-mao-lanh-dao-yeu-cau-chuyen-tien-bec/">BEC/CEO Fraud</a>.</p></section>`,
  },
];

for (const tool of tools) await write(`cong-cu/${tool.slug}/index.html`, toolPage(tool));

const channelCanonical = `${SITE}/cong-cu/tra-cuu-kenh-chinh-thuc/`;
const channelTitle = "Tra cứu kênh liên hệ chính thức trước khi gọi lại hoặc đăng nhập";
const channelDesc = "Danh bạ kênh chính thức để tự xác minh khi có cuộc gọi, SMS hoặc link đáng ngờ: cơ quan nhà nước, EVN, BHXH, nhà mạng và hướng dẫn tìm hotline ngân hàng.";
const channelCards = [
 ["Cơ quan Công an","Nhóm cơ quan nhà nước","https://bocongan.gov.vn/","Dùng cổng Bộ Công an hoặc Công an địa phương; không dùng số/link do người tự xưng điều tra viên cung cấp."],
 ["BHXH Việt Nam","Dịch vụ công","https://baohiemxahoi.gov.vn/","Tự truy cập BHXH Việt Nam/VssID từ nguồn chính thức để kiểm tra thông báo."],
 ["EVN","Điện lực","https://www.evn.com.vn/","Từ EVN có thể đi tới Tổng công ty Điện lực khu vực và kênh chăm sóc khách hàng chính thức."],
 ["Viettel","Nhà mạng","https://vietteltelecom.vn/","Tìm tổng đài và ứng dụng My Viettel từ website chính thức."],
 ["VinaPhone","Nhà mạng","https://vinaphone.com.vn/","Tìm tổng đài và ứng dụng từ website chính thức."],
 ["MobiFone","Nhà mạng","https://www.mobifone.vn/","Tìm tổng đài và ứng dụng My MobiFone từ website chính thức."],
 ["Ngân hàng của bạn","Ngân hàng","/kien-thuc/gia-mao-ngan-hang/","Ưu tiên số trên mặt sau thẻ, ứng dụng ngân hàng hoặc website gõ trực tiếp; tránh số xuất hiện trong SMS/link đáng ngờ."],
 ["Cảnh báo phishing/domain","An toàn mạng","https://khonggianmang.vn/","Tham khảo các kênh an toàn mạng và cảnh báo chính thức; không dựa vào một nguồn duy nhất để kết luận."],
];
const channelCardsHtml = channelCards.map((c)=>`<article data-channel-card data-category="${c[1]}"><h2>${c[0]}</h2><p><strong>${c[1]}</strong></p><p>${c[3]}</p><a href="${c[2]}"${c[2].startsWith("http")?' target="_blank" rel="noopener noreferrer"':""}>Mở kênh chính thức</a></article>`).join("");
await write("cong-cu/tra-cuu-kenh-chinh-thuc/index.html", `<!doctype html><html lang="vi-VN">${standardHead({title:channelTitle,description:channelDesc,canonical:channelCanonical,schema:simpleSchema({canonical:channelCanonical,name:channelTitle,description:channelDesc})})}<body>${header("tools")}<main class="seo-article"><div class="seo-breadcrumb"><a href="/">Cảnh Giác Số</a> › <a href="/cong-cu/">Công cụ</a> › Kênh chính thức</div><span class="seo-eyebrow">TỰ TÌM KÊNH XÁC MINH</span><h1>Tra cứu kênh liên hệ chính thức</h1><p class="lead">Thay vì gọi lại số hoặc bấm link do người lạ cung cấp, hãy bắt đầu từ domain/ứng dụng chính thức của tổ chức.</p><section class="scam-tool-panel" data-scam-tool="official-channels"><div class="scam-filter-bar"><input type="search" data-filter-input placeholder="Tìm ngân hàng, điện lực, BHXH, nhà mạng..." /><select data-filter-category><option value="">Tất cả nhóm</option><option>Nhóm cơ quan nhà nước</option><option>Dịch vụ công</option><option>Điện lực</option><option>Nhà mạng</option><option>Ngân hàng</option><option>An toàn mạng</option></select></div><div class="scam-directory">${channelCardsHtml}</div></section><section class="seo-note"><strong>Vì sao không hard-code toàn bộ hotline?</strong><p>Số hỗ trợ có thể thay đổi. Cảnh Giác Số ưu tiên đưa bạn tới domain/ứng dụng chính thức để lấy thông tin liên hệ cập nhật thay vì sao chép một danh bạ dễ lỗi thời.</p></section></main>${FOOTER}<script src="/scam-tools.js" defer></script></body></html>`);

const scenarioCanonical = `${SITE}/cong-cu/thu-vien-kich-ban-lua-dao/`;
const scenarioTitle = "Thư viện 30 kịch bản lừa đảo: tìm theo người gọi và yêu cầu";
const scenarioDesc = "Thư viện 30 kịch bản lừa đảo để tìm nhanh theo người tự xưng, kênh liên hệ và hành động họ yêu cầu; liên kết tới hướng dẫn xử lý tương ứng.";
const scenarios = [
 ["Công an yêu cầu chuyển tiền chứng minh vô tội","mạo danh","/kien-thuc/gia-mao-cong-an-co-quan-nha-nuoc/"],
 ["Bắt cóc online, yêu cầu giữ bí mật","mạo danh","/kien-thuc/bat-coc-online/"],
 ["Ngân hàng báo tài khoản bất thường","ngân hàng","/kien-thuc/gia-mao-ngan-hang/"],
 ["SMS Brandname ngân hàng kèm link","phishing","/kien-thuc/sms-brandname-gia-mao/"],
 ["Điện lực báo nợ, dọa cắt điện","mạo danh","/kien-thuc/lua-dao-tien-dien-gia-mao-evn/"],
 ["BHXH yêu cầu cập nhật VssID","mạo danh","/kien-thuc/lua-dao-bao-hiem-xa-hoi-vssid/"],
 ["Khóa SIM vì chưa chuẩn hóa thuê bao","mạo danh","/kien-thuc/lua-dao-khoa-sim-chuan-hoa-thue-bao/"],
 ["Giáo viên báo con bị tai nạn","khẩn cấp","/kien-thuc/gia-danh-giao-vien-bao-con-tai-nan/"],
 ["Bệnh viện báo người thân cấp cứu","khẩn cấp","/kien-thuc/gia-danh-benh-vien-bao-nguoi-than-cap-cuu/"],
 ["Shipper yêu cầu chuyển phí nhỏ","mua bán","/kien-thuc/lua-dao-shipper-giao-hang/"],
 ["Người mua gửi link nhận tiền","mua bán","/kien-thuc/nguoi-mua-gui-link-nhan-tien-lua-dao/"],
 ["Biên lai chuyển khoản giả","mua bán","/kien-thuc/bien-lai-chuyen-khoan-gia/"],
 ["Shop yêu cầu đặt cọc gấp","mua bán","/kien-thuc/dat-coc-mua-hang-online-lua-dao/"],
 ["Hoàn tiền đơn hàng qua QR/link","phishing","/kien-thuc/lua-dao-hoan-tien-don-hang/"],
 ["Hoàn thuế qua link/app giả","phishing","/kien-thuc/lua-dao-hoan-thue-gia-mao/"],
 ["Phạt nguội qua SMS","phishing","/kien-thuc/lua-dao-phat-nguoi-qua-sms/"],
 ["VNeID/dịch vụ công giả mạo","thiết bị","/kien-thuc/lua-dao-vneid-gia-mao/"],
 ["App yêu cầu quyền Trợ năng","thiết bị","/kien-thuc/app-quyen-tro-nang-lua-dao/"],
 ["App điều khiển điện thoại từ xa","thiết bị","/kien-thuc/app-dieu-khien-dien-thoai-tu-xa/"],
 ["Lừa OTP chiếm tài khoản","tài khoản","/kien-thuc/lua-dao-otp-chiem-doat-tai-khoan/"],
 ["Deepfake giả giọng người thân","AI","/kien-thuc/deepfake-gia-giong-nguoi-than/"],
 ["AI ghép ảnh nhạy cảm để tống tiền","AI","/kien-thuc/ai-ghep-anh-video-tong-tien/"],
 ["Romance scam, quà từ nước ngoài","tình cảm","/kien-thuc/romance-scam-lua-dao-tinh-cam/"],
 ["Đầu tư qua Telegram/Zalo","đầu tư","/kien-thuc/lua-dao-dau-tu-telegram-zalo/"],
 ["Sàn đầu tư giả khóa rút tiền","đầu tư","/kien-thuc/lua-dao-dau-tu-online/"],
 ["Cộng tác viên làm nhiệm vụ","việc làm","/kien-thuc/lua-dao-cong-tac-vien-viec-nhe-luong-cao/"],
 ["Tuyển dụng yêu cầu đóng phí","việc làm","/kien-thuc/lua-dao-tuyen-dung-online/"],
 ["Trúng thưởng/nhận quà đóng phí","quà tặng","/kien-thuc/trung-thuong-nhan-qua-dong-phi-lua-dao/"],
 ["Giả mạo lãnh đạo yêu cầu chuyển tiền","doanh nghiệp","/kien-thuc/gia-mao-lanh-dao-yeu-cau-chuyen-tien-bec/"],
 ["Link đăng nhập giả/phishing","phishing","/kien-thuc/phishing-la-gi/"],
];
const scenarioCards = scenarios.map((s)=>`<article data-scenario-card data-category="${s[1]}"><h2>${s[0]}</h2><p>Nhóm: ${s[1]}</p><a href="${s[2]}">Xem dấu hiệu & cách xử lý</a></article>`).join("");
await write("cong-cu/thu-vien-kich-ban-lua-dao/index.html", `<!doctype html><html lang="vi-VN">${standardHead({title:scenarioTitle,description:scenarioDesc,canonical:scenarioCanonical,schema:simpleSchema({canonical:scenarioCanonical,name:scenarioTitle,description:scenarioDesc})})}<body>${header("tools")}<main class="seo-article"><div class="seo-breadcrumb"><a href="/">Cảnh Giác Số</a> › <a href="/cong-cu/">Công cụ</a> › Thư viện kịch bản</div><span class="seo-eyebrow">30 KỊCH BẢN · TÌM NHANH</span><h1>Thư viện 30 kịch bản lừa đảo</h1><p class="lead">Tìm theo người tự xưng, kênh hoặc hành động được yêu cầu. Thư viện không gắn nhãn cá nhân; nó giúp bạn nhận ra cấu trúc kịch bản và chuyển tới hướng dẫn phù hợp.</p><section class="scam-tool-panel" data-scam-tool="scenario-library"><div class="scam-filter-bar"><input type="search" data-filter-input placeholder="Ví dụ: ngân hàng, OTP, điện lực, đầu tư..." /><select data-filter-category><option value="">Tất cả nhóm</option>${[...new Set(scenarios.map((s)=>s[1]))].map((x)=>`<option value="${x}">${x}</option>`).join("")}</select></div><div class="scam-scenario-grid">${scenarioCards}</div></section></main>${FOOTER}<script src="/scam-tools.js" defer></script></body></html>`);

const toolsCanonical = `${SITE}/cong-cu/`;
const toolsTitle = "Trung tâm kiểm tra lừa đảo: Công cụ xác minh trước khi hành động";
const toolsDesc = "Bộ công cụ chống lừa đảo: kiểm tra cuộc gọi, SMS, biên lai, quyền ứng dụng Android, checklist trước khi chuyển tiền, xử lý khi bị lừa và thư viện 30 kịch bản.";
const toolCards = [
 ["/cong-cu/kiem-tra-cuoc-goi-la/","Cuộc gọi lạ","Ai gọi và họ đang yêu cầu gì?"],
 ["/cong-cu/xu-ly-khi-bi-lua/","Tôi vừa bị lừa","Tạo thứ tự xử lý theo việc đã xảy ra."],
 ["/cong-cu/kiem-tra-bien-lai-chuyen-khoan/","Biên lai chuyển khoản","Kiểm tra tiền đã thực sự vào tài khoản chưa."],
 ["/cong-cu/kiem-tra-tin-nhan-dang-ngo/","Tin nhắn đáng ngờ","Tìm tín hiệu link, OTP, áp lực, cài app."],
 ["/cong-cu/kiem-tra-quyen-ung-dung-android/","Quyền ứng dụng Android","Đánh giá Trợ năng, SMS, màn hình và APK."],
 ["/cong-cu/kiem-tra-truoc-khi-chuyen-tien/","Trước khi chuyển tiền","Checklist 30 giây giảm rủi ro."],
 ["/cong-cu/tra-cuu-kenh-chinh-thuc/","Kênh liên hệ chính thức","Tự tìm tổ chức thay vì dùng link/số người lạ gửi."],
 ["/cong-cu/thu-vien-kich-ban-lua-dao/","30 kịch bản lừa đảo","Tìm theo người gọi, kênh và hành động."],
];
await write("cong-cu/index.html", `<!doctype html><html lang="vi-VN">${standardHead({title:toolsTitle,description:toolsDesc,canonical:toolsCanonical,schema:simpleSchema({canonical:toolsCanonical,name:toolsTitle,description:toolsDesc})})}<body>${header("tools")}<main class="seo-shell"><div class="seo-breadcrumb"><a href="/">Cảnh Giác Số</a> › Công cụ</div><section class="seo-hero"><span class="seo-eyebrow">TRUNG TÂM KIỂM TRA LỪA ĐẢO</span><h1>Kiểm tra trước khi tin, bấm, cài hoặc chuyển tiền</h1><p>Các công cụ ưu tiên hành vi an toàn và xác minh độc lập. Chúng không tuyên bố một số điện thoại, tài khoản hay cá nhân là an toàn chỉ vì chưa có cảnh báo.</p></section><section><h2>Chọn đúng dữ kiện bạn đang có</h2><div class="growth-grid">${toolCards.map((x)=>`<a class="growth-card" href="${x[0]}"><strong>${x[1]}</strong><span>${x[2]}</span></a>`).join("")}</div></section><section class="seo-note"><strong>Không nhập dữ liệu bí mật</strong><p>Không nhập OTP, mật khẩu, PIN, CVV, mã khôi phục hoặc dữ liệu ngân hàng thật vào các công cụ. Với SMS checker, hãy xóa thông tin cá nhân không cần thiết trước khi dán nội dung.</p></section></main>${FOOTER}</body></html>`);

async function allHtmlFiles(dir) {
  const out = [];
  for (const entry of await readdir(dir,{withFileTypes:true})) {
    const full = path.join(dir,entry.name);
    if (entry.isDirectory()) out.push(...await allHtmlFiles(full));
    else if (entry.name === "index.html") out.push(full);
  }
  return out;
}

const knowledgeRoot = path.join(PUBLIC,"kien-thuc");
const knowledgeFiles = await allHtmlFiles(knowledgeRoot);
for (const file of knowledgeFiles) {
  let html = await readFile(file,"utf8");
  if (!html.includes('href="/cong-cu/"')) {
    html = html.replace(/(<nav class="seo-nav-links"[^>]*>[\s\S]*?<\/nav>)/i,(nav)=>nav.replace("</nav>",'<a href="/cong-cu/">Công cụ</a><a href="/canh-bao-lua-dao-hom-nay/">Cảnh báo</a></nav>'));
  }
  html = html.replace(/<script>try\{if\(localStorage\.getItem\("khien-so-theme"\)===["']dark["']\)document\.documentElement\.dataset\.theme=["']dark["']\}catch\{\}<\/script>/g,THEME);
  await writeFile(file,html,"utf8");
}

for (const relative of ["gioi-thieu/index.html","quyen-rieng-tu/index.html","phuong-phap-kiem-chung/index.html","sitemap/index.html"]) {
  const file = path.join(PUBLIC,relative);
  if (!(await exists(file))) continue;
  let html = await readFile(file,"utf8");
  html = html.replace(/<script>try\{if\(localStorage\.getItem\("khien-so-theme"\)===["']dark["']\)document\.documentElement\.dataset\.theme=["']dark["']\}catch\{\}<\/script>/g,THEME);
  if (!html.includes('/theme-init.js')) html = html.replace("<head>",`<head>\n  ${THEME}`);
  if (html.includes('class="seo-nav-links"') && !html.includes('href="/cong-cu/"')) {
    html = html.replace(/(<nav class="seo-nav-links"[^>]*>[\s\S]*?<\/nav>)/i,(nav)=>nav.replace("</nav>",'<a href="/cong-cu/">Công cụ</a><a href="/canh-bao-lua-dao-hom-nay/">Cảnh báo</a></nav>'));
  }
  await writeFile(file,html,"utf8");
}

let hub = await read("kien-thuc/index.html");
if (!hub.includes('data-growth-wave9="knowledge-hub"')) {
  const cards = articles.slice(0,12).map((a)=>`<a class="growth-card" href="/kien-thuc/${a.slug}/"><strong>${a.breadcrumb}</strong><span>${a.quick}</span></a>`).join("");
  const section = `<section data-growth-wave9="knowledge-hub"><span class="seo-eyebrow">MỚI · TÌNH HUỐNG ĐANG ĐƯỢC QUAN TÂM</span><h2>Nội dung mới để kiểm tra trước khi hành động</h2><div class="growth-grid">${cards}</div><p><a href="/canh-bao-lua-dao-hom-nay/">Xem cảnh báo lừa đảo hôm nay</a> · <a href="/co-phai-lua-dao-khong/">Tôi đang tự hỏi “có phải lừa đảo không?”</a> · <a href="/tu-dien-lua-dao/">Từ điển lừa đảo</a></p></section>`;
  hub = hub.replace(/(<section class="seo-note">)/,`${section}$1`);
}
await write("kien-thuc/index.html",hub);

if (await exists(HOME)) {
  let home = await readFile(HOME,"utf8");
  if (!home.includes('data-growth-wave9="home"')) {
    const section = `<section data-growth-wave9="home" aria-labelledby="growth-wave9-title"><h2 id="growth-wave9-title">Kiểm tra lừa đảo theo tình huống</h2><p>Khi đang phân vân có nên tin, bấm link, cài app hay chuyển tiền, hãy bắt đầu từ dữ kiện bạn đang có.</p><ul><li><a href="/cong-cu/">Trung tâm kiểm tra lừa đảo</a></li><li><a href="/canh-bao-lua-dao-hom-nay/">Cảnh báo lừa đảo hôm nay</a></li><li><a href="/co-phai-lua-dao-khong/">Có phải lừa đảo không?</a></li><li><a href="/tu-dien-lua-dao/">Từ điển lừa đảo</a></li><li><a href="/kien-thuc/bien-lai-chuyen-khoan-gia/">Biên lai chuyển khoản giả</a></li><li><a href="/kien-thuc/bat-coc-online/">Bắt cóc online</a></li><li><a href="/kien-thuc/sms-brandname-gia-mao/">SMS Brandname giả</a></li></ul></section>`;
    home = home.replace(/(<section aria-labelledby="seo-purpose">)/,`${section}$1`);
  }
  await writeFile(HOME,home,"utf8");
}

let sitemap = await read("sitemap.xml");
const generatedUrls = [
  ...articles.map((a)=>`${SITE}/kien-thuc/${a.slug}/`),
  `${SITE}/canh-bao-lua-dao-hom-nay/`,
  `${SITE}/co-phai-lua-dao-khong/`,
  `${SITE}/tu-dien-lua-dao/`,
  `${SITE}/cong-cu/`,
  ...tools.map((t)=>`${SITE}/cong-cu/${t.slug}/`),
  channelCanonical,
  scenarioCanonical,
];
const ensureUrl = (url,priority="0.8") => {
  if (sitemap.includes(`<loc>${url}</loc>`)) return;
  sitemap = sitemap.replace("</urlset>",`  <url>\n    <loc>${url}</loc>\n    <lastmod>${UPDATED}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>${priority}</priority>\n  </url>\n</urlset>`);
};
for (const url of generatedUrls) ensureUrl(url,url.includes("/cong-cu/") ? "0.9" : "0.8");
for (const u of existingUpdates) {
  const url = `${SITE}/kien-thuc/${u.slug}/`;
  const idx = sitemap.indexOf(`<loc>${url}</loc>`);
  if (idx >= 0) {
    const start = sitemap.indexOf("<lastmod>",idx);
    const end = sitemap.indexOf("</lastmod>",start);
    if (start >= 0 && end >= 0) sitemap = sitemap.slice(0,start+9)+UPDATED+sitemap.slice(end);
  }
}
await write("sitemap.xml",sitemap);

const sitemapPage = path.join(PUBLIC,"sitemap","index.html");
if (await exists(sitemapPage)) {
  let html = await readFile(sitemapPage,"utf8");
  if (!html.includes('data-growth-wave9="sitemap"')) {
    html = html.replace("</main>",`<section data-growth-wave9="sitemap"><h2>Nội dung tăng trưởng mới</h2><ul>${generatedUrls.map((url)=>`<li><a href="${new URL(url).pathname}">${new URL(url).pathname}</a></li>`).join("")}</ul></section></main>`);
  }
  await writeFile(sitemapPage,html,"utf8");
}

console.log(`Content Growth Wave 9: generated ${articles.length} new anti-scam articles, updated ${existingUpdates.length} priority articles, added alert/question/dictionary hubs and ${tools.length + 2} tool pages.`);
