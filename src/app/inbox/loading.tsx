import {
  PageLoadingShell,
  PanelSkeleton,
} from "@/components/page-loading";

export default function InboxLoading() {
  return (
    <PageLoadingShell title="Inbox">
      <section className="mt-5 grid gap-4 xl:min-h-0 xl:flex-1 xl:grid-cols-[minmax(0,1fr)_minmax(340px,420px)]">
        <PanelSkeleton className="h-[32rem]" rows={5} titleWidth="w-28" />
        <PanelSkeleton className="h-[32rem]" rows={4} titleWidth="w-20" />
      </section>
    </PageLoadingShell>
  );
}
