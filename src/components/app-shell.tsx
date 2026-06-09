"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { AppBar } from "@/components/app-bar";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const showAppBar = pathname !== "/login";

  return (
    <>
      {showAppBar ? <AppBar /> : null}
      {children}
    </>
  );
}
