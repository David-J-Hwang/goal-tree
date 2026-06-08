"use client";

import { useMemo, useState } from "react";
import {
  ArrowUturnLeftIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { NodeType } from "@/types/domain";

type TrashFilter = "all" | NodeType;

type TrashedItem = {
  id: string;
  type: NodeType;
  title: string;
  goal?: string;
  plan?: string;
  status: "not_started" | "in_progress" | "blocked" | "done" | "paused";
  trashedAt: string;
  parentTrashed?: {
    type: "goal" | "plan";
    title: string;
  };
};

const trashedItems: TrashedItem[] = [
  {
    id: "trash-goal-health",
    type: "goal",
    title: "건강한 몸 만들기",
    status: "paused",
    trashedAt: "2026-06-09 10:30",
  },
  {
    id: "trash-plan-content",
    type: "plan",
    title: "콘텐츠 업로드 루틴 만들기",
    goal: "경제적 자유",
    status: "not_started",
    trashedAt: "2026-06-08 22:10",
  },
  {
    id: "trash-plan-health",
    type: "plan",
    title: "아침 운동 루틴",
    goal: "건강한 몸 만들기",
    status: "paused",
    trashedAt: "2026-06-09 10:32",
    parentTrashed: {
      type: "goal",
      title: "건강한 몸 만들기",
    },
  },
  {
    id: "trash-task-old-stack",
    type: "task",
    title: "이전 UI 라이브러리 비교표 만들기",
    goal: "경제적 자유",
    plan: "Goaltree MVP 만들기",
    status: "done",
    trashedAt: "2026-06-07 18:40",
  },
  {
    id: "trash-task-feedback",
    type: "task",
    title: "피드백 설문 초안 다시 작성",
    goal: "개발자로 성장하기",
    plan: "사용자 피드백 받기",
    status: "blocked",
    trashedAt: "2026-06-08 09:15",
  },
  {
    id: "trash-task-running",
    type: "task",
    title: "30분 러닝하기",
    goal: "건강한 몸 만들기",
    plan: "아침 운동 루틴",
    status: "not_started",
    trashedAt: "2026-06-09 10:34",
    parentTrashed: {
      type: "plan",
      title: "아침 운동 루틴",
    },
  },
];

const filters: Array<{ value: TrashFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "goal", label: "Goal" },
  { value: "plan", label: "Plan" },
  { value: "task", label: "Task" },
];

export function TrashBoard() {
  const [filter, setFilter] = useState<TrashFilter>("all");

  const visibleItems = useMemo(
    () =>
      trashedItems.filter((item) => filter === "all" || item.type === filter),
    [filter],
  );

  const goalCount = trashedItems.filter((item) => item.type === "goal").length;
  const planCount = trashedItems.filter((item) => item.type === "plan").length;
  const taskCount = trashedItems.filter((item) => item.type === "task").length;
  const blockedRestoreCount = trashedItems.filter((item) => item.parentTrashed).length;

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-background px-4 py-5 text-foreground sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 border-b pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Goaltree</p>
          <h1 className="mt-1 text-2xl font-semibold">Trash</h1>
        </div>
        <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm text-muted-foreground shadow-sm">
          <TrashIcon className="h-4 w-4" aria-hidden="true" />
          <span>{trashedItems.length} trashed items</span>
        </div>
      </header>

      <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryTile label="All" value={String(trashedItems.length)} detail="trashed items" />
        <SummaryTile label="Goals" value={String(goalCount)} detail="top-level items" />
        <SummaryTile label="Plans" value={String(planCount)} detail="under goals" />
        <SummaryTile label="Tasks" value={String(taskCount)} detail="actions" />
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.9fr)]">
        <Card className="rounded-lg shadow-none">
          <CardHeader className="border-b p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="text-base">Trashed Items</CardTitle>
                <CardDescription className="mt-1">
                  {visibleItems.length} items in this view
                </CardDescription>
              </div>
              <SegmentedControl items={filters} value={filter} onChange={setFilter} />
            </div>
          </CardHeader>
          <CardContent className="space-y-3 p-4">
            {visibleItems.map((item) => (
              <TrashItemCard item={item} key={item.id} />
            ))}
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <RestorePolicyPanel blockedRestoreCount={blockedRestoreCount} />
          <PermanentDeletePanel />
        </div>
      </section>
    </main>
  );
}

function SummaryTile({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <Card className="rounded-lg shadow-none">
      <CardContent className="flex items-end justify-between gap-3 p-4">
        <div>
          <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-semibold">{value}</p>
        </div>
        <p className="pb-1 text-right text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

function SegmentedControl<TValue extends string>({
  items,
  value,
  onChange,
}: {
  items: Array<{ value: TValue; label: string }>;
  value: TValue;
  onChange: (value: TValue) => void;
}) {
  return (
    <div className="inline-flex rounded-md border bg-muted/50 p-1">
      {items.map((item) => (
        <button
          className={cn(
            "rounded px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors",
            value === item.value && "bg-background text-foreground shadow-sm",
          )}
          key={item.value}
          onClick={() => onChange(item.value)}
          type="button"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function TrashItemCard({ item }: { item: TrashedItem }) {
  const restoreBlocked = Boolean(item.parentTrashed);

  return (
    <article className="rounded-lg border bg-background p-3">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <TypeBadge type={item.type} />
            <h2 className="text-sm font-medium leading-5">{item.title}</h2>
            <StatusBadge status={item.status} />
          </div>
          <p className="mt-2 truncate text-xs text-muted-foreground">
            {getBreadcrumb(item)}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">Moved to trash: {item.trashedAt}</p>

          {restoreBlocked ? (
            <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800/40 dark:bg-amber-950/25 dark:text-amber-300/85">
              <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                Restore the parent {item.parentTrashed?.type} first: {item.parentTrashed?.title}
              </span>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-start justify-end gap-2">
          <Button
            className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 disabled:border-input disabled:bg-background disabled:text-muted-foreground dark:border-emerald-800/40 dark:bg-emerald-950/25 dark:text-emerald-300/85 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-200"
            disabled={restoreBlocked}
            size="sm"
            variant="outline"
          >
            <ArrowUturnLeftIcon className="h-4 w-4" aria-hidden="true" />
            Restore
          </Button>
          <Button
            className="border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800 dark:border-red-800/40 dark:bg-red-950/25 dark:text-red-300/85 dark:hover:bg-red-950/40 dark:hover:text-red-200"
            size="sm"
            variant="outline"
          >
            <TrashIcon className="h-4 w-4" aria-hidden="true" />
            Delete
          </Button>
        </div>
      </div>
    </article>
  );
}

function RestorePolicyPanel({ blockedRestoreCount }: { blockedRestoreCount: number }) {
  return (
    <Card className="rounded-lg shadow-none">
      <CardHeader className="border-b p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">Restore Rules</CardTitle>
            <CardDescription className="mt-1">
              {blockedRestoreCount} items need parent restore first
            </CardDescription>
          </div>
          <InformationCircleIcon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-4 text-sm text-muted-foreground">
        <PolicyRow label="Goal" value="Restores its child Plans and Tasks" />
        <PolicyRow label="Plan" value="Restore parent Goal first if trashed" />
        <PolicyRow label="Task" value="Restore parent Plan first if trashed" />
      </CardContent>
    </Card>
  );
}

function PermanentDeletePanel() {
  return (
    <Card className="rounded-lg shadow-none">
      <CardHeader className="border-b p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">Permanent Delete</CardTitle>
            <CardDescription className="mt-1">Final deletion happens here</CardDescription>
          </div>
          <ExclamationTriangleIcon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-4 text-sm text-muted-foreground">
        <PolicyRow label="Trash" value="Hidden from normal screens" />
        <PolicyRow label="Paused" value="Still alive and can be resumed" />
        <PolicyRow label="Delete" value="Needs confirmation before DB removal" />
      </CardContent>
    </Card>
  );
}

function PolicyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2">
      <span className="text-xs font-medium text-foreground">{label}</span>
      <span className="text-right text-xs">{value}</span>
    </div>
  );
}

function TypeBadge({ type }: { type: NodeType }) {
  return (
    <span className="rounded-full border bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
      {type}
    </span>
  );
}

function StatusBadge({ status }: { status: TrashedItem["status"] }) {
  const labels = {
    not_started: "시작전",
    in_progress: "진행중",
    blocked: "막힘",
    done: "완료",
    paused: "보류",
  };

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        status === "not_started" &&
          "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700/55 dark:bg-slate-800/45 dark:text-slate-400",
        status === "in_progress" &&
          "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800/40 dark:bg-blue-950/25 dark:text-blue-300/80",
        status === "blocked" &&
          "border-red-200 bg-red-50 text-red-700 dark:border-red-800/40 dark:bg-red-950/25 dark:text-red-300/80",
        status === "done" &&
          "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/25 dark:text-emerald-300/80",
        status === "paused" &&
          "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/40 dark:bg-amber-950/25 dark:text-amber-300/80",
      )}
    >
      {labels[status]}
    </span>
  );
}

function getBreadcrumb(item: TrashedItem) {
  if (item.type === "goal") {
    return "Goal";
  }

  if (item.type === "plan") {
    return item.goal ?? "Goal";
  }

  return `${item.goal ?? "Goal"} / ${item.plan ?? "Plan"}`;
}
