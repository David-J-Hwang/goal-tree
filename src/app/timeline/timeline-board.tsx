"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  addMonths,
  addWeeks,
  addYears,
  differenceInCalendarDays,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from "date-fns";
import {
  CalendarDateRangeIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAppDateString } from "@/lib/date";
import { getWorkspaceNodeHref } from "@/lib/goaltree/workspace-links";
import {
  appPageContentClassName,
  appPageMainClassName,
} from "@/lib/page-layout";
import { cn } from "@/lib/utils";
import type { GoalTreeNode, NodeStatus } from "@/types/domain";

type TimelineMode = "upcoming" | "done";
type RangeView = "week" | "month" | "year";
type TimelineNodeType = "goal" | "plan" | "task";
type TimelineStatus = "scheduled" | "in_progress" | "blocked" | "done" | "paused";
type TimelineRange = {
  start: string;
  end: string;
};
type TimelinePeriod = TimelineRange & {
  label: string;
};

type TimelineItem = {
  id: string;
  type: TimelineNodeType;
  title: string;
  goal: string;
  plan?: string;
  status: TimelineStatus;
  progress?: number;
  plannedStartDate?: string | null;
  plannedEndDate?: string | null;
  actualStartDate?: string;
  actualEndDate?: string;
};

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

export function TimelineBoard({ initialNodes }: { initialNodes: GoalTreeNode[] }) {
  const [timelineMode, setTimelineMode] = useState<TimelineMode>("upcoming");
  const [nodeType, setNodeType] = useState<TimelineNodeType>("task");
  const [rangeView, setRangeView] = useState<RangeView>("month");
  const [periodCursor, setPeriodCursor] = useState(() => getAppDateString());
  const timelineItems = useMemo(() => getTimelineItems(initialNodes), [initialNodes]);
  const periodRange = useMemo(
    () => getPeriodRange(periodCursor, rangeView),
    [periodCursor, rangeView],
  );

  const visibleItems = useMemo(
    () =>
      timelineItems
        .filter((item) => item.type === nodeType)
        .filter((item) =>
          timelineMode === "done" ? item.status === "done" : item.status !== "done",
        )
        .filter((item) => itemOverlapsPeriod(item, timelineMode, periodRange))
        .sort((first, second) =>
          getRangeStart(first, timelineMode).localeCompare(getRangeStart(second, timelineMode)),
        ),
    [nodeType, periodRange, timelineItems, timelineMode],
  );

  const groupedItems = useMemo(
    () =>
      visibleItems.length > 0
        ? [{ key: periodRange.start, label: periodRange.label, items: visibleItems }]
        : [],
    [periodRange, visibleItems],
  );

  const rangeItems = visibleItems.filter((item) => getRangeLength(item, timelineMode) > 1);
  const summaryItems = useMemo(
    () => getStatusSummaryItems(timelineItems, nodeType, periodRange),
    [nodeType, periodRange, timelineItems],
  );

  function handleMovePeriod(direction: -1 | 1) {
    setPeriodCursor((currentCursor) =>
      shiftPeriodCursor(currentCursor, rangeView, direction),
    );
  }

  return (
    <main className={appPageMainClassName}>
      <div className={cn(appPageContentClassName, "max-w-[1440px]")}>
        <header className="flex flex-col gap-4 border-b pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Goaltree</p>
            <h1 className="mt-1 text-2xl font-semibold">Timeline</h1>
          </div>
          <SegmentedControl
            items={rangeViews}
            value={rangeView}
            onChange={setRangeView}
          />
        </header>

        <section className="mt-5 grid grid-cols-4 gap-2 sm:gap-3">
          {summaryItems.map((item) => (
            <SummaryTile
              key={item.label}
              label={item.label}
              value={item.value}
            />
          ))}
        </section>

        <section className="mt-4 grid gap-4 xl:min-h-0 xl:flex-1 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.9fr)]">
          <Card className="flex h-[36rem] min-h-0 flex-col overflow-hidden rounded-lg shadow-none xl:h-full">
            <CardHeader className="shrink-0 border-b p-4">
              <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-center 2xl:justify-between">
                <div className="min-w-0">
                  <CardTitle className="text-base">Timeline Track</CardTitle>
                </div>
                <div className="grid gap-2 sm:flex sm:flex-wrap 2xl:justify-end">
                  <PeriodNavigator
                    label={periodRange.label}
                    rangeView={rangeView}
                    onNext={() => handleMovePeriod(1)}
                    onPrevious={() => handleMovePeriod(-1)}
                  />
                  <div className="grid gap-2 sm:contents">
                    <SegmentedControl
                      buttonClassName="flex-1 px-2 sm:flex-none sm:px-3"
                      className="w-full sm:w-fit"
                      items={timelineModes}
                      value={timelineMode}
                      onChange={setTimelineMode}
                    />
                    <SegmentedControl
                      buttonClassName="flex-1 px-2 sm:flex-none sm:px-3"
                      className="w-full sm:w-fit"
                      items={nodeTypeViews}
                      value={nodeType}
                      onChange={setNodeType}
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 overflow-y-auto p-4">
              {groupedItems.length > 0 ? (
                <div className="space-y-6">
                  {groupedItems.map((group) => (
                    <TimelineGroup group={group} key={group.key} mode={timelineMode} />
                  ))}
                </div>
              ) : (
                <div className="flex min-h-40 flex-col items-center justify-center rounded-md border border-dashed px-4 text-center">
                  <p className="text-sm font-medium">No timeline items yet</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Add planned or actual dates in Workspace to build this view.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 xl:min-h-0 xl:grid-rows-2">
            <RangeOverviewPanel items={rangeItems} mode={timelineMode} nodeType={nodeType} />
            <LegendPanel />
          </div>
        </section>
      </div>
    </main>
  );
}

function SegmentedControl<TValue extends string>({
  buttonClassName,
  className,
  items,
  value,
  onChange,
}: {
  buttonClassName?: string;
  className?: string;
  items: Array<{ value: TValue; label: string }>;
  value: TValue;
  onChange: (value: TValue) => void;
}) {
  return (
    <div
      className={cn(
        "inline-flex w-fit max-w-full shrink-0 self-start rounded-md border bg-muted/50 p-1",
        className,
      )}
    >
      {items.map((item) => (
        <button
          className={cn(
            "rounded px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors",
            buttonClassName,
            value === item.value && "bg-primary text-primary-foreground shadow-sm",
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

function PeriodNavigator({
  label,
  rangeView,
  onNext,
  onPrevious,
}: {
  label: string;
  rangeView: RangeView;
  onNext: () => void;
  onPrevious: () => void;
}) {
  return (
    <div className="inline-flex w-full max-w-full shrink-0 items-center rounded-md border bg-muted/50 p-1 sm:w-fit">
      <button
        aria-label={`Previous ${rangeView}`}
        className="flex h-8 w-8 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
        onClick={onPrevious}
        type="button"
      >
        <ChevronLeftIcon className="h-4 w-4" aria-hidden="true" />
      </button>
      <span className="min-w-0 flex-1 whitespace-nowrap px-2 text-center text-sm font-medium text-foreground sm:min-w-36">
        {label}
      </span>
      <button
        aria-label={`Next ${rangeView}`}
        className="flex h-8 w-8 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
        onClick={onNext}
        type="button"
      >
        <ChevronRightIcon className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

function SummaryTile({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <Card className="min-w-0 rounded-lg shadow-none">
      <CardContent className="flex min-w-0 flex-col gap-1 p-3 sm:p-4">
        <div className="min-w-0">
          <p className="truncate text-[10px] font-medium uppercase text-muted-foreground sm:text-xs">
            {label}
          </p>
          <p className="mt-1 text-xl font-semibold sm:mt-2 sm:text-2xl">{value}</p>
        </div>
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
  return (
    <Link
      className="relative block rounded-lg border bg-background p-3 transition-colors hover:border-primary/50 hover:bg-primary/5"
      href={getWorkspaceNodeHref(item.id)}
    >
      <span className="absolute -left-[1.34rem] top-4 h-2.5 w-2.5 rounded-full border-2 border-background bg-primary" />

      <div className="min-w-0">
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
            <RangeText item={item} mode={mode} />
          </div>

          {item.type !== "task" ? (
            <div className="mt-3">
              <ProgressBar value={item.progress ?? 0} />
            </div>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

function RangeText({ item, mode }: { item: TimelineItem; mode: TimelineMode }) {
  const range = getTimelineRange(item, mode);

  if (!range) {
    return null;
  }

  const rangeLength = getRangeLength(item, mode);

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <CalendarDaysIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>
        {formatRangeLabel(range.start, range.end)},{" "}
        {rangeLength > 1 ? `${rangeLength} days` : "1 day"}
      </span>
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
    <Card className="flex h-64 min-h-0 flex-col overflow-hidden rounded-lg shadow-none xl:h-full">
      <CardHeader className="shrink-0 border-b p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">Range {getNodeTypeLabel(nodeType)}</CardTitle>
            <CardDescription className="mt-1">
              {getNodeTypeLabel(nodeType)} spanning two or more days
            </CardDescription>
          </div>
          <CalendarDateRangeIcon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        </div>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {items.length === 0 ? (
          <div className="rounded-md border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
            No multi-day {nodeType} items in this view
          </div>
        ) : (
          items.map((item) => {
            const range = getTimelineRange(item, mode);

            if (!range) {
              return null;
            }

            return (
              <Link
                className="block rounded-md border bg-background px-3 py-2 transition-colors hover:border-primary/50 hover:bg-primary/5"
                href={getWorkspaceNodeHref(item.id)}
                key={item.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatRangeLabel(range.start, range.end)}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                    {getRangeLength(item, mode)}d
                  </span>
                </div>
              </Link>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

function LegendPanel() {
  return (
    <Card className="flex h-64 min-h-0 flex-col overflow-hidden rounded-lg shadow-none xl:h-full">
      <CardHeader className="shrink-0 border-b p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">Timeline Legend</CardTitle>
            <CardDescription className="mt-1">How to read this page</CardDescription>
          </div>
          <InformationCircleIcon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        </div>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 text-sm text-muted-foreground">
        <LegendRow label="Done" value="Uses actual date range" />
        <LegendRow label="Upcoming" value="Uses planned date range" />
        <LegendRow label="Date range" value="Shows planned or actual span" />
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

function getTimelineItems(nodes: GoalTreeNode[]): TimelineItem[] {
  return nodes
    .filter((node) => isNodeVisible(node, nodes))
    .map((node) => {
      const parentPlan =
        node.type === "task" && node.parentId
          ? nodes.find((item) => item.id === node.parentId)
          : undefined;
      const parentGoal =
        node.type === "plan" && node.parentId
          ? nodes.find((item) => item.id === node.parentId)
          : parentPlan?.parentId
            ? nodes.find((item) => item.id === parentPlan.parentId)
            : undefined;

      return {
        id: node.id,
        type: node.type,
        title: node.title,
        goal: node.type === "goal" ? node.title : parentGoal?.title ?? "Goal",
        plan:
          node.type === "plan"
            ? node.title
            : node.type === "task"
              ? parentPlan?.title ?? "Plan"
              : undefined,
        status: getTimelineStatus(node.status),
        progress: node.type === "task" ? undefined : getNodeProgress(node, nodes),
        plannedStartDate: nullToUndefined(node.plannedStartDate),
        plannedEndDate: nullToUndefined(node.plannedEndDate),
        actualStartDate: nullToUndefined(node.actualStartDate),
        actualEndDate: nullToUndefined(node.actualEndDate),
      };
    });
}

function StatusBadge({ status }: { status: TimelineItem["status"] }) {
  const labels = {
    scheduled: "예정",
    in_progress: "진행중",
    blocked: "막힘",
    done: "완료",
    paused: "보류",
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
        status === "paused" &&
          "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/40 dark:bg-amber-950/25 dark:text-amber-300/80",
      )}
    >
      {labels[status]}
    </span>
  );
}

function getRangeStart(item: TimelineItem, mode: TimelineMode) {
  return getTimelineRange(item, mode)?.start ?? "";
}

function getRangeEnd(item: TimelineItem, mode: TimelineMode) {
  return getTimelineRange(item, mode)?.end ?? "";
}

function getRangeLength(item: TimelineItem, mode: TimelineMode) {
  const range = getTimelineRange(item, mode);

  if (!range) {
    return 0;
  }

  return (
    differenceInCalendarDays(
      parseISO(range.end),
      parseISO(range.start),
    ) + 1
  );
}

function getTimelineRange(item: TimelineItem, mode: TimelineMode): TimelineRange | null {
  const start =
    mode === "done"
      ? item.actualStartDate ?? item.actualEndDate
      : item.plannedStartDate ?? item.plannedEndDate;
  const end =
    mode === "done"
      ? item.actualEndDate ?? item.actualStartDate
      : item.plannedEndDate ?? item.plannedStartDate;

  if (!start || !end) {
    return null;
  }

  return start <= end ? { start, end } : { start: end, end: start };
}

function itemOverlapsPeriod(
  item: TimelineItem,
  mode: TimelineMode,
  period: TimelinePeriod,
) {
  const range = getTimelineRange(item, mode);

  return Boolean(range && rangesOverlap(range, period));
}

function rangesOverlap(range: TimelineRange, period: TimelineRange) {
  return range.start <= period.end && range.end >= period.start;
}

function getPeriodRange(cursor: string, rangeView: RangeView): TimelinePeriod {
  const date = parseISO(cursor);
  const start =
    rangeView === "week"
      ? startOfWeek(date, { weekStartsOn: 1 })
      : rangeView === "month"
        ? startOfMonth(date)
        : startOfYear(date);
  const end =
    rangeView === "week"
      ? endOfWeek(date, { weekStartsOn: 1 })
      : rangeView === "month"
        ? endOfMonth(date)
        : endOfYear(date);
  const startLabel = format(start, "yyyy.MM.dd");
  const endLabel = format(end, "yyyy.MM.dd");

  return {
    start: getLocalDateString(start),
    end: getLocalDateString(end),
    label:
      rangeView === "week"
        ? `${startLabel} - ${endLabel}`
        : rangeView === "month"
          ? format(start, "yyyy.MM")
          : format(start, "yyyy"),
  };
}

function shiftPeriodCursor(cursor: string, rangeView: RangeView, direction: -1 | 1) {
  const date = parseISO(cursor);
  const nextDate =
    rangeView === "week"
      ? addWeeks(date, direction)
      : rangeView === "month"
        ? addMonths(date, direction)
        : addYears(date, direction);

  return getLocalDateString(nextDate);
}

function getLocalDateString(date: Date) {
  return format(date, "yyyy-MM-dd");
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

function getTimelineStatus(status: NodeStatus): TimelineStatus {
  if (status === "not_started") {
    return "scheduled";
  }

  return status;
}

function getNodeProgress(node: GoalTreeNode, nodes: GoalTreeNode[]): number {
  if (node.type === "task") {
    return getStatusProgress(node.status);
  }

  const childType = node.type === "goal" ? "plan" : "task";
  const calculableChildren = nodes.filter(
    (item) =>
      item.type === childType &&
      item.parentId === node.id &&
      item.status !== "paused" &&
      isNodeVisible(item, nodes),
  );

  if (calculableChildren.length === 0) {
    return getStatusProgress(node.status);
  }

  const totalProgress = calculableChildren.reduce(
    (sum, child) => sum + getNodeProgress(child, nodes),
    0,
  );

  return Math.round(totalProgress / calculableChildren.length);
}

function getStatusProgress(status: NodeStatus): number {
  if (status === "done") {
    return 100;
  }

  if (status === "in_progress") {
    return 50;
  }

  return 0;
}

function getStatusSummaryItems(
  items: TimelineItem[],
  nodeType: TimelineNodeType,
  period: TimelinePeriod,
) {
  const filteredItems = items.filter((item) => item.type === nodeType);
  const countByStatus = (status: TimelineStatus) =>
    filteredItems.filter((item) => {
      const mode = status === "done" ? "done" : "upcoming";
      const range = getTimelineRange(item, mode);

      return Boolean(
        item.status === status &&
          range &&
          rangesOverlap(range, period),
      );
    }).length;

  return [
    { label: "Not Started", value: String(countByStatus("scheduled")) },
    { label: "In Progress", value: String(countByStatus("in_progress")) },
    { label: "Blocked", value: String(countByStatus("blocked")) },
    { label: "Done", value: String(countByStatus("done")) },
  ];
}

function isNodeVisible(node: GoalTreeNode, nodes: GoalTreeNode[]): boolean {
  if (node.trashedAt) {
    return false;
  }

  if (!node.parentId) {
    return true;
  }

  const parent = nodes.find((item) => item.id === node.parentId);

  return parent ? isNodeVisible(parent, nodes) : false;
}

function nullToUndefined(value?: string | null) {
  return value ?? undefined;
}

function formatRangeLabel(start: string, end: string) {
  if (start === end) {
    return format(parseISO(start), "yyyy.MM.dd");
  }

  return `${format(parseISO(start), "yyyy.MM.dd")} - ${format(parseISO(end), "yyyy.MM.dd")}`;
}
