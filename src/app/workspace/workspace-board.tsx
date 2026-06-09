"use client";

import { type FormEvent, useMemo, useState } from "react";
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  type Modifier,
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
  Ban,
  CheckCircle2,
  Circle,
  Clock3,
  GripVertical,
  PauseCircle,
  Plus,
  Search,
  Timer,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { mapNodeRow, nodeSelectColumns, type NodeRow } from "@/lib/goaltree/node-rows";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { GoalTreeNode, NodeStatus, NodeType, PlanCategory } from "@/types/domain";

type WorkspaceNode = GoalTreeNode & {
  note?: string;
};
type CreateNodeInput = {
  type: NodeType;
  parentId: string | null;
  title: string;
  categoryId?: string | null;
};

const sortableStackModifiers: Modifier[] = [restrictToSortableStack];
const dragBoundaryOvershoot = 20;
const dragBoundarySoftness = 54;

const statusMeta: Record<
  NodeStatus,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    className: string;
  }
> = {
  not_started: {
    label: "시작전",
    icon: Circle,
    className:
      "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700/55 dark:bg-slate-800/45 dark:text-slate-400",
  },
  in_progress: {
    label: "진행중",
    icon: Clock3,
    className:
      "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800/40 dark:bg-blue-950/25 dark:text-blue-300/80",
  },
  blocked: {
    label: "막힘",
    icon: Ban,
    className:
      "border-red-200 bg-red-50 text-red-700 dark:border-red-800/40 dark:bg-red-950/25 dark:text-red-300/80",
  },
  done: {
    label: "완료",
    icon: CheckCircle2,
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/25 dark:text-emerald-300/80",
  },
  paused: {
    label: "보류",
    icon: PauseCircle,
    className:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/40 dark:bg-amber-950/25 dark:text-amber-300/80",
  },
};

const columnLabels: Record<NodeType, string> = {
  goal: "Goal",
  plan: "Plan",
  task: "Task",
};

export function WorkspaceBoard({
  initialCategories,
  initialNodes,
  userId,
}: {
  initialCategories: PlanCategory[];
  initialNodes: GoalTreeNode[];
  userId: string;
}) {
  const [nodes, setNodes] = useState<WorkspaceNode[]>(initialNodes);
  const [planCategories] = useState<PlanCategory[]>(initialCategories);
  const initialGoalId = useMemo(
    () => getSortedChildren(initialNodes, "goal", null)[0]?.id ?? "",
    [initialNodes],
  );
  const [selectedGoalId, setSelectedGoalId] = useState(initialGoalId);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [selectedNodeId, setSelectedNodeId] = useState(initialGoalId);

  const goals = useMemo(() => getSortedChildren(nodes, "goal", null), [nodes]);
  const plans = useMemo(
    () => getSortedChildren(nodes, "plan", selectedGoalId),
    [nodes, selectedGoalId],
  );
  const tasks = useMemo(
    () => getSortedChildren(nodes, "task", selectedPlanId),
    [nodes, selectedPlanId],
  );

  const selectedNode = nodes.find((node) => node.id === selectedNodeId) ?? goals[0];
  const selectedGoal = nodes.find((node) => node.id === selectedGoalId);
  const selectedPlan = nodes.find((node) => node.id === selectedPlanId);

  function handleSelect(node: WorkspaceNode) {
    setSelectedNodeId(node.id);

    if (node.type === "goal") {
      setSelectedGoalId(node.id);
      setSelectedPlanId("");
    }

    if (node.type === "plan") {
      setSelectedPlanId(node.id);
    }
  }

  function handleReorder(type: NodeType, parentId: string | null, orderedIds: string[]) {
    setNodes((currentNodes) =>
      currentNodes.map((node) => {
        if (node.type !== type || node.parentId !== parentId) {
          return node;
        }

        const index = orderedIds.indexOf(node.id);
        return index === -1 ? node : { ...node, sortOrder: index + 1 };
      }),
    );
  }

  async function handleCreateNode(input: CreateNodeInput) {
    const sortOrder = getNextSortOrder(nodes, input.type, input.parentId);
    const supabase = createSupabaseBrowserClient();

    const { data, error } = await supabase
      .from("nodes")
      .insert({
        user_id: userId,
        type: input.type,
        parent_id: input.parentId,
        title: input.title,
        category_id: input.type === "plan" ? input.categoryId ?? null : null,
        sort_order: sortOrder,
      })
      .select(nodeSelectColumns)
      .single()
      .returns<NodeRow>();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      throw new Error("Created node was not returned.");
    }

    const createdNode = mapNodeRow(data);

    setNodes((currentNodes) => [...currentNodes, createdNode]);
    setSelectedNodeId(createdNode.id);

    if (createdNode.type === "goal") {
      setSelectedGoalId(createdNode.id);
      setSelectedPlanId("");
    }

    if (createdNode.type === "plan") {
      setSelectedGoalId(createdNode.parentId ?? "");
      setSelectedPlanId(createdNode.id);
    }
  }

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-background px-4 py-5 text-foreground sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 border-b pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Goaltree</p>
          <h1 className="mt-1 text-2xl font-semibold">Workspace</h1>
        </div>
        <div className="flex w-full items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm text-muted-foreground shadow-sm lg:w-80">
          <Search className="h-4 w-4" aria-hidden="true" />
          <span>Search Goal, Plan, Task</span>
        </div>
      </header>

      <section className="mt-5 grid gap-4 xl:grid-cols-[minmax(230px,1fr)_minmax(260px,1fr)_minmax(280px,1fr)_380px]">
        <WorkspaceColumn
          type="goal"
          parentId={null}
          title="Goals"
          nodes={goals}
          selectedId={selectedGoalId}
          categories={planCategories}
          emptyMessage="No Goal cards yet"
          onCreate={handleCreateNode}
          onSelect={handleSelect}
          onReorder={handleReorder}
          summary={`${goals.length} active goals`}
        />
        <WorkspaceColumn
          type="plan"
          parentId={selectedGoalId}
          title="Plans"
          nodes={plans}
          selectedId={selectedPlanId}
          categories={planCategories}
          onCreate={handleCreateNode}
          onSelect={handleSelect}
          onReorder={handleReorder}
          emptyMessage={
            selectedGoalId ? "No Plan cards yet" : "Select a goal card to view plans"
          }
          summary={selectedGoal ? selectedGoal.title : "No goal selected"}
        />
        <WorkspaceColumn
          type="task"
          parentId={selectedPlanId}
          title="Tasks"
          nodes={tasks}
          selectedId={selectedNodeId}
          categories={planCategories}
          onCreate={handleCreateNode}
          onSelect={handleSelect}
          onReorder={handleReorder}
          emptyMessage={
            selectedPlanId ? undefined : "Select a plan card to view tasks"
          }
          summary={selectedPlan ? selectedPlan.title : "No plan selected"}
        />
        <DetailPanel
          node={selectedNode}
          goal={selectedGoal}
          plan={selectedPlan}
          nodes={nodes}
          categories={planCategories}
        />
      </section>
    </main>
  );
}

function WorkspaceColumn({
  type,
  parentId,
  title,
  summary,
  nodes,
  selectedId,
  categories,
  emptyMessage,
  onCreate,
  onSelect,
  onReorder,
}: {
  type: NodeType;
  parentId: string | null;
  title: string;
  summary: string;
  nodes: WorkspaceNode[];
  selectedId: string;
  categories: PlanCategory[];
  emptyMessage?: string;
  onCreate: (input: CreateNodeInput) => Promise<void>;
  onSelect: (node: WorkspaceNode) => void;
  onReorder: (type: NodeType, parentId: string | null, orderedIds: string[]) => void;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [titleValue, setTitleValue] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const canAdd = type === "goal" || Boolean(parentId);
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

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = nodes.findIndex((node) => node.id === active.id);
    const newIndex = nodes.findIndex((node) => node.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    const orderedIds = arrayMove(nodes, oldIndex, newIndex).map((node) => node.id);
    onReorder(type, parentId, orderedIds);
  }

  async function handleCreateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedTitle = titleValue.trim();

    if (!trimmedTitle) {
      setErrorMessage(`${columnLabels[type]} title is required.`);
      return;
    }

    if (!canAdd) {
      setErrorMessage(
        type === "plan"
          ? "Select a goal before adding a plan."
          : "Select a plan before adding a task.",
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      await onCreate({
        type,
        parentId,
        title: trimmedTitle,
        categoryId: type === "plan" ? categoryId || null : null,
      });
      setTitleValue("");
      setIsAdding(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : `Failed to add ${columnLabels[type]}.`);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="flex min-h-[34rem] flex-col overflow-hidden rounded-lg shadow-none">
      <CardHeader className="border-b p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription className="mt-1 line-clamp-1">{summary}</CardDescription>
          </div>
          <Button
            size="icon"
            variant="ghost"
            aria-label={`Add ${columnLabels[type]}`}
            disabled={!canAdd}
            onClick={() => {
              setIsAdding(true);
              setErrorMessage("");
            }}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-3">
        {isAdding ? (
          <AddNodeForm
            type={type}
            titleValue={titleValue}
            categoryId={categoryId}
            categories={categories}
            errorMessage={errorMessage}
            isSubmitting={isSubmitting}
            onCategoryChange={setCategoryId}
            onCancel={() => {
              setIsAdding(false);
              setTitleValue("");
              setErrorMessage("");
            }}
            onSubmit={handleCreateSubmit}
            onTitleChange={setTitleValue}
          />
        ) : null}
        {nodes.length === 0 ? (
          <div className="flex min-h-32 items-center justify-center rounded-md border border-dashed px-4 text-center text-sm text-muted-foreground">
            {emptyMessage ?? `No ${columnLabels[type]} cards`}
          </div>
        ) : (
          <DndContext
            id={`workspace-${type}-${parentId ?? "root"}`}
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={sortableStackModifiers}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={nodes.map((node) => node.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {nodes.map((node) => (
                  <SortableNodeCard
                    key={node.id}
                    node={node}
                    selected={node.id === selectedId}
                    category={categories.find((category) => category.id === node.categoryId)}
                    progress={getNodeProgress(node, nodes)}
                    onSelect={() => onSelect(node)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </CardContent>
    </Card>
  );
}

function AddNodeForm({
  type,
  titleValue,
  categoryId,
  categories,
  errorMessage,
  isSubmitting,
  onCancel,
  onCategoryChange,
  onSubmit,
  onTitleChange,
}: {
  type: NodeType;
  titleValue: string;
  categoryId: string;
  categories: PlanCategory[];
  errorMessage: string;
  isSubmitting: boolean;
  onCancel: () => void;
  onCategoryChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onTitleChange: (value: string) => void;
}) {
  return (
    <form className="mb-3 rounded-md border bg-muted/30 p-3" onSubmit={onSubmit}>
      <label className="block">
        <span className="text-xs font-medium text-muted-foreground">
          {columnLabels[type]} title
        </span>
        <input
          className="mt-1.5 h-9 w-full rounded-md border bg-background px-3 text-sm outline-none transition focus:border-primary/60 focus:ring-1 focus:ring-primary/30"
          autoFocus
          disabled={isSubmitting}
          onChange={(event) => onTitleChange(event.target.value)}
          placeholder={`New ${columnLabels[type]}`}
          value={titleValue}
        />
      </label>

      {type === "plan" ? (
        <label className="mt-3 block">
          <span className="text-xs font-medium text-muted-foreground">Category</span>
          <select
            className="mt-1.5 h-9 w-full rounded-md border bg-background px-3 text-sm outline-none transition focus:border-primary/60 focus:ring-1 focus:ring-primary/30"
            disabled={isSubmitting}
            onChange={(event) => onCategoryChange(event.target.value)}
            value={categoryId}
          >
            <option value="">No category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {errorMessage ? (
        <p className="mt-2 text-xs text-destructive">{errorMessage}</p>
      ) : null}

      <div className="mt-3 flex justify-end gap-2">
        <Button disabled={isSubmitting} size="sm" type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button disabled={isSubmitting} size="sm" type="submit">
          {isSubmitting ? "Adding" : "Add"}
        </Button>
      </div>
    </form>
  );
}

function SortableNodeCard({
  node,
  selected,
  category,
  progress,
  onSelect,
}: {
  node: WorkspaceNode;
  selected: boolean;
  category?: PlanCategory;
  progress: number;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: node.id,
      transition: {
        duration: 120,
        easing: "cubic-bezier(0.2, 0, 0, 1)",
      },
    });
  const status = statusMeta[node.status];
  const StatusIcon = status.icon;

  const style = {
    position: "relative" as const,
    transform: transform ? `translate3d(0, ${Math.round(transform.y)}px, 0)` : undefined,
    transition: isDragging ? "none" : transition,
    zIndex: isDragging ? 50 : undefined,
    willChange: "transform",
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={cn(
        "group select-none rounded-lg border bg-background p-3 shadow-sm transition-colors",
        selected && "border-primary bg-primary/5 ring-1 ring-primary/30",
        isDragging && "shadow-md ring-1 ring-primary/30",
      )}
    >
      <div className="flex items-start gap-2">
        <button
          className="mt-0.5 touch-none cursor-grab rounded p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground active:cursor-grabbing"
          aria-label={`Reorder ${node.title}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" aria-hidden="true" />
        </button>
        <button className="min-w-0 flex-1 text-left" onClick={onSelect}>
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-2 text-sm font-medium leading-5">{node.title}</h3>
            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
                status.className,
              )}
            >
              <StatusIcon className="h-3 w-3" aria-hidden="true" />
              {status.label}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {category ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: category.color ?? "#64748b" }}
                />
                {category.name}
              </span>
            ) : null}
          </div>
          <ProgressBar value={progress} className="mt-3" />
        </button>
      </div>
    </article>
  );
}

function DetailPanel({
  node,
  goal,
  plan,
  nodes,
  categories,
}: {
  node?: WorkspaceNode;
  goal?: WorkspaceNode;
  plan?: WorkspaceNode;
  nodes: WorkspaceNode[];
  categories: PlanCategory[];
}) {
  if (!node) {
    return (
      <Card className="min-h-[34rem] rounded-lg shadow-none">
        <CardHeader className="border-b p-4">
          <CardTitle className="text-base">Detail Panel</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  const status = statusMeta[node.status];
  const StatusIcon = status.icon;
  const parent = node.parentId ? nodes.find((item) => item.id === node.parentId) : undefined;
  const progress = getNodeProgress(node, nodes);
  const category = categories.find((item) => item.id === node.categoryId);

  return (
    <Card className="min-h-[34rem] rounded-lg shadow-none">
      <CardHeader className="border-b p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardDescription>{columnLabels[node.type]}</CardDescription>
            <CardTitle className="mt-1 text-lg leading-6">{node.title}</CardTitle>
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium",
              status.className,
            )}
          >
            <StatusIcon className="h-3 w-3" aria-hidden="true" />
            {status.label}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 p-4">
        <DetailSection title="Progress">
          <div className="flex items-center gap-3">
            <ProgressBar value={progress} className="flex-1" />
            <span className="w-10 text-right text-sm font-medium">{progress}%</span>
          </div>
        </DetailSection>

        {node.type === "goal" ? (
          <>
            <DetailSection title="Why it matters">
              <p className="text-sm leading-6 text-muted-foreground">
                {node.importanceReason ?? "No reason added."}
              </p>
            </DetailSection>
            <DetailSection title="Success criteria">
              <p className="text-sm leading-6 text-muted-foreground">
                {node.successCriteriaText ?? "No criteria added."}
              </p>
            </DetailSection>
          </>
        ) : null}

        {node.type === "plan" ? (
          <DetailSection title="Linked Goal">
            <DetailValue label="Goal" value={goal?.title ?? parent?.title ?? "-"} />
            <DetailValue label="Category" value={category?.name ?? "-"} />
          </DetailSection>
        ) : null}

        {node.type === "task" ? (
          <DetailSection title="Linked Plan">
            <DetailValue label="Plan" value={plan?.title ?? parent?.title ?? "-"} />
            <Button className="mt-3 w-full" variant="outline">
              Add to Today TODO
            </Button>
          </DetailSection>
        ) : null}

        <DetailSection title="Dates">
          <div className="grid gap-3 text-sm">
            <DetailValue
              label="Planned"
              value={formatDateRange(node.plannedStartDate, node.plannedEndDate)}
            />
            <DetailValue
              label="Actual"
              value={formatDateRange(node.actualStartDate, node.actualEndDate)}
            />
          </div>
        </DetailSection>

        <DetailSection title="Memo">
          <p className="text-sm leading-6 text-muted-foreground">{node.memo ?? "No memo."}</p>
        </DetailSection>

        <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Timer className="h-3.5 w-3.5" aria-hidden="true" />
            <span>sortOrder {node.sortOrder}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

function DetailValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md border bg-background px-3 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="truncate text-sm font-medium">{value}</span>
    </div>
  );
}

function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("h-2 overflow-hidden rounded-full bg-muted", className)}>
      <div
        className="h-full rounded-full bg-primary transition-all"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

function getSortedChildren(
  nodes: WorkspaceNode[],
  type: NodeType,
  parentId: string | null,
) {
  return nodes
    .filter((node) => node.type === type && node.parentId === parentId && !node.trashedAt)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

function getNextSortOrder(
  nodes: WorkspaceNode[],
  type: NodeType,
  parentId: string | null,
) {
  const siblings = getSortedChildren(nodes, type, parentId);
  const maxSortOrder = siblings.reduce(
    (currentMax, node) => Math.max(currentMax, node.sortOrder),
    0,
  );

  return maxSortOrder + 1;
}

function getNodeProgress(node: WorkspaceNode, nodes: WorkspaceNode[]) {
  if (node.type === "task") {
    return node.status === "done" ? 100 : node.status === "in_progress" ? 50 : 0;
  }

  const tasks =
    node.type === "plan"
      ? nodes.filter((item) => item.type === "task" && item.parentId === node.id)
      : nodes.filter((item) => {
          if (item.type !== "task") {
            return false;
          }
          const parentPlan = nodes.find((plan) => plan.id === item.parentId);
          return parentPlan?.parentId === node.id;
        });

  const calculableTasks = tasks.filter(
    (task) => task.status !== "paused" && !task.trashedAt,
  );

  if (calculableTasks.length === 0) {
    return 0;
  }

  const doneTasks = calculableTasks.filter((task) => task.status === "done");
  return Math.round((doneTasks.length / calculableTasks.length) * 100);
}

function formatDateRange(start?: string | null, end?: string | null) {
  if (!start && !end) {
    return "-";
  }

  if (start && end && start !== end) {
    return `${start} - ${end}`;
  }

  return start ?? end ?? "-";
}

function restrictToSortableStack({
  activeNodeRect,
  containerNodeRect,
  transform,
}: Parameters<Modifier>[0]) {
  if (!activeNodeRect || !containerNodeRect) {
    return { ...transform, x: 0 };
  }

  const minY = containerNodeRect.top - activeNodeRect.top;
  const maxY = containerNodeRect.bottom - activeNodeRect.bottom;

  return {
    ...transform,
    x: 0,
    y: softClamp(transform.y, minY, maxY),
  };
}

function softClamp(value: number, min: number, max: number) {
  if (max < min) {
    return min;
  }

  if (value < min) {
    return min - getBoundaryOvershoot(min - value);
  }

  if (value > max) {
    return max + getBoundaryOvershoot(value - max);
  }

  return value;
}

function getBoundaryOvershoot(distance: number) {
  return dragBoundaryOvershoot * (1 - Math.exp(-distance / dragBoundarySoftness));
}
