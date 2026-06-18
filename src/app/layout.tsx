import type { Metadata } from "next";
import Script from "next/script";
import { cookies } from "next/headers";

import { AppShell } from "@/components/app-shell";
import { isTheme, themeStorageKey } from "@/lib/theme";

import "./globals.css";

export const metadata: Metadata = {
  title: "Goaltree",
  description: "Goal, plan, and task workspace for personal execution.",
  icons: {
    icon: "/icon.svg",
  },
};

const themeInitScript = `
  (function() {
    try {
      var storageKey = "${themeStorageKey}";
      var cookieTheme = null;
      var cookieMatch = document.cookie.match(new RegExp("(?:^|; )" + storageKey + "=([^;]*)"));

      if (cookieMatch) {
        cookieTheme = decodeURIComponent(cookieMatch[1]);
      }

      var storedTheme = window.localStorage.getItem(storageKey);
      var systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      var theme = cookieTheme === "light" || cookieTheme === "dark"
        ? cookieTheme
        : storedTheme === "light" || storedTheme === "dark"
          ? storedTheme
          : systemTheme;

      if ((cookieTheme === "light" || cookieTheme === "dark") && storedTheme !== theme) {
        window.localStorage.setItem(storageKey, theme);
      }

      if (
        !(cookieTheme === "light" || cookieTheme === "dark") &&
        (storedTheme === "light" || storedTheme === "dark")
      ) {
        document.cookie = storageKey + "=" + encodeURIComponent(storedTheme) + "; Path=/; Max-Age=31536000; SameSite=Lax";
      }

      document.documentElement.classList.toggle("light", theme === "light");
      document.documentElement.classList.toggle("dark", theme === "dark");
      document.documentElement.style.colorScheme = theme;
    } catch (_) {}
  })();
`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const initialTheme = cookieStore.get(themeStorageKey)?.value;
  const themeClassName = isTheme(initialTheme) ? initialTheme : undefined;

  return (
    <html
      className={themeClassName}
      lang="ko"
      style={isTheme(initialTheme) ? { colorScheme: initialTheme } : undefined}
      suppressHydrationWarning
    >
      <head>
        <Script
          id="goaltree-theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
      </head>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
