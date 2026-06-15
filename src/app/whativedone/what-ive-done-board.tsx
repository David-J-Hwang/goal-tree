"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { endOfWeek, format, isWithinInterval, parseISO, startOfWeek } from "date-fns";
import {
  CalendarDaysIcon,
  CheckCircleIcon,
  Squares2X2Icon,
  TrophyIcon,
} from "@heroicons/react/24/outline";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getWorkspaceNodeHref } from "@/lib/goaltree/workspace-links";
import { cn } from "@/lib/utils";
import type { GoalTreeNode, PlanCategory } from "@/types/domain";

type ViewMode = "day" | "month" | "year";

type Completion = {
  id: string;
  title: string;
  goalId: string;
  goal: string;
  planId: string;
  plan: string;
  category: string;
  completedAt: string;
  memo: string;
};

type Contribution = {
  label: string;
  count: number;
  percentage: number;
};

const viewModes: Array<{ value: ViewMode; label: string }> = [
  { value: "day", label: "Day" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
];

export function WhatIveDoneBoard({
  initialCategories,
  initialNodes,
}: {
  initialCategories: PlanCategory[];
  initialNodes: GoalTreeNode[];
}) {
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const completions = useMemo(
    () => getCompletions(initialNodes, initialCategories),
    [initialCategories, initialNodes],
  );

  const groupedCompletions = useMemo(
    () => groupCompletions(completions, viewMode),
    [completions, viewMode],
  );
  const goalContributions = useMemo(
    () => getContributions(completions, "goal"),
    [completions],
  );
  const planContributions = useMemo(
    () => getContributions(completions, "plan"),
    [completions],
  );
  const summaryItems = useMemo(() => getSummaryItems(completions), [completions]);

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-background px-4 py-5 text-foreground sm:px-6 lg:px-8 xl:h-[calc(100dvh-3.5rem-1px)] xl:min-h-0 xl:overflow-hidden">
      <div className="mx-auto flex min-h-0 max-w-[1440px] flex-col xl:h-full">
        <header className="flex shrink-0 flex-col gap-4 border-b pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Goaltree</p>
            <h1 className="mt-1 text-2xl font-semibold">What I&apos;ve Done</h1>
          </div>
          <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm text-muted-foreground shadow-sm">
            <TrophyIcon className="h-4 w-4" aria-hidden="true" />
            <span>{completions.length} completed tasks</span>
          </div>
        </header>

        <section className="mt-5 grid shrink-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {summaryItems.map((item) => (
            <SummaryTile
              detail={item.detail}
              key={item.label}
              label={item.label}
              value={item.value}
            />
          ))}
        </section>

        <section className="mt-4 grid gap-4 xl:min-h-0 xl:flex-1 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.9fr)]">
          <Card className="flex min-h-0 flex-col overflow-hidden rounded-lg shadow-none">
            <CardHeader className="shrink-0 border-b p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle className="text-base">Completion Log</CardTitle>
                  <CardDescription className="mt-1">
                    Completed Tasks grouped by {viewMode}
                  </CardDescription>
                </div>
                <div className="inline-flex rounded-md border bg-muted/50 p-1">
                  {viewModes.map((mode) => (
                    <button
                      className={cn(
                        "rounded px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors",
                        viewMode === mode.value &&
                          "bg-background text-foreground shadow-sm",
                      )}
                      key={mode.value}
                      onClick={() => setViewMode(mode.value)}
                      type="button"
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
              {groupedCompletions.length > 0 ? (
                groupedCompletions.map((group) => (
                  <CompletionGroup group={group} key={group.key} />
                ))
              ) : (
                <div className="flex min-h-40 flex-col items-center justify-center rounded-md border border-dashed px-4 text-center">
                  <p className="text-sm font-medium">No completed Tasks yet</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Complete Tasks from Dashboard or Workspace to build your log.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 xl:min-h-0 xl:grid-rows-2">
            <ContributionPanel
              description="Completed work grouped by the Goal it supports"
              items={goalContributions}
              title="Goal Contribution"
            />
            <ContributionPanel
              description="Completed work grouped by the Plan it moved forward"
              items={planContributions}
              title="Plan Contribution"
            />
          </div>
        </section>
      </div>
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

function CompletionGroup({
  group,
}: {
  group: { key: string; label: string; items: Completion[] };
}) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">{group.label}</h2>
        <span className="rounded-full border bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
          {group.items.length} done
        </span>
      </div>
      <div className="space-y-2">
        {group.items.map((completion) => (
          <CompletionCard completion={completion} key={completion.id} />
        ))}
      </div>
    </section>
  );
}

function CompletionCard({ completion }: { completion: Completion }) {
  return (
    <Link
      className="block rounded-lg border bg-background p-3 transition-colors hover:border-primary/50 hover:bg-primary/5"
      href={getWorkspaceNodeHref(completion.id)}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <CheckCircleIcon className="h-4 w-4 text-primary" aria-hidden="true" />
          <h3 className="text-sm font-medium leading-5">{completion.title}</h3>
          <span className="rounded-full border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {completion.category}
          </span>
        </div>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{completion.memo}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <CalendarDaysIcon className="h-3.5 w-3.5" aria-hidden="true" />
            {completion.completedAt}
          </span>
          <span>{completion.goal} / {completion.plan}</span>
        </div>
      </div>
    </Link>
  );
}

function ContributionPanel({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: Contribution[];
}) {
  return (
    <Card className="flex min-h-0 flex-col overflow-hidden rounded-lg shadow-none">
      <CardHeader className="shrink-0 border-b p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription className="mt-1">{description}</CardDescription>
          </div>
          <Squares2X2Icon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        </div>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {items.length > 0 ? (
          items.map((item) => (
            <div key={item.label} className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-sm font-medium">{item.label}</p>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {item.count} done
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
            </div>
          ))
        ) : (
          <p className="rounded-md border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
            No contribution data yet
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function getCompletions(
  nodes: GoalTreeNode[],
  categories: PlanCategory[],
): Completion[] {
  return nodes
    .filter(
      (node) =>
        node.type === "task" &&
        node.status === "done" &&
        Boolean(node.actualEndDate) &&
        isNodeVisible(node, nodes),
    )
    .map((task) => {
      const plan = task.parentId
        ? nodes.find((node) => node.id === task.parentId)
        : undefined;
      const goal = plan?.parentId
        ? nodes.find((node) => node.id === plan.parentId)
        : undefined;
      const category = categories.find((item) => item.id === plan?.categoryId);

      return {
        id: task.id,
        title: task.title,
        goalId: goal?.id ?? "",
        goal: goal?.title ?? "Goal",
        planId: plan?.id ?? "",
        plan: plan?.title ?? "Plan",
        category: category?.name ?? "No category",
        completedAt: task.actualEndDate ?? "",
        memo: task.memo ?? "",
      };
    })
    .sort((first, second) => {
      const dateComparison = second.completedAt.localeCompare(first.completedAt);

      if (dateComparison !== 0) {
        return dateComparison;
      }

      return second.id.localeCompare(first.id);
    });
}

function getSummaryItems(completions: Completion[]) {
  const today = getLocalDateString(new Date());
  const currentDate = parseISO(today);
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const currentMonth = today.slice(0, 7);
  const todayCount = completions.filter(
    (completion) => completion.completedAt === today,
  ).length;
  const weekCount = completions.filter((completion) =>
    isWithinInterval(parseISO(completion.completedAt), {
      start: weekStart,
      end: weekEnd,
    }),
  ).length;
  const monthCount = completions.filter((completion) =>
    completion.completedAt.startsWith(currentMonth),
  ).length;
  const goalCount = new Set(
    completions.map((completion) => completion.goalId || completion.goal),
  ).size;

  return [
    { label: "Today", value: String(todayCount), detail: "completed tasks" },
    { label: "This Week", value: String(weekCount), detail: "visible progress" },
    { label: "This Month", value: String(monthCount), detail: "done records" },
    { label: "Goals", value: String(goalCount), detail: "contributed" },
  ];
}

function groupCompletions(items: Completion[], viewMode: ViewMode) {
  const groups = new Map<string, Completion[]>();

  items.forEach((item) => {
    const date = parseISO(item.completedAt);
    const key =
      viewMode === "day"
        ? format(date, "yyyy-MM-dd")
        : viewMode === "month"
          ? format(date, "yyyy-MM")
          : format(date, "yyyy");

    groups.set(key, [...(groups.get(key) ?? []), item]);
  });

  return Array.from(groups.entries())
    .sort(([firstKey], [secondKey]) => secondKey.localeCompare(firstKey))
    .map(([key, groupItems]) => ({
      key,
      label: getGroupLabel(key, viewMode),
      items: groupItems.sort((first, second) =>
        second.completedAt.localeCompare(first.completedAt),
      ),
    }));
}

function getGroupLabel(key: string, viewMode: ViewMode) {
  if (viewMode === "day") {
    return key;
  }

  if (viewMode === "month") {
    const [year, month] = key.split("-");
    return `${year}.${month}`;
  }

  return key;
}

function getContributions(items: Completion[], property: "goal" | "plan") {
  const counts = new Map<string, { label: string; count: number }>();

  items.forEach((item) => {
    const key =
      property === "goal"
        ? item.goalId || item.goal
        : item.planId || item.plan;
    const currentItem = counts.get(key);

    counts.set(key, {
      label: item[property],
      count: (currentItem?.count ?? 0) + 1,
    });
  });

  return Array.from(counts.values())
    .sort((firstItem, secondItem) => secondItem.count - firstItem.count)
    .map(({ label, count }) => ({
      label,
      count,
      percentage: Math.round((count / items.length) * 100),
    }));
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

function getLocalDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
