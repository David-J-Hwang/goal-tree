import {
  HeaderPillSkeleton,
  PageLoadingShell,
  PanelSkeleton,
  SummarySkeletonGrid,
} from "@/components/page-loading";

export default function DashboardLoading() {
  return (
    <PageLoadingShell
      headerAction={<HeaderPillSkeleton className="w-32 lg:w-32" />}
      title="Dashboard"
    >
      <SummarySkeletonGrid />

      <section className="mt-4 grid gap-4 xl:min-h-0 xl:flex-1 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.85fr)]">
        <PanelSkeleton className="h-[32rem]" rows={4} titleWidth="w-28" />
        <div className="grid gap-4 xl:min-h-0 xl:grid-rows-3">
          <PanelSkeleton rows={3} titleWidth="w-32" />
          <PanelSkeleton rows={2} titleWidth="w-28" />
          <PanelSkeleton rows={2} titleWidth="w-24" />
        </div>
      </section>
    </PageLoadingShell>
  );
}
