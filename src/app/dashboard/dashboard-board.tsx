"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowPathIcon,
  CalendarDaysIcon,
  CheckIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  Squares2X2Icon,
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

type TodoItem = {
  id: string;
  title: string;
  goal: string;
  plan: string;
  status: "not_started" | "in_progress" | "blocked";
  done: boolean;
};

type FocusItem = {
  id: string;
  title: string;
  goal: string;
  plan: string;
  progress: number;
  dueLabel: string;
};

type InsightItem = {
  id: string;
  title: string;
  meta: string;
  tone: "blocked" | "done";
};

const initialTodos: TodoItem[] = [
  {
    id: "todo-dashboard-wireframe",
    title: "Dashboard mock UI 다듬기",
    goal: "경제적 자유",
    plan: "Goaltree MVP 만들기",
    status: "in_progress",
    done: false,
  },
  {
    id: "todo-status-design",
    title: "상태 배지 다크모드 확인",
    goal: "경제적 자유",
    plan: "Goaltree MVP 만들기",
    status: "not_started",
    done: false,
  },
  {
    id: "todo-supabase-plan",
    title: "Supabase 테이블 초안 정리",
    goal: "경제적 자유",
    plan: "작은 수익형 웹서비스 확보",
    status: "not_started",
    done: false,
  },
  {
    id: "todo-feedback-note",
    title: "사용자 피드백 질문 목록 만들기",
    goal: "경제적 자유",
    plan: "사용자 피드백 받기",
    status: "blocked",
    done: false,
  },
];

const focusItems: FocusItem[] = [
  {
    id: "focus-dashboard",
    title: "Dashboard 흐름 확정",
    goal: "경제적 자유",
    plan: "Goaltree MVP 만들기",
    progress: 45,
    dueLabel: "This week",
  },
  {
    id: "focus-workspace",
    title: "Workspace UX 잠금",
    goal: "경제적 자유",
    plan: "Goaltree MVP 만들기",
    progress: 80,
    dueLabel: "Nearly done",
  },
  {
    id: "focus-schema",
    title: "DB 구조 준비",
    goal: "경제적 자유",
    plan: "Goaltree MVP 만들기",
    progress: 20,
    dueLabel: "Next",
  },
];

const blockedItems: InsightItem[] = [
  {
    id: "blocked-feedback",
    title: "피드백 받을 사용자 후보 정리",
    meta: "사용자 피드백 받기",
    tone: "blocked",
  },
  {
    id: "blocked-auth",
    title: "이메일 로그인 플로우 세부 결정",
    meta: "Supabase Auth",
    tone: "blocked",
  },
];

const completionItems: InsightItem[] = [
  {
    id: "done-workspace-dnd",
    title: "Workspace 카드 드래그 UX 조정",
    meta: "Goaltree MVP 만들기",
    tone: "done",
  },
  {
    id: "done-dark-mode",
    title: "다크모드와 상태 배지 톤 정리",
    meta: "공통 UI",
    tone: "done",
  },
];

const showOptionalPanels = true;

export function DashboardBoard() {
  const [todos, setTodos] = useState(initialTodos);

  const completedCount = todos.filter((todo) => todo.done).length;
  const blockedCount = todos.filter((todo) => todo.status === "blocked" && !todo.done).length;
  const openCount = todos.length - completedCount;

  const summaryItems = useMemo(
    () => [
      { label: "Today", value: String(todos.length), detail: "scheduled tasks" },
      { label: "Open", value: String(openCount), detail: "remaining" },
      { label: "Done", value: String(completedCount), detail: "completed today" },
      { label: "Blocked", value: String(blockedCount), detail: "needs attention" },
    ],
    [blockedCount, completedCount, openCount, todos.length],
  );

  function handleToggleTodo(id: string) {
    setTodos((currentTodos) =>
      currentTodos.map((todo) =>
        todo.id === id ? { ...todo, done: !todo.done } : todo,
      ),
    );
  }

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-background px-4 py-5 text-foreground sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 border-b pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Goaltree</p>
          <h1 className="mt-1 text-2xl font-semibold">Dashboard</h1>
        </div>
        <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm text-muted-foreground shadow-sm">
          <CalendarDaysIcon className="h-4 w-4" aria-hidden="true" />
          <span>Today</span>
        </div>
      </header>

      <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {summaryItems.map((item) => (
          <SummaryTile
            detail={item.detail}
            key={item.label}
            label={item.label}
            value={item.value}
          />
        ))}
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.85fr)]">
        <TodayTodoPanel todos={todos} onToggleTodo={handleToggleTodo} />

        <div className="grid gap-4">
          <ThisWeekFocusPanel items={focusItems} />
          {showOptionalPanels ? (
            <OptionalDashboardPanels
              blockedItems={blockedItems}
              completionItems={completionItems}
            />
          ) : null}
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

function TodayTodoPanel({
  todos,
  onToggleTodo,
}: {
  todos: TodoItem[];
  onToggleTodo: (id: string) => void;
}) {
  return (
    <Card className="min-h-[34rem] rounded-lg shadow-none">
      <CardHeader className="border-b p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Today TODO</CardTitle>
            <CardDescription className="mt-1">
              {todos.filter((todo) => !todo.done).length} open tasks
            </CardDescription>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link href="/workspace">
              <Squares2X2Icon className="h-4 w-4" aria-hidden="true" />
              Workspace
            </Link>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-3">
        <div className="space-y-2">
          {todos.map((todo, index) => (
            <TodoRow
              index={index}
              key={todo.id}
              todo={todo}
              onToggle={() => onToggleTodo(todo.id)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function TodoRow({
  todo,
  index,
  onToggle,
}: {
  todo: TodoItem;
  index: number;
  onToggle: () => void;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-start gap-3 rounded-lg border bg-background p-3 transition-colors",
        todo.done && "bg-muted/45 text-muted-foreground",
      )}
    >
      <button
        aria-label={todo.done ? `Mark ${todo.title} as open` : `Mark ${todo.title} as done`}
        className={cn(
          "mt-0.5 flex h-7 w-7 items-center justify-center rounded-full border transition-colors",
          todo.done
            ? "border-primary bg-primary text-primary-foreground"
            : "border-input hover:border-primary/70 hover:bg-primary/5",
        )}
        onClick={onToggle}
        type="button"
      >
        {todo.done ? <CheckIcon className="h-4 w-4" aria-hidden="true" /> : null}
      </button>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            className={cn(
              "text-sm font-medium leading-5 hover:text-primary",
              todo.done && "line-through",
            )}
            href="/workspace"
          >
            {todo.title}
          </Link>
          <StatusBadge status={todo.done ? "done" : todo.status} />
        </div>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {todo.goal} / {todo.plan}
        </p>
      </div>

      <div className="flex items-center gap-1">
        <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
          {index + 1}
        </span>
        <Button asChild size="icon" variant="ghost">
          <Link aria-label={`Open ${todo.title} in workspace`} href="/workspace">
            <ChevronRightIcon className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

function ThisWeekFocusPanel({ items }: { items: FocusItem[] }) {
  return (
    <Card className="rounded-lg shadow-none">
      <CardHeader className="border-b p-4">
        <CardTitle className="text-base">This Week Focus</CardTitle>
        <CardDescription className="mt-1">3 active priorities</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        {items.map((item) => (
          <div key={item.id} className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{item.title}</p>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {item.goal} / {item.plan}
                </p>
              </div>
              <span className="shrink-0 rounded-full border bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                {item.dueLabel}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${item.progress}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function OptionalDashboardPanels({
  blockedItems,
  completionItems,
}: {
  blockedItems: InsightItem[];
  completionItems: InsightItem[];
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
      <InsightPanel
        description={`${blockedItems.length} tasks`}
        icon={ExclamationTriangleIcon}
        items={blockedItems}
        title="Blocked"
      />
      <InsightPanel
        description={`${completionItems.length} completed`}
        icon={ArrowPathIcon}
        items={completionItems}
        title="Recent Done"
      />
    </div>
  );
}

function InsightPanel({
  title,
  description,
  icon: Icon,
  items,
}: {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  items: InsightItem[];
}) {
  return (
    <Card className="rounded-lg shadow-none">
      <CardHeader className="border-b p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription className="mt-1">{description}</CardDescription>
          </div>
          <Icon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-4">
        {items.map((item) => (
          <Link
            className="block rounded-md border bg-background px-3 py-2 transition-colors hover:border-primary/50 hover:bg-primary/5"
            href="/workspace"
            key={item.id}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{item.title}</p>
                <p className="mt-1 truncate text-xs text-muted-foreground">{item.meta}</p>
              </div>
              <StatusBadge status={item.tone === "blocked" ? "blocked" : "done"} />
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}

function StatusBadge({
  status,
}: {
  status: TodoItem["status"] | "done";
}) {
  const labelByStatus = {
    not_started: "시작전",
    in_progress: "진행중",
    blocked: "막힘",
    done: "완료",
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
      )}
    >
      {labelByStatus[status]}
    </span>
  );
}
