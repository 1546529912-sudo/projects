import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Demo 标注工具",
  description: "生成单 HTML Demo，预览与标注",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
