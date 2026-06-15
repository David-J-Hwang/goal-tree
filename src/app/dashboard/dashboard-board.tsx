"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  ArrowPathIcon,
  CalendarDaysIcon,
  CheckIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  Squares2X2Icon,
} from "@heroicons/react/24/outline";
import { GripVertical } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { sortableStackModifiers } from "@/lib/dnd/sortable-stack-modifier";
import { mapNodeRow, nodeSelectColumns, type NodeRow } from "@/lib/goaltree/node-rows";
import {
  mapTodayTodoRow,
  todayTodoSelectColumns,
  type TodayTodoRow,
} from "@/lib/goaltree/today-todo-rows";
import { getWorkspaceNodeHref } from "@/lib/goaltree/workspace-links";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { GoalTreeNode, NodeStatus, TodayTodo } from "@/types/domain";

type TodoItem = {
  id: string;
  taskId: string;
  title: string;
  goal: string;
  plan: string;
  status: NodeStatus;
  done: boolean;
  sortOrder: number;
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

const showOptionalPanels = true;

export function DashboardBoard({
  initialNodes,
  initialTodayDate,
  initialTodayTodos,
  userId,
}: {
  initialNodes: GoalTreeNode[];
  initialTodayDate: string;
  initialTodayTodos: TodayTodo[];
  userId: string;
}) {
  const [nodes, setNodes] = useState(initialNodes);
  const [todayTodos, setTodayTodos] = useState(initialTodayTodos);
  const [updatingTodoId, setUpdatingTodoId] = useState("");
  const [todoError, setTodoError] = useState("");
  const todos = useMemo(
    () => getTodoItems(todayTodos, nodes, initialTodayDate),
    [initialTodayDate, nodes, todayTodos],
  );
  const focusItems = useMemo(() => getFocusItems(nodes), [nodes]);
  const blockedItems = useMemo(() => getBlockedItems(nodes), [nodes]);
  const completionItems = useMemo(() => getCompletionItems(nodes), [nodes]);

  const completedCount = todos.filter((todo) => todo.done).length;
  const blockedCount = todos.filter((todo) => todo.status === "blocked" && !todo.done).length;
  const openCount = todos.length - completedCount;

  const summaryItems = useMemo(
    () => [
      { label: "Today", value: String(todos.length) },
      { label: "Remaining", value: String(openCount) },
      { label: "Done", value: String(completedCount) },
      { label: "Blocked", value: String(blockedCount) },
    ],
    [blockedCount, completedCount, openCount, todos.length],
  );
  const todayDateLabel = useMemo(
    () => formatKoreanDateLabel(initialTodayDate),
    [initialTodayDate],
  );

  async function handleToggleTodo(id: string) {
    const todo = todayTodos.find((item) => item.id === id);
    const task = todo ? nodes.find((node) => node.id === todo.taskId) : undefined;

    if (!todo || !task) {
      setTodoError("Today TODO was not found.");
      return;
    }

    const currentDone = todo.done || task.status === "done";
    const nextDone = !currentDone;
    setUpdatingTodoId(id);
    setTodoError("");

    const supabase = createSupabaseBrowserClient();
    const { data: todoRow, error: todoError } = await supabase
      .from("today_todos")
      .update({ done: nextDone })
      .eq("id", id)
      .eq("user_id", userId)
      .select(todayTodoSelectColumns)
      .single()
      .returns<TodayTodoRow>();

    if (todoError) {
      setTodoError(todoError.message);
      setUpdatingTodoId("");
      return;
    }

    if (!todoRow) {
      setTodoError("Updated Today TODO was not returned.");
      setUpdatingTodoId("");
      return;
    }

    const { data: nodeRow, error: nodeError } = await supabase
      .from("nodes")
      .update(getTaskStatusUpdate(task, nextDone, initialTodayDate))
      .eq("id", task.id)
      .eq("user_id", userId)
      .select(nodeSelectColumns)
      .single()
      .returns<NodeRow>();

    if (nodeError) {
      setTodoError(nodeError.message);
      setUpdatingTodoId("");
      return;
    }

    if (!nodeRow) {
      setTodoError("Updated Task was not returned.");
      setUpdatingTodoId("");
      return;
    }

    const updatedTodo = mapTodayTodoRow(todoRow);
    const updatedTask = mapNodeRow(nodeRow);

    setTodayTodos((currentTodos) =>
      currentTodos.map((currentTodo) =>
        currentTodo.id === updatedTodo.id ? updatedTodo : currentTodo,
      ),
    );
    setNodes((currentNodes) =>
      currentNodes.map((node) => (node.id === updatedTask.id ? updatedTask : node)),
    );
    setUpdatingTodoId("");
  }

  async function handleReorderTodos(orderedIds: string[]) {
    const previousTodos = todayTodos;
    const nextTodos = todayTodos.map((todo) => {
      const index = orderedIds.indexOf(todo.id);

      if (index === -1) {
        return todo;
      }

      return { ...todo, sortOrder: index + 1 };
    });

    setTodayTodos(nextTodos);
    setTodoError("");

    const supabase = createSupabaseBrowserClient();
    const updates = orderedIds.map((id, index) =>
      supabase
        .from("today_todos")
        .update({ sort_order: index + 1 })
        .eq("id", id)
        .eq("user_id", userId),
    );
    const results = await Promise.all(updates);
    const failedResult = results.find((result) => result.error);

    if (failedResult?.error) {
      setTodayTodos(previousTodos);
      setTodoError(failedResult.error.message);
    }
  }

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-background px-4 py-5 text-foreground sm:px-6 lg:px-8 xl:h-[calc(100dvh-3.5rem-1px)] xl:min-h-0 xl:overflow-hidden">
      <div className="mx-auto flex min-h-0 max-w-[1440px] flex-col xl:h-full">
        <header className="flex shrink-0 flex-col gap-4 border-b pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Goaltree</p>
            <h1 className="mt-1 text-2xl font-semibold">Dashboard</h1>
          </div>
          <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm text-muted-foreground shadow-sm">
            <CalendarDaysIcon className="h-4 w-4" aria-hidden="true" />
            <span>{todayDateLabel}</span>
          </div>
        </header>

        <section className="mt-5 grid shrink-0 grid-cols-4 gap-2 sm:gap-3">
          {summaryItems.map((item) => (
            <SummaryTile
              key={item.label}
              label={item.label}
              value={item.value}
            />
          ))}
        </section>

        <section className="mt-4 grid gap-4 xl:min-h-0 xl:flex-1 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.85fr)]">
          <TodayTodoPanel
            errorMessage={todoError}
            todos={todos}
            updatingTodoId={updatingTodoId}
            onReorderTodos={handleReorderTodos}
            onToggleTodo={handleToggleTodo}
          />

          <div className="grid gap-4 xl:min-h-0 xl:grid-rows-3">
            <ThisWeekFocusPanel items={focusItems} />
            {showOptionalPanels ? (
              <OptionalDashboardPanels
                blockedItems={blockedItems}
                completionItems={completionItems}
              />
            ) : null}
          </div>
        </section>
      </div>
    </main>
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

function TodayTodoPanel({
  errorMessage,
  todos,
  updatingTodoId,
  onReorderTodos,
  onToggleTodo,
}: {
  errorMessage: string;
  todos: TodoItem[];
  updatingTodoId: string;
  onReorderTodos: (orderedIds: string[]) => Promise<void>;
  onToggleTodo: (id: string) => Promise<void>;
}) {
  const [isReordering, setIsReordering] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 2,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = todos.findIndex((todo) => todo.id === active.id);
    const newIndex = todos.findIndex((todo) => todo.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    const orderedIds = arrayMove(todos, oldIndex, newIndex).map((todo) => todo.id);
    setIsReordering(true);

    try {
      await onReorderTodos(orderedIds);
    } finally {
      setIsReordering(false);
    }
  }

  return (
    <Card className="flex min-h-[34rem] flex-col overflow-hidden rounded-lg shadow-none xl:h-full xl:min-h-0">
      <CardHeader className="shrink-0 border-b p-4">
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

      <CardContent className="min-h-0 flex-1 overflow-y-auto p-3">
        {errorMessage ? (
          <p className="mb-3 rounded-md border border-destructive/25 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {errorMessage}
          </p>
        ) : null}
        {todos.length > 0 ? (
          <DndContext
            collisionDetection={closestCenter}
            modifiers={sortableStackModifiers}
            sensors={sensors}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={todos.map((todo) => todo.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {todos.map((todo, index) => (
                  <SortableTodoRow
                    index={index}
                    isReordering={isReordering}
                    isUpdating={updatingTodoId === todo.id}
                    key={todo.id}
                    todo={todo}
                    onToggle={() => onToggleTodo(todo.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <div className="flex min-h-40 flex-col items-center justify-center rounded-md border border-dashed px-4 text-center">
            <p className="text-sm font-medium">No Today TODO yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Add Task cards from Workspace to plan today.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SortableTodoRow({
  todo,
  index,
  isReordering,
  isUpdating,
  onToggle,
}: {
  todo: TodoItem;
  index: number;
  isReordering: boolean;
  isUpdating: boolean;
  onToggle: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: todo.id,
    disabled: isUpdating || isReordering,
    transition: {
      duration: 140,
      easing: "cubic-bezier(0.2, 0, 0, 1)",
    },
  });

  const style = {
    position: "relative" as const,
    transform: transform ? `translate3d(0, ${Math.round(transform.y)}px, 0)` : undefined,
    transition: isDragging ? "none" : transition,
    zIndex: isDragging ? 50 : undefined,
    willChange: "transform",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "grid grid-cols-[1.75rem_2.25rem_minmax(0,1fr)_auto] items-start gap-3 rounded-lg border bg-background p-3 transition-colors",
        todo.done && "bg-muted/45 text-muted-foreground",
        isDragging && "shadow-md ring-1 ring-primary/30",
      )}
    >
      <button
        aria-label={`Reorder ${todo.title}`}
        className={cn(
          "mt-0.5 flex h-7 w-7 touch-none cursor-grab items-center justify-center rounded text-muted-foreground transition hover:bg-muted hover:text-foreground active:cursor-grabbing",
          (isUpdating || isReordering) && "cursor-wait opacity-60",
        )}
        disabled={isUpdating || isReordering}
        type="button"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" aria-hidden="true" />
      </button>
      <button
        aria-label={todo.done ? `Mark ${todo.title} as open` : `Mark ${todo.title} as done`}
        className={cn(
          "mt-0.5 flex h-7 w-7 items-center justify-center rounded-full border transition-colors",
          todo.done
            ? "border-primary bg-primary text-primary-foreground"
            : "border-input hover:border-primary/70 hover:bg-primary/5",
          isUpdating && "cursor-wait opacity-70",
        )}
        disabled={isUpdating}
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
            href={getWorkspaceNodeHref(todo.taskId)}
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
          <Link
            aria-label={`Open ${todo.title} in workspace`}
            href={getWorkspaceNodeHref(todo.taskId)}
          >
            <ChevronRightIcon className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

function ThisWeekFocusPanel({ items }: { items: FocusItem[] }) {
  return (
    <Card className="flex min-h-0 flex-col overflow-hidden rounded-lg shadow-none">
      <CardHeader className="shrink-0 border-b p-4">
        <CardTitle className="text-base">This Week Focus</CardTitle>
        <CardDescription className="mt-1">{items.length} active priorities</CardDescription>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {items.length > 0 ? (
          items.map((item) => (
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
          ))
        ) : (
          <p className="rounded-md border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
            No active focus items yet
          </p>
        )}
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
    <>
      <InsightPanel
        description={`${completionItems.length} completed`}
        icon={ArrowPathIcon}
        items={completionItems}
        title="Recent Done"
      />
      <InsightPanel
        description={`${blockedItems.length} tasks`}
        icon={ExclamationTriangleIcon}
        items={blockedItems}
        title="Blocked"
      />
    </>
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
    <Card className="flex min-h-0 flex-col overflow-hidden rounded-lg shadow-none">
      <CardHeader className="shrink-0 border-b p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription className="mt-1">{description}</CardDescription>
          </div>
          <Icon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        </div>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {items.length > 0 ? (
          items.map((item) => (
            <Link
              className="block rounded-md border bg-background px-3 py-2 transition-colors hover:border-primary/50 hover:bg-primary/5"
              href={getWorkspaceNodeHref(item.id)}
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
          ))
        ) : (
          <p className="rounded-md border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
            No items yet
          </p>
        )}
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
      {labelByStatus[status]}
    </span>
  );
}

function getTodoItems(
  todayTodos: TodayTodo[],
  nodes: GoalTreeNode[],
  todayDate: string,
): TodoItem[] {
  return todayTodos
    .filter((todo) => todo.date === todayDate)
    .map((todo) => {
      const task = nodes.find((node) => node.id === todo.taskId);

      if (!task || task.type !== "task" || !isNodeVisible(task, nodes)) {
        return undefined;
      }

      const plan = nodes.find((node) => node.id === task.parentId);
      const goal = plan?.parentId
        ? nodes.find((node) => node.id === plan.parentId)
        : undefined;

      return {
        id: todo.id,
        taskId: task.id,
        title: task.title,
        goal: goal?.title ?? "Goal",
        plan: plan?.title ?? "Plan",
        status: task.status,
        done: todo.done || task.status === "done",
        sortOrder: todo.sortOrder,
      };
    })
    .filter((todo): todo is TodoItem => Boolean(todo))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

function getFocusItems(nodes: GoalTreeNode[]): FocusItem[] {
  return nodes
    .filter(
      (node) =>
        node.type === "plan" &&
        isNodeVisible(node, nodes) &&
        node.status !== "done" &&
        node.status !== "paused",
    )
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .slice(0, 3)
    .map((plan) => {
      const goal = nodes.find((node) => node.id === plan.parentId);

      return {
        id: plan.id,
        title: plan.title,
        goal: goal?.title ?? "Goal",
        plan: plan.title,
        progress: getNodeProgress(plan, nodes),
        dueLabel: getDueLabel(plan),
      };
    });
}

function getBlockedItems(nodes: GoalTreeNode[]): InsightItem[] {
  return nodes
    .filter(
      (node) =>
        node.type === "task" &&
        node.status === "blocked" &&
        isNodeVisible(node, nodes),
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 3)
    .map((task) => ({
      id: task.id,
      title: task.title,
      meta: getNodeBreadcrumb(task, nodes),
      tone: "blocked",
    }));
}

function getCompletionItems(nodes: GoalTreeNode[]): InsightItem[] {
  return nodes
    .filter(
      (node) =>
        node.type === "task" &&
        node.status === "done" &&
        isNodeVisible(node, nodes),
    )
    .sort((a, b) =>
      (b.actualEndDate ?? b.updatedAt).localeCompare(a.actualEndDate ?? a.updatedAt),
    )
    .slice(0, 3)
    .map((task) => ({
      id: task.id,
      title: task.title,
      meta: getNodeBreadcrumb(task, nodes),
      tone: "done",
    }));
}

function getTaskStatusUpdate(task: GoalTreeNode, nextDone: boolean, todayDate: string) {
  if (nextDone) {
    return {
      status: "done",
      actual_start_date:
        !task.actualStartDate || task.actualStartDate > todayDate
          ? todayDate
          : task.actualStartDate,
      actual_end_date: todayDate,
    };
  }

  return {
    status: "in_progress",
    actual_start_date: task.actualStartDate ?? todayDate,
    actual_end_date: null,
  };
}

function formatKoreanDateLabel(dateValue: string) {
  const [year, month, day] = dateValue.split("-").map(Number);

  if (!year || !month || !day) {
    return dateValue;
  }

  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  const weekday = weekdays[new Date(year, month - 1, day).getDay()];

  return `${year}.${String(month).padStart(2, "0")}.${String(day).padStart(2, "0")}(${weekday})`;
}

function getNodeBreadcrumb(node: GoalTreeNode, nodes: GoalTreeNode[]) {
  const plan = node.parentId ? nodes.find((item) => item.id === node.parentId) : undefined;

  if (node.type === "plan") {
    const goal = plan;
    return goal?.title ?? "Goal";
  }

  const goal = plan?.parentId
    ? nodes.find((item) => item.id === plan.parentId)
    : undefined;

  return `${goal?.title ?? "Goal"} / ${plan?.title ?? "Plan"}`;
}

function getDueLabel(node: GoalTreeNode) {
  if (!node.plannedEndDate) {
    return "Active";
  }

  return node.plannedEndDate;
}

function getNodeProgress(node: GoalTreeNode, nodes: GoalTreeNode[]) {
  const tasks =
    node.type === "plan"
      ? nodes.filter(
          (item) =>
            item.type === "task" &&
            item.parentId === node.id &&
            isNodeVisible(item, nodes),
        )
      : nodes.filter((item) => {
          if (item.type !== "task" || !isNodeVisible(item, nodes)) {
            return false;
          }
          const parentPlan = nodes.find((plan) => plan.id === item.parentId);
          return parentPlan?.parentId === node.id;
        });

  const calculableTasks = tasks.filter((task) => task.status !== "paused");

  if (calculableTasks.length === 0) {
    return 0;
  }

  const doneTasks = calculableTasks.filter((task) => task.status === "done");
  return Math.round((doneTasks.length / calculableTasks.length) * 100);
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
