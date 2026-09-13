import type { Metadata } from "next";
import "./globals.css";

const siteUrl = "https://canhgiacso.com";
const siteTitle = "Cảnh Giác Số: Chống lừa đảo & An toàn thông tin";
const siteDescription = "Cảnh Giác Số giúp nhận diện và chống lừa đảo trực tuyến, nâng cao cảnh giác, bảo vệ tài khoản và rèn kỹ năng an toàn thông tin qua tình huống thực tế.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "Cảnh Giác Số",
  title: {
    default: siteTitle,
    template: "%s | Cảnh Giác Số",
  },
  description: siteDescription,
  keywords: [
    "chống lừa đảo",
    "lừa đảo",
    "cảnh giác",
    "an toàn thông tin",
    "lừa đảo trực tuyến",
    "phòng chống lừa đảo",
    "lừa đảo qua mạng",
    "an toàn số",
    "phishing",
    "giả mạo ngân hàng",
    "website giả mạo",
    "OTP",
    "deepfake",
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
    title: siteTitle,
    description: "Nâng cao cảnh giác, nhận diện lừa đảo và rèn kỹ năng an toàn thông tin qua các tình huống tương tác thực tế.",
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
    description: "Nâng cao cảnh giác, nhận diện lừa đảo và rèn kỹ năng an toàn thông tin qua các tình huống tương tác thực tế.",
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
