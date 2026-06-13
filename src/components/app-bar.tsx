"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRightStartOnRectangleIcon } from "@heroicons/react/24/outline";

import { Button, buttonVariants } from "@/components/ui/button";
import { SettingsDialog } from "@/components/settings-dialog";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/workspace", label: "Workspace" },
  { href: "/whativedone", label: "Done" },
  { href: "/timeline", label: "Timeline" },
  { href: "/trash", label: "Trash" },
];

export function AppBar() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="flex h-14 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link className="text-sm font-semibold tracking-normal" href="/dashboard">
          Goaltree
        </Link>

        <div className="flex items-center gap-2">
          <nav className="hidden items-center gap-1 md:flex" aria-label="Primary navigation">
            {navItems.map((item) => (
              <Link
                className={cn(
                  buttonVariants({ size: "sm", variant: "ghost" }),
                  "px-2.5 text-muted-foreground hover:text-foreground",
                )}
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <SettingsDialog />
          <Button
            aria-label="Sign out"
            className="text-muted-foreground hover:text-foreground"
            onClick={handleSignOut}
            size="sm"
            type="button"
            variant="ghost"
          >
            <ArrowRightStartOnRectangleIcon className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
