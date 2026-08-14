import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "研报分歧探测器",
  description:
    "输入股票代码，一秒看穿分析师们在吵什么。基于东方财富实时研报数据，AI驱动分歧分析。",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
