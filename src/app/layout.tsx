import type { Metadata } from "next";

import { AppBar } from "@/components/app-bar";

import "./globals.css";

export const metadata: Metadata = {
  title: "Goaltree",
  description: "Goal, plan, and task workspace for personal execution.",
};

const themeInitScript = `
  (function() {
    try {
      var storageKey = "goaltree-theme";
      var storedTheme = window.localStorage.getItem(storageKey);
      var systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      var theme = storedTheme === "light" || storedTheme === "dark" ? storedTheme : systemTheme;
      document.documentElement.classList.toggle("dark", theme === "dark");
      document.documentElement.style.colorScheme = theme;
    } catch (_) {}
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <AppBar />
        {children}
      </body>
    </html>
  );
}
