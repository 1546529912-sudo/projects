import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "原型生成器 · DeepSeek",
  description: "用自然语言描述需求，AI 生成交互式 HTML 产品原型",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
