"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  ArrowRightStartOnRectangleIcon,
  Bars3Icon,
} from "@heroicons/react/24/outline";

import { Button, buttonVariants } from "@/components/ui/button";
import { SettingsDialog } from "@/components/settings-dialog";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/workspace", label: "Workspace" },
  { href: "/inbox", label: "Inbox" },
  { href: "/whativedone", label: "Done" },
  { href: "/timeline", label: "Timeline" },
  { href: "/trash", label: "Trash" },
];

const mobileMenuItemClassName =
  "flex h-9 cursor-pointer items-center rounded-md px-3 text-sm font-medium text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground";

export function AppBar() {
  const pathname = usePathname();
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
        <Link className="text-base font-semibold tracking-normal" href="/dashboard">
          Goaltree
        </Link>

        <div className="flex items-center gap-2">
          <nav className="hidden items-center gap-1 md:flex" aria-label="Primary navigation">
            {navItems.map((item) => (
              <NavLink item={item} key={item.href} pathname={pathname} />
            ))}
          </nav>
          <SettingsDialog />
          <MobileNavigationMenu onSignOut={handleSignOut} pathname={pathname} />
          <Button
            aria-label="Sign out"
            className="hidden text-muted-foreground hover:text-foreground md:inline-flex"
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

function NavLink({
  item,
  pathname,
}: {
  item: (typeof navItems)[number];
  pathname: string;
}) {
  const isActive = isActivePath(pathname, item.href);

  return (
    <Link
      aria-current={isActive ? "page" : undefined}
      className={cn(
        buttonVariants({ size: "sm", variant: "ghost" }),
        "px-2.5 text-muted-foreground hover:text-foreground",
        isActive &&
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:text-primary-foreground",
      )}
      href={item.href}
    >
      {item.label}
    </Link>
  );
}

function MobileNavigationMenu({
  onSignOut,
  pathname,
}: {
  onSignOut: () => Promise<void>;
  pathname: string;
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button
          aria-label="Open navigation menu"
          className="text-muted-foreground hover:text-foreground md:hidden"
          size="sm"
          type="button"
          variant="ghost"
        >
          <Bars3Icon className="h-5 w-5" aria-hidden="true" />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          className="z-[90] min-w-52 rounded-md border bg-popover p-1 text-popover-foreground shadow-lg"
          sideOffset={8}
        >
          {navItems.map((item) => {
            const isActive = isActivePath(pathname, item.href);

            return (
              <DropdownMenu.Item asChild key={item.href}>
                <Link
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    mobileMenuItemClassName,
                    isActive &&
                      "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                  )}
                  href={item.href}
                >
                  {item.label}
                </Link>
              </DropdownMenu.Item>
            );
          })}
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <DropdownMenu.Item
            className={cn(mobileMenuItemClassName, "gap-2 text-destructive")}
            onSelect={() => {
              void onSignOut();
            }}
          >
            <ArrowRightStartOnRectangleIcon className="h-4 w-4" aria-hidden="true" />
            Sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
