import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://canhgiacso.com"),
  title: "Cảnh Giác Số | HDBank - IT Security",
  description: "Chương trình mô phỏng tương tác của HDBank - IT Security, giúp nhận diện và xử lý các kịch bản lừa đảo trực tuyến phổ biến.",
  keywords: "an toàn thông tin, phòng chống lừa đảo, lừa đảo trực tuyến, mô phỏng, đào tạo, HDBank, IT Security",
  authors: [{ name: "HDBank IT Security Team" }],
  creator: "HDBank IT Security",
  publisher: "HDBank",
  formatDetection: {
    email: false,
    telephone: false,
    address: false,
  },
  alternates: { canonical: "/" },
  icons: { icon: "/khien-so-logo.png", shortcut: "/khien-so-logo.png" },
  openGraph: {
    title: "Cảnh Giác Số | HDBank - IT Security",
    description: "Học để không thành con mồi — thử sức với các tình huống lừa đảo và xây dựng phản xạ phòng vệ số.",
    type: "website",
    locale: "vi_VN",
    url: "https://canhgiacso.com/",
    siteName: "Cảnh Giác Số",
    images: [{ url: "/og.png", width: 1731, height: 909, alt: "Cảnh Giác Số — học để không thành con mồi" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Cảnh Giác Số | HDBank - IT Security",
    description: "Học để không thành con mồi — chương trình mô phỏng giúp xây dựng phản xạ phòng vệ số.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const schemaMarkup = {
    "@context": "https://schema.org",
    "@type": "EducationalWebApplication",
    name: "Cảnh Giác Số",
    description: "Chương trình mô phỏng tương tác giúp nhận diện và xử lý các kịch bản lừa đảo trực tuyến",
    url: "https://canhgiacso.com",
    applicationCategory: "EducationalApplication",
    publisher: {
      "@type": "Organization",
      name: "HDBank",
      logo: "https://canhgiacso.com/khien-so-logo.png",
    },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "VND",
      availability: "https://schema.org/InStock",
    },
  };

  return (
    <html lang="vi">
      <head>
        <meta name="theme-color" content="#6d0615" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaMarkup) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
