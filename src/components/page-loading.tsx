import type { ReactNode } from "react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function PageLoadingShell({
  children,
  headerAction,
  maxWidth = "max-w-[1440px]",
  title,
}: {
  children: ReactNode;
  headerAction?: ReactNode;
  maxWidth?: string;
  title: string;
}) {
  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-background px-4 py-5 text-foreground sm:px-6 lg:px-8 xl:h-[calc(100dvh-3.5rem-1px)] xl:min-h-0 xl:overflow-hidden">
      <span className="sr-only">Loading {title}</span>
      <div className={cn("mx-auto flex min-h-0 flex-col xl:h-full", maxWidth)}>
        <header className="flex shrink-0 flex-col gap-4 border-b pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Goaltree</p>
            <h1 className="mt-1 text-2xl font-semibold">{title}</h1>
          </div>
          {headerAction ? <div className="shrink-0">{headerAction}</div> : null}
        </header>

        {children}
      </div>
    </main>
  );
}

export function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-md bg-muted", className)}
    />
  );
}

export function HeaderPillSkeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex h-10 w-full items-center rounded-md border bg-card px-3 shadow-sm lg:w-80",
        className,
      )}
    >
      <SkeletonBlock className="h-4 w-full max-w-44" />
    </div>
  );
}

export function SummarySkeletonGrid() {
  return (
    <section className="mt-5 grid shrink-0 grid-cols-4 gap-2 sm:gap-3">
      {Array.from({ length: 4 }, (_, index) => (
        <Card className="min-w-0 rounded-lg shadow-none" key={index}>
          <CardContent className="flex min-w-0 flex-col gap-1 p-3 sm:p-4">
            <SkeletonBlock className="h-3 w-14 sm:w-20" />
            <SkeletonBlock className="mt-1 h-6 w-8 sm:mt-2" />
          </CardContent>
        </Card>
      ))}
    </section>
  );
}

export function PanelSkeleton({
  className,
  descriptionWidth = "w-40",
  rows = 3,
  titleWidth = "w-32",
}: {
  className?: string;
  descriptionWidth?: string;
  rows?: number;
  titleWidth?: string;
}) {
  return (
    <Card
      className={cn(
        "flex h-64 min-h-0 flex-col overflow-hidden rounded-lg shadow-none xl:h-full",
        className,
      )}
    >
      <CardHeader className="shrink-0 border-b p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <SkeletonBlock className={cn("h-4", titleWidth)} />
            <SkeletonBlock className={cn("h-3", descriptionWidth)} />
          </div>
          <SkeletonBlock className="h-5 w-5 rounded" />
        </div>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 space-y-3 overflow-hidden p-4">
        {Array.from({ length: rows }, (_, index) => (
          <SkeletonListItem key={index} />
        ))}
      </CardContent>
    </Card>
  );
}

export function SkeletonListItem() {
  return (
    <div className="rounded-lg border bg-background p-3">
      <div className="flex items-center justify-between gap-3">
        <SkeletonBlock className="h-4 w-36" />
        <SkeletonBlock className="h-5 w-14 rounded-full" />
      </div>
      <SkeletonBlock className="mt-3 h-3 w-44" />
      <SkeletonBlock className="mt-4 h-2 w-full rounded-full" />
    </div>
  );
}
