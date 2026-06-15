import {
  HeaderPillSkeleton,
  PageLoadingShell,
  PanelSkeleton,
  SummarySkeletonGrid,
} from "@/components/page-loading";

export default function TrashLoading() {
  return (
    <PageLoadingShell
      headerAction={<HeaderPillSkeleton className="w-44 lg:w-44" />}
      title="Trash"
    >
      <SummarySkeletonGrid />

      <section className="mt-4 grid gap-4 xl:min-h-0 xl:flex-1 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.9fr)]">
        <PanelSkeleton className="h-[32rem]" rows={4} titleWidth="w-32" />
        <div className="grid gap-4 xl:min-h-0 xl:grid-rows-2">
          <PanelSkeleton rows={3} titleWidth="w-28" />
          <PanelSkeleton rows={3} titleWidth="w-36" />
        </div>
      </section>
    </PageLoadingShell>
  );
}
