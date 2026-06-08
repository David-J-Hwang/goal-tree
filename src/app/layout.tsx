import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Goal Tree",
  description: "Goal, plan, and task workspace for personal execution.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
