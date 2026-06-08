"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import {
  ArrowTopRightOnSquareIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  Squares2X2Icon,
  TrophyIcon,
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

type ViewMode = "day" | "month" | "year";

type Completion = {
  id: string;
  title: string;
  goal: string;
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

const completions: Completion[] = [
  {
    id: "done-dashboard-mock",
    title: "Dashboard mock UI 구성",
    goal: "경제적 자유",
    plan: "Goaltree MVP 만들기",
    category: "웹개발",
    completedAt: "2026-06-09",
    memo: "Today TODO와 This Week Focus의 첫 화면 흐름을 확인했다.",
  },
  {
    id: "done-badge-tone",
    title: "다크모드 상태 배지 톤 조정",
    goal: "경제적 자유",
    plan: "Goaltree MVP 만들기",
    category: "웹개발",
    completedAt: "2026-06-09",
    memo: "상태 의미는 유지하고 카드 본문보다 덜 튀게 만들었다.",
  },
  {
    id: "done-workspace-ux",
    title: "Workspace 카드 선택 UX 정리",
    goal: "경제적 자유",
    plan: "Goaltree MVP 만들기",
    category: "웹개발",
    completedAt: "2026-06-08",
    memo: "Goal 선택 시 Plan 자동 활성화를 막고 빈 상태 문구를 정리했다.",
  },
  {
    id: "done-drag-soft-clamp",
    title: "드래그 경계 soft clamp 적용",
    goal: "경제적 자유",
    plan: "Goaltree MVP 만들기",
    category: "웹개발",
    completedAt: "2026-06-08",
    memo: "카드가 섹션 밖으로 크게 벗어나지 않으면서 부드럽게 움직이도록 조정했다.",
  },
  {
    id: "done-project-docs",
    title: "README와 CODEX 문서 정리",
    goal: "경제적 자유",
    plan: "Goaltree MVP 만들기",
    category: "문서",
    completedAt: "2026-06-07",
    memo: "다른 세션에서도 프로젝트 맥락을 바로 읽을 수 있게 정리했다.",
  },
  {
    id: "done-research-feedback",
    title: "초기 피드백 질문 초안 작성",
    goal: "개발자로 성장하기",
    plan: "사용자 피드백 받기",
    category: "외부활동",
    completedAt: "2026-05-30",
    memo: "MVP를 보여줄 때 확인할 질문을 정리했다.",
  },
  {
    id: "done-next-study",
    title: "Next.js App Router 구조 복습",
    goal: "개발자로 성장하기",
    plan: "Next.js 공부하기",
    category: "공부",
    completedAt: "2026-05-18",
    memo: "라우트와 레이아웃 구성 방식을 다시 확인했다.",
  },
  {
    id: "done-annual-plan",
    title: "2026년 제품 개발 목표 정리",
    goal: "경제적 자유",
    plan: "작은 수익형 웹서비스 확보",
    category: "사업",
    completedAt: "2026-01-12",
    memo: "작게 출시하고 피드백을 받는 방향으로 정리했다.",
  },
];

const viewModes: Array<{ value: ViewMode; label: string }> = [
  { value: "day", label: "Day" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
];

export function WhatIveDoneBoard() {
  const [viewMode, setViewMode] = useState<ViewMode>("day");

  const groupedCompletions = useMemo(
    () => groupCompletions(completions, viewMode),
    [viewMode],
  );
  const goalContributions = useMemo(
    () => getContributions(completions, "goal"),
    [],
  );
  const planContributions = useMemo(
    () => getContributions(completions, "plan"),
    [],
  );

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-background px-4 py-5 text-foreground sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 border-b pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Goaltree</p>
          <h1 className="mt-1 text-2xl font-semibold">What I&apos;ve Done</h1>
        </div>
        <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm text-muted-foreground shadow-sm">
          <TrophyIcon className="h-4 w-4" aria-hidden="true" />
          <span>{completions.length} completed tasks</span>
        </div>
      </header>

      <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryTile label="Today" value="2" detail="completed tasks" />
        <SummaryTile label="This Week" value="5" detail="visible progress" />
        <SummaryTile label="This Month" value="7" detail="done records" />
        <SummaryTile label="Goals" value="2" detail="contributed" />
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.9fr)]">
        <Card className="rounded-lg shadow-none">
          <CardHeader className="border-b p-4">
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
          <CardContent className="space-y-5 p-4">
            {groupedCompletions.map((group) => (
              <CompletionGroup group={group} key={group.key} />
            ))}
          </CardContent>
        </Card>

        <div className="grid gap-4">
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
      href="/workspace"
    >
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
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
    <Card className="rounded-lg shadow-none">
      <CardHeader className="border-b p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription className="mt-1">{description}</CardDescription>
          </div>
          <Squares2X2Icon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        {items.map((item) => (
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
        ))}
      </CardContent>
    </Card>
  );
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
  const counts = new Map<string, number>();

  items.forEach((item) => {
    counts.set(item[property], (counts.get(item[property]) ?? 0) + 1);
  });

  return Array.from(counts.entries())
    .sort(([, firstCount], [, secondCount]) => secondCount - firstCount)
    .map(([label, count]) => ({
      label,
      count,
      percentage: Math.round((count / items.length) * 100),
    }));
}
