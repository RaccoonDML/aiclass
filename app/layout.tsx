import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Class · 课堂问答",
  description: "小学语文课堂即时问答系统",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
