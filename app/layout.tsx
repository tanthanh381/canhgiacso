import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://canhgiacso.com"),
  title: "Cảnh Giác Số | HDBank - IT Security",
  description: "Chương trình mô phỏng tương tác của HDBank - IT Security, giúp nhận diện và xử lý các kịch bản lừa đảo trực tuyến phổ biến.",
  alternates: { canonical: "/" },
  icons: { icon: "/khien-so-logo.png", shortcut: "/khien-so-logo.png" },
  openGraph: {
    title: "Cảnh Giác Số | HDBank - IT Security",
    description: "Học để không thành con mồi — thử sức với các tình huống lừa đảo và xây dựng phản xạ phòng vệ số.",
    type: "website",
    locale: "vi_VN",
    url: "/",
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
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
