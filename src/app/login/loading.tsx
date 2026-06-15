import { SkeletonBlock } from "@/components/page-loading";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function LoginLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-8 text-foreground">
      <span className="sr-only">Loading login</span>
      <Card className="w-full max-w-md overflow-hidden rounded-lg shadow-none">
        <CardHeader className="border-b p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3">
              <SkeletonBlock className="h-5 w-44" />
              <SkeletonBlock className="h-4 w-52" />
            </div>
            <SkeletonBlock className="h-10 w-10 rounded-full" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-5">
          <SkeletonBlock className="h-11 w-full" />
          <div className="space-y-2">
            <SkeletonBlock className="h-4 w-12" />
            <SkeletonBlock className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <SkeletonBlock className="h-4 w-20" />
            <SkeletonBlock className="h-10 w-full" />
          </div>
          <SkeletonBlock className="h-11 w-full" />
        </CardContent>
      </Card>
    </main>
  );
}
