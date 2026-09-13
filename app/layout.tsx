import type { Metadata } from "next";
import "./globals.css";

const siteUrl = "https://canhgiacso.com";
const siteTitle = "Cảnh Giác Số: Nhận diện lừa đảo trực tuyến | HDBank";
const siteDescription = "Học cách nhận diện lừa đảo trực tuyến, phishing và giả mạo qua các tình huống mô phỏng tương tác. Rèn phản xạ an toàn số cùng Cảnh Giác Số.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "Cảnh Giác Số",
  title: {
    default: siteTitle,
    template: "%s | Cảnh Giác Số",
  },
  description: siteDescription,
  keywords: [
    "lừa đảo trực tuyến",
    "phishing",
    "giả mạo",
    "an toàn thông tin",
    "an toàn số",
    "phòng chống lừa đảo",
    "Cảnh Giác Số",
  ],
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
    title: "Cảnh Giác Số: Nhận diện lừa đảo trực tuyến",
    description: "Rèn phản xạ nhận diện lừa đảo, phishing và giả mạo qua các tình huống tương tác.",
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
        alt: "Cảnh Giác Số — học để không thành con mồi",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Cảnh Giác Số: Nhận diện lừa đảo trực tuyến",
    description: "Rèn phản xạ nhận diện lừa đảo, phishing và giả mạo qua các tình huống tương tác.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi-VN">
      <body>{children}</body>
    </html>
  );
}
