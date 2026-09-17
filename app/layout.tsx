import type { Metadata } from "next";
import "./globals.css";

const siteUrl = "https://canhgiacso.com";
const siteTitle = "Cảnh giác số";
const siteDescription =
  "Cảnh Giác Số giúp nhận diện và chống lừa đảo trực tuyến, nâng cao cảnh giác, bảo vệ tài khoản và rèn kỹ năng an toàn thông tin qua tình huống thực tế.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "Cảnh Giác Số",
  title: siteTitle,
  description: siteDescription,
  authors: [{ name: "Cảnh Giác Số", url: siteUrl }],
  creator: "Cảnh Giác Số",
  publisher: "Cảnh Giác Số",
  category: "Cybersecurity education",
  alternates: {
    canonical: "/",
    languages: {
      "vi-VN": "/",
      "x-default": "/",
    },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: "/khien-so-logo.png",
    shortcut: "/khien-so-logo.png",
    apple: "/khien-so-logo.png",
  },
  openGraph: {
    title: siteTitle,
    description:
      "Nâng cao cảnh giác, nhận diện lừa đảo và rèn kỹ năng an toàn thông tin qua các tình huống tương tác thực tế.",
    type: "website",
    siteName: "Cảnh Giác Số",
    locale: "vi_VN",
    url: "/",
    images: [
      {
        url: "/og.png",
        width: 1731,
        height: 909,
        type: "image/png",
        alt: "Cảnh Giác Số — chống lừa đảo và bảo vệ an toàn thông tin",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description:
      "Nâng cao cảnh giác, nhận diện lừa đảo và rèn kỹ năng an toàn thông tin qua các tình huống tương tác thực tế.",
    images: ["/og.png"],
  },
};

const bootStyles = `
  #refresh-shell { visibility: hidden; }
  #refresh-loader {
    position: fixed;
    inset: 0;
    z-index: 2147483647;
    display: grid;
    place-items: center;
    background: #f7f9fc;
    color: #0f172a;
    opacity: 1;
    visibility: visible;
    transition: opacity 140ms ease, visibility 0s linear 140ms;
  }
  #refresh-loader-inner {
    display: flex;
    align-items: center;
    gap: 12px;
    font: 700 20px/1.2 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    letter-spacing: -0.02em;
  }
  #refresh-loader-mark {
    width: 22px;
    height: 22px;
    border: 2px solid rgba(15, 23, 42, 0.18);
    border-top-color: #0f172a;
    border-radius: 999px;
    animation: refresh-loader-spin 700ms linear infinite;
  }
  body.refresh-ready #refresh-shell { visibility: visible; }
  body.refresh-ready #refresh-loader {
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
  }
  @keyframes refresh-loader-spin { to { transform: rotate(360deg); } }
  @media (prefers-color-scheme: dark) {
    #refresh-loader { background: #0b1220; color: #f8fafc; }
    #refresh-loader-mark { border-color: rgba(248, 250, 252, 0.2); border-top-color: #f8fafc; }
  }
`;

const bootScript = `
  (function () {
    var body = document.body;
    var shell = document.getElementById('refresh-shell');
    var observer;
    var done = false;

    function reveal() {
      if (done) return;
      done = true;
      if (observer) observer.disconnect();
      body.classList.add('refresh-ready');
    }

    function revealWhenReady() {
      if (!shell) return reveal();
      var choice = shell.querySelector('.choice-list .choice');
      if (!choice || !choice.hasAttribute('disabled')) reveal();
    }

    if (shell && 'MutationObserver' in window) {
      observer = new MutationObserver(revealWhenReady);
      observer.observe(shell, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ['disabled', 'class']
      });
    }

    requestAnimationFrame(function () {
      requestAnimationFrame(revealWhenReady);
    });

    window.setTimeout(reveal, 2200);
  })();
`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi-VN">
      <body className="refresh-boot">
        <style>{bootStyles}</style>
        <div id="refresh-loader" role="status" aria-label="Đang tải Cảnh giác số">
          <div id="refresh-loader-inner">
            <span id="refresh-loader-mark" aria-hidden="true" />
            <span>Cảnh giác số</span>
          </div>
        </div>
        <div id="refresh-shell">{children}</div>
        <noscript>
          <style>{`#refresh-shell{visibility:visible!important}#refresh-loader{display:none!important}`}</style>
        </noscript>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      </body>
    </html>
  );
}
