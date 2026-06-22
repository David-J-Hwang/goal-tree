import {
  HeaderPillSkeleton,
  PageLoadingShell,
  SkeletonBlock,
  SkeletonListItem,
} from "@/components/page-loading";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function WorkspaceLoading() {
  return (
    <PageLoadingShell
      headerAction={<HeaderPillSkeleton />}
      headerActionWrapperClassName="w-full lg:w-auto"
      headerContentClassName="2xl:mx-auto 2xl:max-w-[1708px]"
      maxWidth="max-w-[1800px]"
      title="Workspace"
    >
      <section className="mt-5 grid gap-4 xl:min-h-0 xl:flex-1 xl:grid-cols-[minmax(230px,1fr)_minmax(260px,1fr)_minmax(280px,1fr)_360px] 2xl:grid-cols-[minmax(300px,380px)_minmax(360px,460px)_minmax(320px,420px)_minmax(340px,400px)] 2xl:justify-center">
        <WorkspaceColumnSkeleton rows={4} titleWidth="w-16" />
        <WorkspaceColumnSkeleton rows={3} titleWidth="w-16" />
        <WorkspaceColumnSkeleton rows={2} titleWidth="w-16" />
        <DetailsSkeleton />
      </section>
    </PageLoadingShell>
  );
}

function WorkspaceColumnSkeleton({
  rows,
  titleWidth,
}: {
  rows: number;
  titleWidth: string;
}) {
  return (
    <Card className="flex h-[26rem] min-h-0 flex-col overflow-hidden rounded-lg shadow-none xl:h-full">
      <CardHeader className="shrink-0 border-b p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <SkeletonBlock className={`h-4 ${titleWidth}`} />
            <SkeletonBlock className="h-3 w-28" />
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

function DetailsSkeleton() {
  return (
    <Card className="flex h-[36rem] min-h-0 flex-col overflow-hidden rounded-lg shadow-none xl:h-full">
      <CardHeader className="shrink-0 border-b p-4">
        <SkeletonBlock className="h-4 w-20" />
        <div className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2">
          <SkeletonBlock className="h-8 w-12" />
          <SkeletonBlock className="h-9 w-full" />
        </div>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 space-y-4 overflow-hidden p-4">
        <SkeletonBlock className="h-10 w-full" />
        <SkeletonBlock className="h-8 w-full" />
        <SkeletonBlock className="h-20 w-full" />
        <SkeletonBlock className="h-20 w-full" />
        <SkeletonBlock className="h-28 w-full" />
      </CardContent>
    </Card>
  );
}
