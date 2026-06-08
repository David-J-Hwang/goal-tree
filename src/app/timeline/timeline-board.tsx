"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { differenceInCalendarDays, format, parseISO } from "date-fns";
import {
  ArrowTopRightOnSquareIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ClockIcon,
  FlagIcon,
  QueueListIcon,
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

type TimelineMode = "upcoming" | "done";
type RangeView = "week" | "month" | "year";
type TimelineNodeType = "goal" | "plan" | "task";

type TimelineItem = {
  id: string;
  type: TimelineNodeType;
  title: string;
  goal: string;
  plan?: string;
  status: "scheduled" | "in_progress" | "blocked" | "done";
  progress?: number;
  plannedStartDate: string;
  plannedEndDate: string;
  actualStartDate?: string;
  actualEndDate?: string;
};

const timelineItems: TimelineItem[] = [
  {
    id: "timeline-goal-finance",
    type: "goal",
    title: "경제적 자유",
    goal: "경제적 자유",
    status: "in_progress",
    progress: 36,
    plannedStartDate: "2026-06-01",
    plannedEndDate: "2026-12-31",
  },
  {
    id: "timeline-goal-growth",
    type: "goal",
    title: "개발자로 성장하기",
    goal: "개발자로 성장하기",
    status: "in_progress",
    progress: 28,
    plannedStartDate: "2026-05-01",
    plannedEndDate: "2026-10-31",
  },
  {
    id: "timeline-goal-launch",
    type: "goal",
    title: "첫 제품 출시하기",
    goal: "첫 제품 출시하기",
    status: "done",
    progress: 100,
    plannedStartDate: "2026-01-01",
    plannedEndDate: "2026-03-31",
    actualStartDate: "2026-01-06",
    actualEndDate: "2026-03-28",
  },
  {
    id: "timeline-plan-goaltree",
    type: "plan",
    title: "Goaltree MVP 만들기",
    goal: "경제적 자유",
    plan: "Goaltree MVP 만들기",
    status: "in_progress",
    progress: 62,
    plannedStartDate: "2026-06-08",
    plannedEndDate: "2026-06-21",
  },
  {
    id: "timeline-plan-feedback",
    type: "plan",
    title: "사용자 피드백 받기",
    goal: "개발자로 성장하기",
    plan: "사용자 피드백 받기",
    status: "blocked",
    progress: 15,
    plannedStartDate: "2026-06-18",
    plannedEndDate: "2026-07-15",
  },
  {
    id: "timeline-plan-first-release",
    type: "plan",
    title: "첫 배포 준비",
    goal: "첫 제품 출시하기",
    plan: "첫 배포 준비",
    status: "done",
    progress: 100,
    plannedStartDate: "2026-02-01",
    plannedEndDate: "2026-03-31",
    actualStartDate: "2026-02-03",
    actualEndDate: "2026-03-28",
  },
  {
    id: "timeline-dashboard",
    type: "task",
    title: "Dashboard mock UI 확인",
    goal: "경제적 자유",
    plan: "Goaltree MVP 만들기",
    status: "done",
    plannedStartDate: "2026-06-09",
    plannedEndDate: "2026-06-09",
    actualStartDate: "2026-06-09",
    actualEndDate: "2026-06-09",
  },
  {
    id: "timeline-whativedone",
    type: "task",
    title: "What I've Done 기록장 UI 확인",
    goal: "경제적 자유",
    plan: "Goaltree MVP 만들기",
    status: "done",
    plannedStartDate: "2026-06-09",
    plannedEndDate: "2026-06-09",
    actualStartDate: "2026-06-09",
    actualEndDate: "2026-06-09",
  },
  {
    id: "timeline-workspace",
    type: "task",
    title: "Workspace UX 정리",
    goal: "경제적 자유",
    plan: "Goaltree MVP 만들기",
    status: "done",
    plannedStartDate: "2026-06-08",
    plannedEndDate: "2026-06-08",
    actualStartDate: "2026-06-08",
    actualEndDate: "2026-06-08",
  },
  {
    id: "timeline-schema",
    type: "task",
    title: "Supabase 테이블 구조 설계",
    goal: "경제적 자유",
    plan: "Goaltree MVP 만들기",
    status: "scheduled",
    plannedStartDate: "2026-06-10",
    plannedEndDate: "2026-06-12",
  },
  {
    id: "timeline-auth",
    type: "task",
    title: "이메일 로그인 플로우 만들기",
    goal: "경제적 자유",
    plan: "Goaltree MVP 만들기",
    status: "scheduled",
    plannedStartDate: "2026-06-13",
    plannedEndDate: "2026-06-14",
  },
  {
    id: "timeline-todo-link",
    type: "task",
    title: "Today TODO와 Task 완료 규칙 연결",
    goal: "경제적 자유",
    plan: "Goaltree MVP 만들기",
    status: "in_progress",
    plannedStartDate: "2026-06-15",
    plannedEndDate: "2026-06-17",
  },
  {
    id: "timeline-feedback",
    type: "task",
    title: "초기 사용자 피드백 받기",
    goal: "개발자로 성장하기",
    plan: "사용자 피드백 받기",
    status: "blocked",
    plannedStartDate: "2026-06-18",
    plannedEndDate: "2026-06-21",
  },
  {
    id: "timeline-first-release",
    type: "task",
    title: "MVP 첫 배포 준비",
    goal: "경제적 자유",
    plan: "작은 수익형 웹서비스 확보",
    status: "scheduled",
    plannedStartDate: "2026-07-01",
    plannedEndDate: "2026-07-07",
  },
];

const timelineModes: Array<{ value: TimelineMode; label: string }> = [
  { value: "upcoming", label: "Upcoming" },
  { value: "done", label: "Done" },
];

const rangeViews: Array<{ value: RangeView; label: string }> = [
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
];

const nodeTypeViews: Array<{ value: TimelineNodeType; label: string }> = [
  { value: "goal", label: "Goal" },
  { value: "plan", label: "Plan" },
  { value: "task", label: "Task" },
];

export function TimelineBoard() {
  const [timelineMode, setTimelineMode] = useState<TimelineMode>("upcoming");
  const [nodeType, setNodeType] = useState<TimelineNodeType>("task");
  const [rangeView, setRangeView] = useState<RangeView>("month");

  const visibleItems = useMemo(
    () =>
      timelineItems
        .filter((item) => item.type === nodeType)
        .filter((item) =>
          timelineMode === "done" ? item.status === "done" : item.status !== "done",
        )
        .sort((first, second) =>
          getRangeStart(first, timelineMode).localeCompare(
            getRangeStart(second, timelineMode),
          ),
        ),
    [nodeType, timelineMode],
  );

  const groupedItems = useMemo(
    () => groupTimelineItems(visibleItems, timelineMode, rangeView),
    [rangeView, timelineMode, visibleItems],
  );

  const rangeItems = visibleItems.filter((item) => getRangeLength(item, timelineMode) > 1);

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-background px-4 py-5 text-foreground sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 border-b pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Goaltree</p>
          <h1 className="mt-1 text-2xl font-semibold">Timeline</h1>
        </div>
        <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm text-muted-foreground shadow-sm">
          <CalendarDaysIcon className="h-4 w-4" aria-hidden="true" />
          <span>{rangeViewLabel(rangeView)}</span>
        </div>
      </header>

      <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryTile label="Visible" value={String(visibleItems.length)} detail={`${nodeType} items`} />
        <SummaryTile label="Ranges" value={String(rangeItems.length)} detail="multi-day items" />
        <SummaryTile label="Upcoming" value={String(countItems(nodeType, "upcoming"))} detail="planned items" />
        <SummaryTile label="Done" value={String(countItems(nodeType, "done"))} detail="completed items" />
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.9fr)]">
        <Card className="rounded-lg shadow-none">
          <CardHeader className="border-b p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle className="text-base">Timeline Track</CardTitle>
                <CardDescription className="mt-1">
                  {timelineMode === "done" ? "Actual date ranges" : "Planned date ranges"}
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <SegmentedControl
                  items={timelineModes}
                  value={timelineMode}
                  onChange={setTimelineMode}
                />
                <SegmentedControl
                  items={nodeTypeViews}
                  value={nodeType}
                  onChange={setNodeType}
                />
                <SegmentedControl
                  items={rangeViews}
                  value={rangeView}
                  onChange={setRangeView}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-6">
              {groupedItems.map((group) => (
                <TimelineGroup group={group} key={group.key} mode={timelineMode} />
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <RangeOverviewPanel items={rangeItems} mode={timelineMode} nodeType={nodeType} />
          <LegendPanel />
        </div>
      </section>
    </main>
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

function TimelineGroup({
  group,
  mode,
}: {
  group: { key: string; label: string; items: TimelineItem[] };
  mode: TimelineMode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">{group.label}</h2>
        <span className="rounded-full border bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
          {group.items.length} items
        </span>
      </div>

      <div className="relative space-y-3 border-l pl-4">
        {group.items.map((item) => (
          <TimelineItemCard item={item} key={item.id} mode={mode} />
        ))}
      </div>
    </section>
  );
}

function TimelineItemCard({ item, mode }: { item: TimelineItem; mode: TimelineMode }) {
  const rangeLength = getRangeLength(item, mode);
  const isRange = rangeLength > 1;

  return (
    <Link
      className={cn(
        "relative block rounded-lg border bg-background p-3 transition-colors hover:border-primary/50 hover:bg-primary/5",
        isRange && "bg-primary/5",
      )}
      href="/workspace"
    >
      <span className="absolute -left-[1.34rem] top-4 h-2.5 w-2.5 rounded-full border-2 border-background bg-primary" />

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {mode === "done" ? (
              <CheckCircleIcon className="h-4 w-4 text-primary" aria-hidden="true" />
            ) : (
              <ClockIcon className="h-4 w-4 text-primary" aria-hidden="true" />
            )}
            <h3 className="text-sm font-medium leading-5">{item.title}</h3>
            <StatusBadge status={item.status} />
          </div>

          <p className="mt-2 truncate text-xs text-muted-foreground">
            {getBreadcrumb(item)}
          </p>

          <div className="mt-3">
            <RangeBar item={item} mode={mode} />
          </div>

          {item.type !== "task" ? (
            <div className="mt-3">
              <ProgressBar value={item.progress ?? 0} />
            </div>
          ) : null}
        </div>

        <div className="flex items-start justify-end">
          <Button asChild size="sm" variant="ghost">
            <span>
              <ArrowTopRightOnSquareIcon className="h-4 w-4" aria-hidden="true" />
              Workspace
            </span>
          </Button>
        </div>
      </div>
    </Link>
  );
}

function RangeBar({ item, mode }: { item: TimelineItem; mode: TimelineMode }) {
  const start = getRangeStart(item, mode);
  const end = getRangeEnd(item, mode);
  const rangeLength = getRangeLength(item, mode);
  const width = Math.min(100, Math.max(28, rangeLength * 16));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <CalendarDaysIcon className="h-3.5 w-3.5" aria-hidden="true" />
        <span>{formatRangeLabel(start, end)}</span>
        {rangeLength > 1 ? <span>{rangeLength} days</span> : <span>1 day</span>}
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full",
            mode === "done" ? "bg-primary" : "bg-accent",
          )}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>Progress</span>
        <span>{value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function RangeOverviewPanel({
  items,
  mode,
  nodeType,
}: {
  items: TimelineItem[];
  mode: TimelineMode;
  nodeType: TimelineNodeType;
}) {
  return (
    <Card className="rounded-lg shadow-none">
      <CardHeader className="border-b p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">Range {getNodeTypeLabel(nodeType)}</CardTitle>
            <CardDescription className="mt-1">
              {getNodeTypeLabel(nodeType)} spanning two or more days
            </CardDescription>
          </div>
          <QueueListIcon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-4">
        {items.length === 0 ? (
          <div className="rounded-md border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
            No multi-day {nodeType} items in this view
          </div>
        ) : (
          items.map((item) => (
            <Link
              className="block rounded-md border bg-background px-3 py-2 transition-colors hover:border-primary/50 hover:bg-primary/5"
              href="/workspace"
              key={item.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{item.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatRangeLabel(getRangeStart(item, mode), getRangeEnd(item, mode))}
                  </p>
                </div>
                <span className="shrink-0 rounded-full border bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                  {getRangeLength(item, mode)}d
                </span>
              </div>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function LegendPanel() {
  return (
    <Card className="rounded-lg shadow-none">
      <CardHeader className="border-b p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">Timeline Legend</CardTitle>
            <CardDescription className="mt-1">How to read this page</CardDescription>
          </div>
          <FlagIcon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-4 text-sm text-muted-foreground">
        <LegendRow label="Done" value="Uses actual date range" />
        <LegendRow label="Upcoming" value="Uses planned date range" />
        <LegendRow label="Range bar" value="Shows multi-day span" />
      </CardContent>
    </Card>
  );
}

function LegendRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2">
      <span className="text-xs font-medium text-foreground">{label}</span>
      <span className="text-right text-xs">{value}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: TimelineItem["status"] }) {
  const labels = {
    scheduled: "예정",
    in_progress: "진행중",
    blocked: "막힘",
    done: "완료",
  };

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        status === "scheduled" &&
          "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700/55 dark:bg-slate-800/45 dark:text-slate-400",
        status === "in_progress" &&
          "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800/40 dark:bg-blue-950/25 dark:text-blue-300/80",
        status === "blocked" &&
          "border-red-200 bg-red-50 text-red-700 dark:border-red-800/40 dark:bg-red-950/25 dark:text-red-300/80",
        status === "done" &&
          "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/25 dark:text-emerald-300/80",
      )}
    >
      {labels[status]}
    </span>
  );
}

function groupTimelineItems(
  items: TimelineItem[],
  mode: TimelineMode,
  rangeView: RangeView,
) {
  const groups = new Map<string, TimelineItem[]>();

  items.forEach((item) => {
    const date = parseISO(getRangeStart(item, mode));
    const key =
      rangeView === "week"
        ? format(date, "yyyy-'W'II")
        : rangeView === "month"
          ? format(date, "yyyy-MM")
          : format(date, "yyyy");

    groups.set(key, [...(groups.get(key) ?? []), item]);
  });

  return Array.from(groups.entries())
    .sort(([firstKey], [secondKey]) => firstKey.localeCompare(secondKey))
    .map(([key, groupItems]) => ({
      key,
      label: getGroupLabel(key, rangeView),
      items: groupItems,
    }));
}

function getGroupLabel(key: string, rangeView: RangeView) {
  if (rangeView === "week") {
    return key.replace("-W", " Week ");
  }

  if (rangeView === "month") {
    const [year, month] = key.split("-");
    return `${year}.${month}`;
  }

  return key;
}

function getRangeStart(item: TimelineItem, mode: TimelineMode) {
  return mode === "done"
    ? item.actualStartDate ?? item.actualEndDate ?? item.plannedStartDate
    : item.plannedStartDate;
}

function getRangeEnd(item: TimelineItem, mode: TimelineMode) {
  return mode === "done"
    ? item.actualEndDate ?? item.actualStartDate ?? item.plannedEndDate
    : item.plannedEndDate;
}

function getRangeLength(item: TimelineItem, mode: TimelineMode) {
  return (
    differenceInCalendarDays(
      parseISO(getRangeEnd(item, mode)),
      parseISO(getRangeStart(item, mode)),
    ) + 1
  );
}

function getBreadcrumb(item: TimelineItem) {
  if (item.type === "goal") {
    return "Goal";
  }

  if (item.type === "plan") {
    return item.goal;
  }

  return `${item.goal} / ${item.plan}`;
}

function getNodeTypeLabel(nodeType: TimelineNodeType) {
  return nodeType === "goal" ? "Goals" : nodeType === "plan" ? "Plans" : "Tasks";
}

function countItems(nodeType: TimelineNodeType, mode: TimelineMode) {
  return timelineItems.filter(
    (item) =>
      item.type === nodeType &&
      (mode === "done" ? item.status === "done" : item.status !== "done"),
  ).length;
}

function formatRangeLabel(start: string, end: string) {
  if (start === end) {
    return format(parseISO(start), "MMM d");
  }

  return `${format(parseISO(start), "MMM d")} - ${format(parseISO(end), "MMM d")}`;
}

function rangeViewLabel(rangeView: RangeView) {
  return rangeView === "week"
    ? "Weekly view"
    : rangeView === "month"
      ? "Monthly view"
      : "Yearly view";
}
