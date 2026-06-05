import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LOF套利监控",
  description: "LOF基金溢价/折价套利实时监控工具",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
