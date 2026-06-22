"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { mapNodeRow, nodeSelectColumns, type NodeRow } from "@/lib/goaltree/node-rows";
import { syncAncestorStatuses } from "@/lib/goaltree/parent-status-sync";
import {
  appPageContentClassName,
  appPageMainClassName,
} from "@/lib/page-layout";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { GoalTreeNode, NodeStatus, NodeType, UserSettings } from "@/types/domain";

type TrashFilter = "all" | NodeType;

type TrashedItem = GoalTreeNode & {
  trashedAt: string;
  goal?: string;
  plan?: string;
  parentTrashed?: {
    type: "goal" | "plan";
    title: string;
  };
};

const filters: Array<{ value: TrashFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "goal", label: "Goal" },
  { value: "plan", label: "Plan" },
  { value: "task", label: "Task" },
];

const nodeTypeLabels: Record<NodeType, string> = {
  goal: "Goal",
  plan: "Plan",
  task: "Task",
};

export function TrashBoard({
  initialNodes,
  initialSettings,
  userId,
}: {
  initialNodes: GoalTreeNode[];
  initialSettings: UserSettings;
  userId: string;
}) {
  const [nodes, setNodes] = useState(initialNodes);
  const [filter, setFilter] = useState<TrashFilter>("all");
  const [actionError, setActionError] = useState("");
  const [restoringId, setRestoringId] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [confirmingDeleteId, setConfirmingDeleteId] = useState("");
  const confirmDeleteButtonRef = useRef<HTMLButtonElement | null>(null);
  const mutationLockRef = useRef(false);

  const trashedItems = useMemo(() => getTrashedItems(nodes), [nodes]);

  const visibleItems = useMemo(
    () =>
      trashedItems.filter((item) => filter === "all" || item.type === filter),
    [filter, trashedItems],
  );

  const goalCount = trashedItems.filter((item) => item.type === "goal").length;
  const planCount = trashedItems.filter((item) => item.type === "plan").length;
  const taskCount = trashedItems.filter((item) => item.type === "task").length;
  const blockedRestoreCount = trashedItems.filter((item) => item.parentTrashed).length;
  const isMutating = Boolean(restoringId || deletingId);

  useEffect(() => {
    if (!confirmingDeleteId || isMutating) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (confirmDeleteButtonRef.current?.contains(target)) {
        return;
      }

      setConfirmingDeleteId("");
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [confirmingDeleteId, isMutating]);

  async function handleRestore(item: TrashedItem) {
    if (item.parentTrashed || mutationLockRef.current) {
      return;
    }

    mutationLockRef.current = true;
    setRestoringId(item.id);
    setActionError("");
    setConfirmingDeleteId("");

    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("nodes")
        .update({ trashed_at: null })
        .eq("id", item.id)
        .eq("user_id", userId)
        .select(nodeSelectColumns)
        .single()
        .returns<NodeRow>();

      if (error) {
        setActionError(error.message);
        return;
      }

      if (!data) {
        setActionError("Restored node was not returned.");
        return;
      }

      const restoredNode = mapNodeRow(data);
      const nextNodes = nodes.map((node) =>
        node.id === restoredNode.id ? restoredNode : node,
      );
      const syncedNodes = await syncAncestorStatuses({
        autoFillActualDatesOnStatusChange:
          initialSettings.autoFillActualDatesOnStatusChange,
        nodes: nextNodes,
        parentIds: [restoredNode.parentId],
        supabase,
        userId,
      });

      setNodes(syncedNodes);
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Failed to restore card.",
      );
    } finally {
      setRestoringId("");
      mutationLockRef.current = false;
    }
  }

  async function handleDelete(item: TrashedItem) {
    if (mutationLockRef.current) {
      return;
    }

    if (confirmingDeleteId !== item.id) {
      setConfirmingDeleteId(item.id);
      setActionError("");
      return;
    }

    mutationLockRef.current = true;
    setDeletingId(item.id);
    setActionError("");

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase
      .from("nodes")
      .delete()
      .eq("id", item.id)
      .eq("user_id", userId);

    if (error) {
      setActionError(error.message);
      setDeletingId("");
      setConfirmingDeleteId("");
      mutationLockRef.current = false;
      return;
    }

    const removedIds = new Set([item.id, ...getDescendantIds(nodes, item.id)]);
    setNodes((currentNodes) => currentNodes.filter((node) => !removedIds.has(node.id)));
    setDeletingId("");
    setConfirmingDeleteId("");
    mutationLockRef.current = false;
  }

  return (
    <main className={appPageMainClassName}>
      <div className={cn(appPageContentClassName, "max-w-[1440px]")}>
        <header className="flex shrink-0 flex-col gap-4 border-b pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Goaltree</p>
            <h1 className="mt-1 text-2xl font-semibold">Trash</h1>
          </div>
          <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm text-muted-foreground shadow-sm">
            <TrashIcon className="h-4 w-4" aria-hidden="true" />
            <span>{trashedItems.length} trashed items</span>
          </div>
        </header>

        <section className="mt-5 grid shrink-0 grid-cols-4 gap-2 sm:gap-3">
          <SummaryTile label="All" value={String(trashedItems.length)} />
          <SummaryTile label="Goals" value={String(goalCount)} />
          <SummaryTile label="Plans" value={String(planCount)} />
          <SummaryTile label="Tasks" value={String(taskCount)} />
        </section>

        <section className="mt-4 grid gap-4 xl:min-h-0 xl:flex-1 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.9fr)]">
          <Card className="flex h-[32rem] min-h-0 flex-col overflow-hidden rounded-lg shadow-none xl:h-full">
            <CardHeader className="shrink-0 border-b p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle className="text-base">Trashed Items</CardTitle>
                  <CardDescription className="mt-1">
                    {visibleItems.length} items in this view
                  </CardDescription>
                </div>
                <SegmentedControl
                  disabled={isMutating}
                  items={filters}
                  value={filter}
                  onChange={setFilter}
                />
              </div>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
              {actionError ? (
                <p className="rounded-md border border-destructive/25 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  {actionError}
                </p>
              ) : null}
              {visibleItems.length > 0 ? (
                visibleItems.map((item) => (
                  <TrashItemCard
                    isConfirmingDelete={confirmingDeleteId === item.id}
                    isDeleting={deletingId === item.id}
                    isMutating={isMutating}
                    isRestoring={restoringId === item.id}
                    item={item}
                    key={item.id}
                    onConfirmDeleteButtonRef={(element) => {
                      if (confirmingDeleteId === item.id) {
                        confirmDeleteButtonRef.current = element;
                      }
                    }}
                    onDelete={() => handleDelete(item)}
                    onRestore={() => handleRestore(item)}
                  />
                ))
              ) : (
                <div className="flex min-h-40 items-center justify-center rounded-md border border-dashed px-4 text-center text-sm text-muted-foreground">
                  No trashed items in this view
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 xl:min-h-0 xl:grid-rows-2">
            <RestorePolicyPanel blockedRestoreCount={blockedRestoreCount} />
            <PermanentDeletePanel />
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

function SegmentedControl<TValue extends string>({
  disabled = false,
  items,
  value,
  onChange,
}: {
  disabled?: boolean;
  items: Array<{ value: TValue; label: string }>;
  value: TValue;
  onChange: (value: TValue) => void;
}) {
  return (
    <div className="grid w-full grid-cols-4 rounded-md border bg-muted/50 p-1 sm:inline-flex sm:w-fit">
      {items.map((item) => (
        <button
          className={cn(
            "rounded px-2 py-1.5 text-sm font-medium text-muted-foreground transition-colors sm:px-3",
            value === item.value && "bg-primary text-primary-foreground shadow-sm",
            disabled && "cursor-not-allowed opacity-60",
          )}
          disabled={disabled}
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

function TrashItemCard({
  isConfirmingDelete,
  isDeleting,
  isMutating,
  isRestoring,
  item,
  onConfirmDeleteButtonRef,
  onDelete,
  onRestore,
}: {
  isConfirmingDelete: boolean;
  isDeleting: boolean;
  isMutating: boolean;
  isRestoring: boolean;
  item: TrashedItem;
  onConfirmDeleteButtonRef: (element: HTMLButtonElement | null) => void;
  onDelete: () => void;
  onRestore: () => void;
}) {
  const restoreBlocked = Boolean(item.parentTrashed);
  const breadcrumb = getBreadcrumb(item);

  return (
    <article className="rounded-lg border bg-background p-3">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <TypeBadge type={item.type} />
            <h2 className="text-sm font-medium leading-5">{item.title}</h2>
            <StatusBadge status={item.status} />
          </div>
          {breadcrumb ? (
            <p className="mt-2 truncate text-xs text-muted-foreground">
              {breadcrumb}
            </p>
          ) : null}
          <p className="mt-2 text-xs text-muted-foreground">
            Moved to trash: {formatTimestamp(item.trashedAt)}
          </p>

          {restoreBlocked ? (
            <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800/40 dark:bg-amber-950/25 dark:text-amber-300/85">
              <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                Restore the parent {item.parentTrashed?.type} first: {item.parentTrashed?.title}
              </span>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 disabled:border-input disabled:bg-background disabled:text-muted-foreground dark:border-emerald-800/40 dark:bg-emerald-950/25 dark:text-emerald-300/85 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-200"
            disabled={restoreBlocked || isMutating}
            size="sm"
            variant="outline"
            onClick={onRestore}
          >
            <ArrowUturnLeftIcon className="h-4 w-4" aria-hidden="true" />
            {isRestoring ? "Restoring" : "Restore"}
          </Button>
          <Button
            className={cn(
              isConfirmingDelete
                ? "border-destructive bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:text-destructive-foreground"
                : "border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800 dark:border-red-800/40 dark:bg-red-950/25 dark:text-red-300/85 dark:hover:bg-red-950/40 dark:hover:text-red-200",
            )}
            disabled={isMutating}
            ref={onConfirmDeleteButtonRef}
            size="sm"
            variant="outline"
            onClick={onDelete}
          >
            <TrashIcon className="h-4 w-4" aria-hidden="true" />
            {isDeleting ? "Deleting" : isConfirmingDelete ? "Confirm delete" : "Delete"}
          </Button>
        </div>
      </div>
    </article>
  );
}

function RestorePolicyPanel({ blockedRestoreCount }: { blockedRestoreCount: number }) {
  return (
    <Card className="flex h-64 min-h-0 flex-col overflow-hidden rounded-lg shadow-none xl:h-full">
      <CardHeader className="shrink-0 border-b p-4">
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
      <CardContent className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 text-sm text-muted-foreground">
        <PolicyRow label="Goal" value="Restores its child Plans and Tasks" />
        <PolicyRow label="Plan" value="Restore parent Goal first if trashed" />
        <PolicyRow label="Task" value="Restore parent Plan first if trashed" />
      </CardContent>
    </Card>
  );
}

function PermanentDeletePanel() {
  return (
    <Card className="flex h-64 min-h-0 flex-col overflow-hidden rounded-lg shadow-none xl:h-full">
      <CardHeader className="shrink-0 border-b p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">Permanent Delete</CardTitle>
            <CardDescription className="mt-1">Final deletion happens here</CardDescription>
          </div>
          <ExclamationTriangleIcon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        </div>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 text-sm text-muted-foreground">
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
      {nodeTypeLabels[type]}
    </span>
  );
}

function StatusBadge({ status }: { status: NodeStatus }) {
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
    return "";
  }

  if (item.type === "plan") {
    return item.goal ?? "Goal";
  }

  return `${item.goal ?? "Goal"} / ${item.plan ?? "Plan"}`;
}

function getTrashedItems(nodes: GoalTreeNode[]): TrashedItem[] {
  return nodes
    .filter((node): node is GoalTreeNode & { trashedAt: string } =>
      Boolean(node.trashedAt),
    )
    .map((node) => ({
      ...node,
      ...getBreadcrumbParts(node, nodes),
      parentTrashed: getParentTrashed(node, nodes),
    }))
    .sort((a, b) => b.trashedAt.localeCompare(a.trashedAt));
}

function getBreadcrumbParts(node: GoalTreeNode, nodes: GoalTreeNode[]) {
  if (node.type === "goal") {
    return {};
  }

  const parent = nodes.find((item) => item.id === node.parentId);

  if (node.type === "plan") {
    return { goal: parent?.title };
  }

  const goal = parent?.parentId
    ? nodes.find((item) => item.id === parent.parentId)
    : undefined;

  return {
    goal: goal?.title,
    plan: parent?.title,
  };
}

function getParentTrashed(node: GoalTreeNode, nodes: GoalTreeNode[]) {
  if (node.type === "goal") {
    return undefined;
  }

  const parent = nodes.find((item) => item.id === node.parentId);

  if (parent?.trashedAt && (parent.type === "goal" || parent.type === "plan")) {
    return {
      type: parent.type,
      title: parent.title,
    };
  }

  if (node.type !== "task" || !parent?.parentId) {
    return undefined;
  }

  const goal = nodes.find((item) => item.id === parent.parentId);

  if (!goal?.trashedAt) {
    return undefined;
  }

  return {
    type: "goal" as const,
    title: goal.title,
  };
}

function getDescendantIds(nodes: GoalTreeNode[], nodeId: string): string[] {
  const children = nodes.filter((node) => node.parentId === nodeId);

  return children.flatMap((child) => [
    child.id,
    ...getDescendantIds(nodes, child.id),
  ]);
}

function formatTimestamp(value: string) {
  return value.includes("T") ? value.replace("T", " ").slice(0, 16) : value;
}
