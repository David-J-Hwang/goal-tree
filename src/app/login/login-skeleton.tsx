import { SkeletonBlock } from "@/components/page-loading";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function LoginSkeleton() {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center overflow-y-auto bg-background px-4 py-6 text-foreground sm:px-6 md:h-[100dvh] md:min-h-0 md:overflow-hidden md:py-4 lg:px-8">
      <span className="sr-only">Loading login</span>
      <Card className="w-full max-w-[420px] overflow-hidden rounded-lg shadow-none">
        <CardHeader className="border-b p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3">
              <SkeletonBlock className="h-5 w-44" />
              <SkeletonBlock className="h-4 w-52" />
            </div>
            <SkeletonBlock className="h-10 w-10 rounded-full" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3 p-4">
          <SkeletonBlock className="h-11 w-full" />
          <div className="space-y-2">
            <SkeletonBlock className="h-4 w-12" />
            <SkeletonBlock className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <SkeletonBlock className="h-4 w-20" />
            <SkeletonBlock className="h-10 w-full" />
          </div>
          <div className="pt-2">
            <SkeletonBlock className="h-11 w-full" />
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
