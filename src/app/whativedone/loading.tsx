import {
  PageLoadingShell,
  PanelSkeleton,
  SummarySkeletonGrid,
} from "@/components/page-loading";

export default function WhatIveDoneLoading() {
  return (
    <PageLoadingShell title="What I've Done">
      <SummarySkeletonGrid />

      <section className="mt-4 grid gap-4 xl:min-h-0 xl:flex-1 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.9fr)]">
        <PanelSkeleton className="h-[30rem]" rows={4} titleWidth="w-36" />
        <div className="grid gap-4 xl:min-h-0 xl:grid-rows-2">
          <PanelSkeleton rows={3} titleWidth="w-36" />
          <PanelSkeleton rows={3} titleWidth="w-36" />
        </div>
      </section>
    </PageLoadingShell>
  );
}
