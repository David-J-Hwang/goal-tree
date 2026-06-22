"use client";

import {
  type FormEvent,
  type KeyboardEvent,
  type RefObject,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
  Ban,
  CheckCircle2,
  Circle,
  Clock3,
  GripVertical,
  PauseCircle,
  Plus,
  Search,
  X,
  ListTodo,
  Trash2,
} from "lucide-react";

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
import { syncAncestorStatuses } from "@/lib/goaltree/parent-status-sync";
import {
  mapTodayTodoRow,
  todayTodoSelectColumns,
  type TodayTodoRow,
} from "@/lib/goaltree/today-todo-rows";
import {
  appPageContentClassName,
  appPageMainClassName,
} from "@/lib/page-layout";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type {
  GoalTreeNode,
  NodeStatus,
  NodeType,
  PlanCategory,
  TodayTodo,
  UserSettings,
} from "@/types/domain";

type WorkspaceNode = GoalTreeNode & {
  note?: string;
};
type CreateNodeInput = {
  type: NodeType;
  parentId: string | null;
  title: string;
  categoryId?: string | null;
};
type UpdateNodeInput = {
  id: string;
  parentId: string | null;
  title: string;
  memo: string | null;
  status: NodeStatus;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  actualStartDate: string | null;
  actualEndDate: string | null;
  importanceReason: string | null;
  successCriteriaText: string | null;
  categoryId: string | null;
};

const statusMeta: Record<
  NodeStatus,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    className: string;
    iconClassName: string;
  }
> = {
  not_started: {
    label: "시작전",
    icon: Circle,
    className:
      "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700/55 dark:bg-slate-800/45 dark:text-slate-400",
    iconClassName: "text-slate-600 dark:text-slate-400",
  },
  in_progress: {
    label: "진행중",
    icon: Clock3,
    className:
      "border-blue-300/70 bg-blue-50 text-blue-700 dark:border-blue-600/55 dark:bg-blue-900/25 dark:text-blue-300/90",
    iconClassName: "text-blue-700 dark:text-blue-300/90",
  },
  blocked: {
    label: "막힘",
    icon: Ban,
    className:
      "border-red-200 bg-red-50 text-red-700 dark:border-red-800/40 dark:bg-red-950/25 dark:text-red-300/80",
    iconClassName: "text-red-700 dark:text-red-300/80",
  },
  done: {
    label: "완료",
    icon: CheckCircle2,
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/25 dark:text-emerald-300/80",
    iconClassName: "text-emerald-700 dark:text-emerald-300/80",
  },
  paused: {
    label: "보류",
    icon: PauseCircle,
    className:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/40 dark:bg-amber-950/25 dark:text-amber-300/80",
    iconClassName: "text-amber-700 dark:text-amber-300/80",
  },
};

const columnLabels: Record<NodeType, string> = {
  goal: "Goal",
  plan: "Plan",
  task: "Task",
};
const statusOptions: NodeStatus[] = [
  "not_started",
  "in_progress",
  "blocked",
  "done",
  "paused",
];

export function WorkspaceBoard({
  initialCategories,
  initialNodes,
  initialSelectedNodeId,
  initialSettings,
  initialTodayDate,
  initialTodayTodos,
  userId,
}: {
  initialCategories: PlanCategory[];
  initialNodes: GoalTreeNode[];
  initialSelectedNodeId: string | null;
  initialSettings: UserSettings;
  initialTodayDate: string;
  initialTodayTodos: TodayTodo[];
  userId: string;
}) {
  const initialSelection = useMemo(
    () => getSelectionForNode(initialNodes, initialSelectedNodeId),
    [initialNodes, initialSelectedNodeId],
  );
  const [nodes, setNodes] = useState<WorkspaceNode[]>(initialNodes);
  const [todayTodos, setTodayTodos] = useState<TodayTodo[]>(initialTodayTodos);
  const [planCategories, setPlanCategories] =
    useState<PlanCategory[]>(initialCategories);
  const [userSettings, setUserSettings] = useState<UserSettings>(initialSettings);
  const nodesRef = useRef<WorkspaceNode[]>(initialNodes);
  const [selectedGoalId, setSelectedGoalId] = useState(initialSelection.goalId);
  const [selectedPlanId, setSelectedPlanId] = useState(initialSelection.planId);
  const [selectedNodeId, setSelectedNodeId] = useState(initialSelection.nodeId);
  const [searchQuery, setSearchQuery] = useState("");
  const [isTrashMutationInProgress, setIsTrashMutationInProgress] =
    useState(false);
  const searchTerm = searchQuery.trim();
  const isSearchMode = searchTerm.length > 0;

  const goals = useMemo(() => getSortedChildren(nodes, "goal", null), [nodes]);
  const plans = useMemo(
    () => getSortedChildren(nodes, "plan", selectedGoalId),
    [nodes, selectedGoalId],
  );
  const tasks = useMemo(
    () => getSortedChildren(nodes, "task", selectedPlanId),
    [nodes, selectedPlanId],
  );
  const searchResults = useMemo(
    () => getSearchResults(nodes, planCategories, searchTerm),
    [nodes, planCategories, searchTerm],
  );
  const visibleGoals = isSearchMode ? searchResults.goals : goals;
  const visiblePlans = isSearchMode ? searchResults.plans : plans;
  const visibleTasks = isSearchMode ? searchResults.tasks : tasks;

  const selectedNode =
    nodes.find((node) => node.id === selectedNodeId && isNodeVisible(node, nodes)) ??
    goals[0];
  const selectedGoal = nodes.find(
    (node) => node.id === selectedGoalId && isNodeVisible(node, nodes),
  );
  const selectedPlan = nodes.find(
    (node) => node.id === selectedPlanId && isNodeVisible(node, nodes),
  );

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    setNodes(initialNodes);
    nodesRef.current = initialNodes;
  }, [initialNodes]);

  useEffect(() => {
    setTodayTodos(initialTodayTodos);
  }, [initialTodayTodos]);

  useEffect(() => {
    setPlanCategories(initialCategories);
  }, [initialCategories]);

  useEffect(() => {
    setUserSettings(initialSettings);
  }, [initialSettings]);

  useEffect(() => {
    const nextSelection = getSelectionForNode(
      nodesRef.current,
      initialSelectedNodeId,
    );

    setSelectedGoalId(nextSelection.goalId);
    setSelectedPlanId(nextSelection.planId);
    setSelectedNodeId(nextSelection.nodeId);
  }, [initialSelectedNodeId]);

  function handleSelect(node: WorkspaceNode) {
    const nextSelection = getSelectionForNode(nodes, node.id);

    setSelectedGoalId(nextSelection.goalId);
    setSelectedPlanId(nextSelection.planId);
    setSelectedNodeId(nextSelection.nodeId);
  }

  async function handleReorder(type: NodeType, parentId: string | null, orderedIds: string[]) {
    const previousNodes = nodes;
    const nextNodes = nodes.map((node) => {
      if (node.type !== type || node.parentId !== parentId) {
        return node;
      }

      const index = orderedIds.indexOf(node.id);
      return index === -1 ? node : { ...node, sortOrder: index + 1 };
    });

    setNodes(nextNodes);

    const supabase = createSupabaseBrowserClient();
    const updates = orderedIds.map((id, index) =>
      supabase
        .from("nodes")
        .update({ sort_order: index + 1 })
        .eq("id", id)
        .eq("user_id", userId),
    );

    const results = await Promise.all(updates);
    const failedResult = results.find((result) => result.error);

    if (failedResult?.error) {
      setNodes(previousNodes);
      throw new Error(failedResult.error.message);
    }
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

    const nextNodes = await syncAncestorStatuses({
      autoFillActualDatesOnStatusChange:
        userSettings.autoFillActualDatesOnStatusChange,
      nodes: [...nodes, createdNode],
      parentIds: [createdNode.parentId],
      supabase,
      userId,
    });

    setNodes(nextNodes);
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

  async function handleUpdateNode(input: UpdateNodeInput) {
    const currentNode = nodes.find((node) => node.id === input.id);

    if (!currentNode) {
      throw new Error("Node was not found.");
    }

    if (currentNode.type === "goal" && input.parentId !== null) {
      throw new Error("Goal cards cannot be linked to another card.");
    }

    if (currentNode.type === "plan") {
      const nextParent = getVisibleNode(nodes, input.parentId);

      if (!nextParent || nextParent.type !== "goal") {
        throw new Error("Select a valid linked Goal.");
      }
    }

    if (currentNode.type === "task") {
      const nextParent = getVisibleNode(nodes, input.parentId);

      if (!nextParent || nextParent.type !== "plan") {
        throw new Error("Select a valid linked Plan.");
      }
    }

    const isParentChanging = currentNode.parentId !== input.parentId;
    const nextSortOrder = isParentChanging
      ? getNextSortOrder(nodes, currentNode.type, input.parentId)
      : currentNode.sortOrder;
    const nextDates = getDateValuesWithStatusUpdates(
      currentNode,
      input,
      userSettings.autoFillActualDatesOnStatusChange,
    );
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("nodes")
      .update({
        parent_id: input.parentId,
        title: input.title,
        memo: input.memo,
        status: input.status,
        planned_start_date: input.plannedStartDate,
        planned_end_date: input.plannedEndDate,
        actual_start_date: nextDates.actualStartDate,
        actual_end_date: nextDates.actualEndDate,
        importance_reason:
          currentNode.type === "goal" ? input.importanceReason : null,
        success_criteria_text:
          currentNode.type === "goal" ? input.successCriteriaText : null,
        category_id: currentNode.type === "plan" ? input.categoryId : null,
        sort_order: nextSortOrder,
      })
      .eq("id", input.id)
      .eq("user_id", userId)
      .select(nodeSelectColumns)
      .single()
      .returns<NodeRow>();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      throw new Error("Updated node was not returned.");
    }

    const updatedNode = mapNodeRow(data);
    const nextNodes = nodes.map((node) =>
      node.id === updatedNode.id ? updatedNode : node,
    );
    const syncedNodes = await syncAncestorStatuses({
      autoFillActualDatesOnStatusChange:
        userSettings.autoFillActualDatesOnStatusChange,
      nodes: nextNodes,
      parentIds: [currentNode.parentId, updatedNode.parentId],
      supabase,
      userId,
    });

    setNodes(syncedNodes);

    if (isParentChanging) {
      const nextSelection = getSelectionForNode(syncedNodes, updatedNode.id);

      setSelectedGoalId(nextSelection.goalId);
      setSelectedPlanId(nextSelection.planId);
      setSelectedNodeId(nextSelection.nodeId);
    }
  }

  async function handleMoveNodeToTrash(nodeId: string) {
    const currentNode = nodes.find((node) => node.id === nodeId);

    if (!currentNode) {
      throw new Error("Node was not found.");
    }

    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("nodes")
      .update({ trashed_at: new Date().toISOString() })
      .eq("id", nodeId)
      .eq("user_id", userId)
      .select(nodeSelectColumns)
      .single()
      .returns<NodeRow>();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      throw new Error("Trashed node was not returned.");
    }

    const trashedNode = mapNodeRow(data);
    const nextNodes = nodes.map((node) =>
      node.id === trashedNode.id ? trashedNode : node,
    );
    const syncedNodes = await syncAncestorStatuses({
      autoFillActualDatesOnStatusChange:
        userSettings.autoFillActualDatesOnStatusChange,
      nodes: nextNodes,
      parentIds: [currentNode.parentId],
      supabase,
      userId,
    });
    const nextSelection = getSelectionAfterTrash(syncedNodes, trashedNode);

    setNodes(syncedNodes);
    setSelectedGoalId(nextSelection.goalId);
    setSelectedPlanId(nextSelection.planId);
    setSelectedNodeId(nextSelection.nodeId);
  }

  async function handleToggleTodayTodo(taskId: string) {
    const currentNode = nodes.find((node) => node.id === taskId);

    if (!currentNode) {
      throw new Error("Task was not found.");
    }

    if (currentNode.type !== "task") {
      throw new Error("Only Task cards can be added to Today TODO.");
    }

    const existingTodo = todayTodos.find(
      (todo) => todo.taskId === taskId && todo.date === initialTodayDate,
    );
    const supabase = createSupabaseBrowserClient();

    if (existingTodo) {
      const { error } = await supabase
        .from("today_todos")
        .delete()
        .eq("id", existingTodo.id)
        .eq("user_id", userId);

      if (error) {
        throw new Error(error.message);
      }

      setTodayTodos((currentTodos) =>
        currentTodos.filter((todo) => todo.id !== existingTodo.id),
      );
      return;
    }

    const { data, error } = await supabase
      .from("today_todos")
      .insert({
        user_id: userId,
        task_id: taskId,
        date: initialTodayDate,
        sort_order: getNextTodoSortOrder(todayTodos, initialTodayDate),
      })
      .select(todayTodoSelectColumns)
      .single()
      .returns<TodayTodoRow>();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      throw new Error("Today TODO was not returned.");
    }

    const createdTodo = mapTodayTodoRow(data);
    setTodayTodos((currentTodos) => [...currentTodos, createdTodo]);
  }

  return (
    <main className={appPageMainClassName}>
      <div className={cn(appPageContentClassName, "max-w-[1800px]")}>
        <header className="shrink-0">
          <div className="flex w-full flex-col gap-4 border-b pb-5 lg:flex-row lg:items-end lg:justify-between 2xl:mx-auto 2xl:max-w-[1708px]">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Goaltree</p>
              <h1 className="mt-1 text-2xl font-semibold">Workspace</h1>
            </div>
            <div className="flex w-full items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm text-muted-foreground shadow-sm transition focus-within:border-primary/60 focus-within:ring-1 focus-within:ring-primary/30 lg:w-80">
              <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
              <input
                aria-label="Search Goal, Plan, Task"
                className="min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-60 [&::-webkit-search-cancel-button]:hidden"
                disabled={isTrashMutationInProgress}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search Goal, Plan, Task"
                type="search"
                value={searchQuery}
              />
              {searchQuery ? (
                <button
                  aria-label="Clear search"
                  className="rounded p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
                  disabled={isTrashMutationInProgress}
                  onClick={() => setSearchQuery("")}
                  type="button"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              ) : null}
            </div>
          </div>
        </header>

        <section className="mt-5 grid gap-4 xl:min-h-0 xl:flex-1 xl:grid-cols-[minmax(230px,1fr)_minmax(260px,1fr)_minmax(280px,1fr)_360px] 2xl:grid-cols-[minmax(300px,380px)_minmax(360px,460px)_minmax(320px,420px)_minmax(340px,400px)] 2xl:justify-center">
          <WorkspaceColumn
            type="goal"
            allNodes={nodes}
            parentId={null}
            title="Goals"
            nodes={visibleGoals}
            selectedId={selectedGoalId}
            categories={planCategories}
            emptyMessage={isSearchMode ? "No matching Goals" : "No Goal cards yet"}
            isWorkspaceLocked={isTrashMutationInProgress}
            isSearchMode={isSearchMode}
            onCreate={handleCreateNode}
            onSelect={handleSelect}
            onReorder={handleReorder}
            summary={
              isSearchMode
                ? formatResultCount(visibleGoals.length)
                : `${goals.length} active goals`
            }
          />
          <WorkspaceColumn
            type="plan"
            allNodes={nodes}
            parentId={selectedGoalId}
            title="Plans"
            nodes={visiblePlans}
            selectedId={selectedPlanId}
            categories={planCategories}
            isWorkspaceLocked={isTrashMutationInProgress}
            isSearchMode={isSearchMode}
            onCreate={handleCreateNode}
            onSelect={handleSelect}
            onReorder={handleReorder}
            emptyMessage={
              isSearchMode
                ? "No matching Plans"
                : selectedGoalId
                  ? "No Plan cards yet"
                  : "Select a goal card to view plans"
            }
            summary={
              isSearchMode
                ? formatResultCount(visiblePlans.length)
                : selectedGoal
                  ? selectedGoal.title
                  : "No goal selected"
            }
          />
          <WorkspaceColumn
            type="task"
            allNodes={nodes}
            parentId={selectedPlanId}
            title="Tasks"
            nodes={visibleTasks}
            selectedId={selectedNodeId}
            categories={planCategories}
            isWorkspaceLocked={isTrashMutationInProgress}
            isSearchMode={isSearchMode}
            onCreate={handleCreateNode}
            onSelect={handleSelect}
            onReorder={handleReorder}
            emptyMessage={
              isSearchMode
                ? "No matching Tasks"
                : selectedPlanId
                  ? undefined
                  : "Select a plan card to view tasks"
            }
            summary={
              isSearchMode
                ? formatResultCount(visibleTasks.length)
                : selectedPlan
                  ? selectedPlan.title
                  : "No plan selected"
            }
          />
          <DetailPanel
            node={selectedNode}
            nodes={nodes}
            categories={planCategories}
            isSelectedTaskInTodayTodo={
              selectedNode?.type === "task" &&
              todayTodos.some(
                (todo) =>
                  todo.taskId === selectedNode.id &&
                  todo.date === initialTodayDate,
              )
            }
            isWorkspaceLocked={isTrashMutationInProgress}
            onMoveNodeToTrash={handleMoveNodeToTrash}
            onTrashMutationChange={setIsTrashMutationInProgress}
            onToggleTodayTodo={handleToggleTodayTodo}
            onUpdateNode={handleUpdateNode}
            autoFillActualDatesOnStatusChange={
              userSettings.autoFillActualDatesOnStatusChange
            }
          />
        </section>
      </div>
    </main>
  );
}

function WorkspaceColumn({
  allNodes,
  type,
  parentId,
  title,
  summary,
  nodes,
  selectedId,
  categories,
  emptyMessage,
  isWorkspaceLocked,
  isSearchMode,
  onCreate,
  onSelect,
  onReorder,
}: {
  allNodes: WorkspaceNode[];
  type: NodeType;
  parentId: string | null;
  title: string;
  summary: string;
  nodes: WorkspaceNode[];
  selectedId: string;
  categories: PlanCategory[];
  emptyMessage?: string;
  isWorkspaceLocked: boolean;
  isSearchMode: boolean;
  onCreate: (input: CreateNodeInput) => Promise<void>;
  onSelect: (node: WorkspaceNode) => void;
  onReorder: (
    type: NodeType,
    parentId: string | null,
    orderedIds: string[],
  ) => Promise<void>;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [titleValue, setTitleValue] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [reorderErrorMessage, setReorderErrorMessage] = useState("");
  const addButtonRef = useRef<HTMLButtonElement | null>(null);
  const addFormRef = useRef<HTMLFormElement | null>(null);
  const canAdd =
    !isWorkspaceLocked && !isSearchMode && (type === "goal" || Boolean(parentId));
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

  useEffect(() => {
    if (!isSearchMode) {
      return;
    }

    setIsAdding(false);
    setTitleValue("");
    setErrorMessage("");
    setReorderErrorMessage("");
  }, [isSearchMode]);

  useEffect(() => {
    if (!isAdding || isSubmitting || isWorkspaceLocked) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (addFormRef.current?.contains(target)) {
        return;
      }

      if (addButtonRef.current?.contains(target)) {
        return;
      }

      setIsAdding(false);
      setTitleValue("");
      setErrorMessage("");
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isAdding, isSubmitting, isWorkspaceLocked]);

  async function handleDragEnd(event: DragEndEvent) {
    if (isSearchMode || isWorkspaceLocked) {
      return;
    }

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
    setIsReordering(true);
    setReorderErrorMessage("");

    try {
      await onReorder(type, parentId, orderedIds);
    } catch (error) {
      setReorderErrorMessage(
        error instanceof Error ? error.message : "Failed to save card order.",
      );
    } finally {
      setIsReordering(false);
    }
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
        isWorkspaceLocked
          ? "Wait until the current trash action is finished."
          : type === "plan"
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
    <Card className="flex min-h-[34rem] flex-col overflow-hidden rounded-lg shadow-none xl:h-full xl:min-h-0">
      <CardHeader className="shrink-0 border-b p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription className="mt-1 line-clamp-1">{summary}</CardDescription>
          </div>
          <Button
            ref={addButtonRef}
            className="h-8 w-8 shrink-0 text-muted-foreground hover:bg-muted hover:text-foreground"
            size="icon"
            variant="ghost"
            aria-label={`Add ${columnLabels[type]}`}
            disabled={!canAdd || isReordering}
            onClick={() => {
              setIsAdding(true);
              setErrorMessage("");
            }}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 overflow-y-auto p-3">
        {reorderErrorMessage ? (
          <p className="mb-3 rounded-md border border-destructive/25 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            {reorderErrorMessage}
          </p>
        ) : null}
        {!isSearchMode && isAdding ? (
          <AddNodeForm
            formRef={addFormRef}
            type={type}
            titleValue={titleValue}
            categoryId={categoryId}
            categories={categories}
            errorMessage={errorMessage}
            isSubmitting={isSubmitting}
            isWorkspaceLocked={isWorkspaceLocked}
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
                    progress={getNodeProgress(node, allNodes)}
                    isReorderDisabled={isSearchMode || isWorkspaceLocked}
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
  formRef,
  type,
  titleValue,
  categoryId,
  categories,
  errorMessage,
  isSubmitting,
  isWorkspaceLocked,
  onCancel,
  onCategoryChange,
  onSubmit,
  onTitleChange,
}: {
  formRef: RefObject<HTMLFormElement | null>;
  type: NodeType;
  titleValue: string;
  categoryId: string;
  categories: PlanCategory[];
  errorMessage: string;
  isSubmitting: boolean;
  isWorkspaceLocked: boolean;
  onCancel: () => void;
  onCategoryChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onTitleChange: (value: string) => void;
}) {
  return (
    <form
      className="mb-3 rounded-md border bg-muted/30 p-3"
      onSubmit={onSubmit}
      ref={formRef}
    >
      <label className="block">
        <span className="text-xs font-medium text-muted-foreground">
          {columnLabels[type]} title
        </span>
        <input
          className="mt-1.5 h-9 w-full rounded-md border bg-background px-3 text-sm outline-none transition focus:border-primary/60 focus:ring-1 focus:ring-primary/30"
          autoFocus
          disabled={isSubmitting || isWorkspaceLocked}
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
            disabled={isSubmitting || isWorkspaceLocked}
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
        <Button
          disabled={isSubmitting || isWorkspaceLocked}
          size="sm"
          type="button"
          variant="ghost"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button disabled={isSubmitting || isWorkspaceLocked} size="sm" type="submit">
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
  isReorderDisabled,
  onSelect,
}: {
  node: WorkspaceNode;
  selected: boolean;
  category?: PlanCategory;
  progress: number;
  isReorderDisabled: boolean;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: node.id,
      disabled: isReorderDisabled,
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
          className={cn(
            "mt-0.5 touch-none rounded p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground",
            isReorderDisabled
              ? "cursor-default opacity-50 hover:bg-transparent hover:text-muted-foreground"
              : "cursor-grab active:cursor-grabbing",
          )}
          aria-label={`Reorder ${node.title}`}
          disabled={isReorderDisabled}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" aria-hidden="true" />
        </button>
        <button className="min-w-0 flex-1 text-left" onClick={onSelect}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              {category ? (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: category.color ?? "#64748b" }}
                  />
                  {category.name}
                </span>
              ) : null}
              <h3 className="line-clamp-2 text-sm font-medium leading-5">
                {node.title}
              </h3>
            </div>
            <span
              aria-label={status.label}
              title={status.label}
              className={cn(
                "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
                "h-6 w-6 justify-center px-0",
                status.className,
              )}
            >
              <StatusIcon className="h-3 w-3" aria-hidden="true" />
            </span>
          </div>
          <ProgressBar value={progress} className="mt-3" />
        </button>
      </div>
    </article>
  );
}

function DetailPanel({
  autoFillActualDatesOnStatusChange,
  node,
  nodes,
  categories,
  isSelectedTaskInTodayTodo,
  isWorkspaceLocked,
  onMoveNodeToTrash,
  onTrashMutationChange,
  onToggleTodayTodo,
  onUpdateNode,
}: {
  autoFillActualDatesOnStatusChange: boolean;
  node?: WorkspaceNode;
  nodes: WorkspaceNode[];
  categories: PlanCategory[];
  isSelectedTaskInTodayTodo: boolean;
  isWorkspaceLocked: boolean;
  onMoveNodeToTrash: (nodeId: string) => Promise<void>;
  onTrashMutationChange: (isMovingToTrash: boolean) => void;
  onToggleTodayTodo: (taskId: string) => Promise<void>;
  onUpdateNode: (input: UpdateNodeInput) => Promise<void>;
}) {
  const [titleValue, setTitleValue] = useState(node?.title ?? "");
  const [memoValue, setMemoValue] = useState(node?.memo ?? "");
  const [statusValue, setStatusValue] = useState<NodeStatus>(
    node?.status ?? "not_started",
  );
  const [plannedStartDateValue, setPlannedStartDateValue] = useState(
    node?.plannedStartDate ?? "",
  );
  const [plannedEndDateValue, setPlannedEndDateValue] = useState(
    node?.plannedEndDate ?? "",
  );
  const [actualStartDateValue, setActualStartDateValue] = useState(
    node?.actualStartDate ?? "",
  );
  const [actualEndDateValue, setActualEndDateValue] = useState(
    node?.actualEndDate ?? "",
  );
  const [importanceReasonValue, setImportanceReasonValue] = useState(
    node?.importanceReason ?? "",
  );
  const [successCriteriaValue, setSuccessCriteriaValue] = useState(
    node?.successCriteriaText ?? "",
  );
  const [parentIdValue, setParentIdValue] = useState(node?.parentId ?? "");
  const [categoryIdValue, setCategoryIdValue] = useState(node?.categoryId ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [isMovingToTrash, setIsMovingToTrash] = useState(false);
  const [isUpdatingTodayTodo, setIsUpdatingTodayTodo] = useState(false);
  const [isConfirmingTrash, setIsConfirmingTrash] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const trashButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!node) {
      return;
    }

    setTitleValue(node.title);
    setMemoValue(node.memo ?? "");
    setStatusValue(node.status);
    setPlannedStartDateValue(node.plannedStartDate ?? "");
    setPlannedEndDateValue(node.plannedEndDate ?? "");
    setActualStartDateValue(node.actualStartDate ?? "");
    setActualEndDateValue(node.actualEndDate ?? "");
    setImportanceReasonValue(node.importanceReason ?? "");
    setSuccessCriteriaValue(node.successCriteriaText ?? "");
    setParentIdValue(node.parentId ?? "");
    setCategoryIdValue(node.categoryId ?? "");
  }, [
    node?.actualEndDate,
    node?.actualStartDate,
    node?.categoryId,
    node?.id,
    node?.importanceReason,
    node?.memo,
    node?.parentId,
    node?.plannedEndDate,
    node?.plannedStartDate,
    node?.status,
    node?.successCriteriaText,
    node?.title,
  ]);

  useEffect(() => {
    setSaveError("");
    setSaveMessage("");
    setIsConfirmingTrash(false);
  }, [node?.id]);

  useEffect(() => {
    if (!isConfirmingTrash) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (trashButtonRef.current?.contains(target)) {
        return;
      }

      setIsConfirmingTrash(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isConfirmingTrash]);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!node || isWorkspaceLocked) {
      return;
    }

    const trimmedTitle = titleValue.trim();
    const trimmedMemo = memoValue.trim();
    const plannedStartDate = emptyStringToNull(plannedStartDateValue);
    const plannedEndDate = emptyStringToNull(plannedEndDateValue);
    const actualStartDate = emptyStringToNull(actualStartDateValue);
    const actualEndDate = emptyStringToNull(actualEndDateValue);
    const parentId = node.type === "goal" ? null : parentIdValue || null;

    if (node.type === "plan") {
      const linkedGoal = getVisibleNode(nodes, parentId);

      if (!linkedGoal || linkedGoal.type !== "goal") {
        setSaveError("Select a linked Goal.");
        setSaveMessage("");
        return;
      }
    }

    if (node.type === "task") {
      const linkedPlan = getVisibleNode(nodes, parentId);

      if (!linkedPlan || linkedPlan.type !== "plan") {
        setSaveError("Select a linked Plan.");
        setSaveMessage("");
        return;
      }
    }

    const nextInput = {
      id: node.id,
      parentId,
      title: trimmedTitle,
      memo: trimmedMemo || null,
      status: statusValue,
      plannedStartDate,
      plannedEndDate,
      actualStartDate,
      actualEndDate,
      importanceReason:
        node.type === "goal" ? emptyStringToNull(importanceReasonValue) : null,
      successCriteriaText:
        node.type === "goal" ? emptyStringToNull(successCriteriaValue) : null,
      categoryId: node.type === "plan" ? categoryIdValue || null : null,
    };
    const nextActualDates = getDateValuesWithStatusUpdates(
      node,
      nextInput,
      autoFillActualDatesOnStatusChange,
    );

    if (!trimmedTitle) {
      setSaveError("Title is required.");
      setSaveMessage("");
      return;
    }

    if (!isValidDateRange(plannedStartDate, plannedEndDate)) {
      setSaveError("Planned start date must be before planned end date.");
      setSaveMessage("");
      return;
    }

    if (!isValidDateRange(nextActualDates.actualStartDate, nextActualDates.actualEndDate)) {
      setSaveError("Actual start date must be before actual end date.");
      setSaveMessage("");
      return;
    }

    setIsSaving(true);
    setSaveError("");
    setSaveMessage("");

    try {
      await onUpdateNode(nextInput);
      setSaveMessage("Saved.");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Failed to save changes.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleTodayTodo() {
    if (!node || node.type !== "task" || isWorkspaceLocked) {
      return;
    }

    setIsUpdatingTodayTodo(true);
    setSaveError("");
    setSaveMessage("");

    try {
      await onToggleTodayTodo(node.id);
      setSaveMessage(
        isSelectedTaskInTodayTodo
          ? "Removed from Today TODO."
          : "Added to Today TODO.",
      );
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Failed to update Today TODO.",
      );
    } finally {
      setIsUpdatingTodayTodo(false);
    }
  }

  async function handleMoveToTrash() {
    if (!node) {
      return;
    }

    if (!isConfirmingTrash) {
      setIsConfirmingTrash(true);
      setSaveError("");
      setSaveMessage("");
      return;
    }

    setIsMovingToTrash(true);
    onTrashMutationChange(true);
    setSaveError("");
    setSaveMessage("");

    try {
      await onMoveNodeToTrash(node.id);
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Failed to move card to trash.",
      );
      setIsConfirmingTrash(false);
    } finally {
      setIsMovingToTrash(false);
      onTrashMutationChange(false);
    }
  }

  function handleMemoKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) {
      return;
    }

    if (!event.ctrlKey && !event.metaKey) {
      return;
    }

    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }

  if (!node) {
    return (
      <Card className="flex min-h-[34rem] flex-col overflow-hidden rounded-lg shadow-none xl:h-full xl:min-h-0">
        <CardHeader className="shrink-0 border-b p-4">
          <CardTitle className="text-base">Details</CardTitle>
          <CardDescription className="mt-1">
            Select a card to view details
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const status = statusMeta[statusValue];
  const StatusIcon = status.icon;
  const progress = getNodeProgress(node, nodes);
  const goalOptions = getSortedChildren(nodes, "goal", null);
  const planOptions = sortSearchNodes(
    nodes.filter((item) => item.type === "plan" && isNodeVisible(item, nodes)),
    nodes,
  );
  const normalizedMemo = memoValue.trim();
  const normalizedImportanceReason = importanceReasonValue.trim();
  const normalizedSuccessCriteria = successCriteriaValue.trim();
  const isDetailInputDisabled = isSaving || isWorkspaceLocked;
  const hasChanges =
    titleValue.trim() !== node.title ||
    normalizedMemo !== (node.memo ?? "") ||
    statusValue !== node.status ||
    plannedStartDateValue !== (node.plannedStartDate ?? "") ||
    plannedEndDateValue !== (node.plannedEndDate ?? "") ||
    actualStartDateValue !== (node.actualStartDate ?? "") ||
    actualEndDateValue !== (node.actualEndDate ?? "") ||
    (node.type !== "goal" && parentIdValue !== (node.parentId ?? "")) ||
    (node.type === "goal" &&
      (normalizedImportanceReason !== (node.importanceReason ?? "") ||
        normalizedSuccessCriteria !== (node.successCriteriaText ?? ""))) ||
    (node.type === "plan" && categoryIdValue !== (node.categoryId ?? ""));

  return (
    <Card className="flex min-h-[34rem] flex-col overflow-hidden rounded-lg shadow-none xl:h-full xl:min-h-0">
      <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSave}>
        <CardHeader className="shrink-0 border-b p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="text-base">Details</CardTitle>
            </div>
            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium",
                status.className,
              )}
            >
              <StatusIcon className="h-3 w-3" aria-hidden="true" />
              {status.label}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2">
            <span className="inline-flex h-9 items-center rounded-md border bg-muted/25 px-2.5 text-xs font-medium text-muted-foreground">
              {columnLabels[node.type]}
            </span>
            <label className="min-w-0">
              <span className="sr-only">{columnLabels[node.type]} title</span>
              <input
                className="h-9 w-full rounded-md border bg-background px-3 text-sm font-medium outline-none transition focus:border-primary/60 focus:ring-1 focus:ring-primary/30"
                disabled={isDetailInputDisabled}
                onChange={(event) => setTitleValue(event.target.value)}
                value={titleValue}
              />
            </label>
          </div>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 pb-6 pt-3">
          <section className="rounded-lg border border-secondary/70 bg-secondary/35 p-3 dark:border-secondary/60 dark:bg-secondary/25">
            <h3 className="text-xs font-semibold uppercase text-secondary-foreground/80">
              Status
            </h3>
            <div className="relative mt-3">
              <StatusIcon
                className={cn(
                  "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2",
                  status.iconClassName,
                )}
                aria-hidden="true"
              />
              <select
                className="h-10 w-full rounded-md border bg-background px-3 pl-9 text-sm outline-none transition focus:border-secondary-foreground/40 focus:ring-1 focus:ring-secondary-foreground/20"
                disabled={isDetailInputDisabled}
                onChange={(event) =>
                  setStatusValue(event.target.value as NodeStatus)
                }
                value={statusValue}
              >
                {statusOptions.map((option) => (
                  <option key={option} value={option}>
                    {statusMeta[option].label}
                  </option>
                ))}
              </select>
            </div>
          </section>

          {node.type === "task" ? (
            <DetailSection title="Linked Plan">
              <select
                className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none transition focus:border-primary/60 focus:ring-1 focus:ring-primary/30"
                disabled={isDetailInputDisabled}
                onChange={(event) => setParentIdValue(event.target.value)}
                value={parentIdValue}
              >
                {planOptions.map((item) => {
                  const parentGoal = getVisibleNode(nodes, item.parentId);

                  return (
                    <option key={item.id} value={item.id}>
                      {parentGoal ? `${parentGoal.title} / ${item.title}` : item.title}
                    </option>
                  );
                })}
              </select>
            </DetailSection>
          ) : null}

          {node.type === "plan" ? (
            <DetailSection title="Linked Goal">
              <select
                className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none transition focus:border-primary/60 focus:ring-1 focus:ring-primary/30"
                disabled={isDetailInputDisabled}
                onChange={(event) => setParentIdValue(event.target.value)}
                value={parentIdValue}
              >
                {goalOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
              <label className="mt-3 block">
                <span className="text-xs font-medium text-muted-foreground">Category</span>
                <select
                  className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm outline-none transition focus:border-primary/60 focus:ring-1 focus:ring-primary/30"
                  disabled={isDetailInputDisabled}
                  onChange={(event) => setCategoryIdValue(event.target.value)}
                  value={categoryIdValue}
                >
                  <option value="">No category</option>
                  {categories.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
            </DetailSection>
          ) : null}

          <DetailSection title="Progress">
            <div className="flex items-center gap-3">
              <ProgressBar value={progress} className="flex-1" />
              <span className="w-10 text-right text-sm font-medium">{progress}%</span>
            </div>
          </DetailSection>

          {node.type === "task" ? (
            <Button
              className={cn(
                "w-full",
                isSelectedTaskInTodayTodo
                  ? "bg-secondary hover:bg-secondary/80"
                  : "bg-accent text-accent-foreground hover:bg-accent/80",
              )}
              disabled={isDetailInputDisabled || isMovingToTrash || isUpdatingTodayTodo}
              type="button"
              variant={isSelectedTaskInTodayTodo ? "secondary" : "outline"}
              onClick={handleToggleTodayTodo}
            >
              <ListTodo className="mr-2 h-4 w-4" aria-hidden="true" />
              {isUpdatingTodayTodo
                ? "Updating"
                : isSelectedTaskInTodayTodo
                  ? "Remove from Today TODO"
                  : "Add to Today TODO"}
            </Button>
          ) : null}

          {node.type === "goal" ? (
            <>
              <DetailSection title="Why it matters">
                <DetailTextArea
                  disabled={isDetailInputDisabled}
                  onChange={setImportanceReasonValue}
                  placeholder="Add a reason"
                  value={importanceReasonValue}
                />
              </DetailSection>
              <DetailSection title="Success criteria">
                <DetailTextArea
                  disabled={isDetailInputDisabled}
                  onChange={setSuccessCriteriaValue}
                  placeholder="Add success criteria"
                  value={successCriteriaValue}
                />
              </DetailSection>
            </>
          ) : null}

          <DetailSection title="Dates">
            <DateRangeFields
              disabled={isDetailInputDisabled}
              endValue={plannedEndDateValue}
              label="Planned"
              onEndChange={setPlannedEndDateValue}
              onStartChange={setPlannedStartDateValue}
              startValue={plannedStartDateValue}
            />
            <DateRangeFields
              disabled={isDetailInputDisabled}
              endValue={actualEndDateValue}
              label="Actual"
              onEndChange={setActualEndDateValue}
              onStartChange={setActualStartDateValue}
              startValue={actualStartDateValue}
            />
          </DetailSection>

          <DetailSection className="flex min-h-28 flex-1 flex-col" title="Memo">
            <DetailTextArea
              className="min-h-24 flex-1"
              disabled={isDetailInputDisabled}
              onChange={setMemoValue}
              onKeyDown={handleMemoKeyDown}
              placeholder="Add a memo"
              value={memoValue}
            />
          </DetailSection>

          {saveError ? (
            <p className="rounded-md border border-destructive/25 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {saveError}
            </p>
          ) : null}
          {saveMessage ? (
            <p className="rounded-md border border-primary/25 bg-primary/5 px-3 py-2 text-xs text-primary">
              {saveMessage}
            </p>
          ) : null}
        </CardContent>
        <div
          className={cn(
            "flex shrink-0 items-center gap-3 border-t p-3",
            hasChanges ? "justify-between" : "justify-center",
          )}
        >
          <Button
            className={cn(
              isConfirmingTrash
                ? "border-destructive bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:text-destructive-foreground"
                : "border-destructive/35 text-destructive hover:bg-destructive/10 hover:text-destructive",
            )}
            disabled={isSaving || isMovingToTrash || isUpdatingTodayTodo}
            ref={trashButtonRef}
            size="sm"
            type="button"
            variant="outline"
            onClick={handleMoveToTrash}
          >
            <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
            {isMovingToTrash
              ? "Moving"
              : isConfirmingTrash
                ? "Confirm trash"
                : "Move to trash"}
          </Button>
          {hasChanges ? (
            <Button
              disabled={isDetailInputDisabled || isMovingToTrash || isUpdatingTodayTodo}
              size="sm"
              type="submit"
            >
              {isSaving ? "Saving" : "Save changes"}
            </Button>
          ) : null}
        </div>
      </form>
    </Card>
  );
}

function DetailSection({
  className,
  title,
  children,
}: {
  className?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className={className}>
      <h3 className="mb-1.5 text-xs font-semibold uppercase text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

function DetailTextArea({
  className,
  disabled,
  onChange,
  onKeyDown,
  placeholder,
  value,
}: {
  className?: string;
  disabled: boolean;
  onChange: (value: string) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <textarea
      className={cn(
        "min-h-20 w-full resize-y rounded-md border bg-background px-3 py-2 text-sm leading-5 outline-none transition placeholder:text-muted-foreground focus:border-primary/60 focus:ring-1 focus:ring-primary/30",
        className,
      )}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      value={value}
    />
  );
}

function DateRangeFields({
  disabled,
  endValue,
  label,
  onEndChange,
  onStartChange,
  startValue,
}: {
  disabled: boolean;
  endValue: string;
  label: string;
  onEndChange: (value: string) => void;
  onStartChange: (value: string) => void;
  startValue: string;
}) {
  return (
    <div className="mb-2 overflow-hidden rounded-md border bg-background p-2.5 last:mb-0">
      <div className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</div>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <label className="flex min-w-0 max-w-full flex-col gap-1.5 overflow-hidden">
          <span className="text-xs text-muted-foreground">Start</span>
          <input
            className="goaltree-date-input block h-8 w-full min-w-0 max-w-full appearance-none rounded-md border bg-background px-2 text-sm leading-[2rem] outline-none transition focus:border-primary/60 focus:ring-1 focus:ring-primary/30"
            disabled={disabled}
            onChange={(event) => onStartChange(event.target.value)}
            type="date"
            value={startValue}
          />
        </label>
        <label className="flex min-w-0 max-w-full flex-col gap-1.5 overflow-hidden">
          <span className="text-xs text-muted-foreground">End</span>
          <input
            className="goaltree-date-input block h-8 w-full min-w-0 max-w-full appearance-none rounded-md border bg-background px-2 text-sm leading-[2rem] outline-none transition focus:border-primary/60 focus:ring-1 focus:ring-primary/30"
            disabled={disabled}
            onChange={(event) => onEndChange(event.target.value)}
            type="date"
            value={endValue}
          />
        </label>
      </div>
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
    .filter(
      (node) =>
        node.type === type &&
        node.parentId === parentId &&
        isNodeVisible(node, nodes),
    )
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

function getSearchResults(
  nodes: WorkspaceNode[],
  categories: PlanCategory[],
  query: string,
) {
  const normalizedQuery = normalizeSearchText(query);
  const emptyResults = {
    goals: [] as WorkspaceNode[],
    plans: [] as WorkspaceNode[],
    tasks: [] as WorkspaceNode[],
  };

  if (!normalizedQuery) {
    return emptyResults;
  }

  const matchingNodes = nodes.filter(
    (node) =>
      isNodeVisible(node, nodes) &&
      nodeMatchesSearch(node, nodes, categories, normalizedQuery),
  );

  return {
    goals: sortSearchNodes(
      matchingNodes.filter((node) => node.type === "goal"),
      nodes,
    ),
    plans: sortSearchNodes(
      matchingNodes.filter((node) => node.type === "plan"),
      nodes,
    ),
    tasks: sortSearchNodes(
      matchingNodes.filter((node) => node.type === "task"),
      nodes,
    ),
  };
}

function nodeMatchesSearch(
  node: WorkspaceNode,
  nodes: WorkspaceNode[],
  categories: PlanCategory[],
  normalizedQuery: string,
) {
  return getSearchFields(node, nodes, categories).some((field) =>
    normalizeSearchText(field).includes(normalizedQuery),
  );
}

function getSearchFields(
  node: WorkspaceNode,
  nodes: WorkspaceNode[],
  categories: PlanCategory[],
) {
  const parentPlan =
    node.type === "task" ? getVisibleNode(nodes, node.parentId) : undefined;
  const parentGoal =
    node.type === "plan"
      ? getVisibleNode(nodes, node.parentId)
      : parentPlan
        ? getVisibleNode(nodes, parentPlan.parentId)
        : undefined;
  const category =
    node.type === "plan"
      ? categories.find((item) => item.id === node.categoryId)
      : undefined;

  return [
    node.title,
    node.memo,
    node.importanceReason,
    node.successCriteriaText,
    statusMeta[node.status].label,
    columnLabels[node.type],
    category?.name,
    parentGoal?.title,
    parentPlan?.title,
  ].filter(Boolean);
}

function sortSearchNodes(items: WorkspaceNode[], nodes: WorkspaceNode[]) {
  return [...items].sort((first, second) => {
    const firstPath = getSearchSortPath(first, nodes);
    const secondPath = getSearchSortPath(second, nodes);
    const maxLength = Math.max(firstPath.length, secondPath.length);

    for (let index = 0; index < maxLength; index += 1) {
      const firstValue = firstPath[index] ?? 0;
      const secondValue = secondPath[index] ?? 0;

      if (firstValue !== secondValue) {
        return firstValue - secondValue;
      }
    }

    return first.title.localeCompare(second.title, "ko");
  });
}

function getSearchSortPath(node: WorkspaceNode, nodes: WorkspaceNode[]) {
  if (node.type === "goal") {
    return [node.sortOrder];
  }

  if (node.type === "plan") {
    const parentGoal = getVisibleNode(nodes, node.parentId);
    return [parentGoal?.sortOrder ?? 0, node.sortOrder];
  }

  const parentPlan = getVisibleNode(nodes, node.parentId);
  const parentGoal = getVisibleNode(nodes, parentPlan?.parentId);
  return [parentGoal?.sortOrder ?? 0, parentPlan?.sortOrder ?? 0, node.sortOrder];
}

function normalizeSearchText(value: unknown) {
  return String(value ?? "").trim().toLocaleLowerCase();
}

function formatResultCount(count: number) {
  return `${count} ${count === 1 ? "result" : "results"}`;
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

function getNextTodoSortOrder(todos: TodayTodo[], date: string) {
  const maxSortOrder = todos
    .filter((todo) => todo.date === date)
    .reduce((currentMax, todo) => Math.max(currentMax, todo.sortOrder), 0);

  return maxSortOrder + 1;
}

function getNodeProgress(node: WorkspaceNode, nodes: WorkspaceNode[]): number {
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

function isNodeVisible(node: WorkspaceNode, nodes: WorkspaceNode[]): boolean {
  if (node.trashedAt) {
    return false;
  }

  if (!node.parentId) {
    return true;
  }

  const parent = nodes.find((item) => item.id === node.parentId);

  return parent ? isNodeVisible(parent, nodes) : false;
}

function getVisibleNode(nodes: WorkspaceNode[], id?: string | null) {
  if (!id) {
    return undefined;
  }

  return nodes.find((node) => node.id === id && isNodeVisible(node, nodes));
}

function getSelectionForNode(
  nodes: WorkspaceNode[],
  nodeId?: string | null,
) {
  const fallbackGoal = getSortedChildren(nodes, "goal", null)[0];
  const fallbackSelection = {
    goalId: fallbackGoal?.id ?? "",
    planId: "",
    nodeId: fallbackGoal?.id ?? "",
  };
  const targetNode = getVisibleNode(nodes, nodeId);

  if (!targetNode) {
    return fallbackSelection;
  }

  if (targetNode.type === "goal") {
    return {
      goalId: targetNode.id,
      planId: "",
      nodeId: targetNode.id,
    };
  }

  if (targetNode.type === "plan") {
    const parentGoal = getVisibleNode(nodes, targetNode.parentId);

    if (!parentGoal || parentGoal.type !== "goal") {
      return fallbackSelection;
    }

    return {
      goalId: parentGoal.id,
      planId: targetNode.id,
      nodeId: targetNode.id,
    };
  }

  const parentPlan = getVisibleNode(nodes, targetNode.parentId);
  const parentGoal = getVisibleNode(nodes, parentPlan?.parentId);

  if (
    !parentPlan ||
    parentPlan.type !== "plan" ||
    !parentGoal ||
    parentGoal.type !== "goal"
  ) {
    return fallbackSelection;
  }

  return {
    goalId: parentGoal.id,
    planId: parentPlan.id,
    nodeId: targetNode.id,
  };
}

function getSelectionAfterTrash(nodes: WorkspaceNode[], trashedNode: WorkspaceNode) {
  const fallbackGoal = getSortedChildren(nodes, "goal", null)[0];

  if (trashedNode.type === "goal") {
    return {
      goalId: fallbackGoal?.id ?? "",
      planId: "",
      nodeId: fallbackGoal?.id ?? "",
    };
  }

  if (trashedNode.type === "plan") {
    const parentGoal = getVisibleNode(nodes, trashedNode.parentId);
    const goalId = parentGoal?.id ?? fallbackGoal?.id ?? "";
    const nextPlan = goalId ? getSortedChildren(nodes, "plan", goalId)[0] : undefined;

    return {
      goalId,
      planId: nextPlan?.id ?? "",
      nodeId: nextPlan?.id ?? goalId,
    };
  }

  const parentPlan = getVisibleNode(nodes, trashedNode.parentId);
  const parentGoal = getVisibleNode(nodes, parentPlan?.parentId);
  const nextTask = parentPlan
    ? getSortedChildren(nodes, "task", parentPlan.id)[0]
    : undefined;

  return {
    goalId: parentGoal?.id ?? fallbackGoal?.id ?? "",
    planId: parentPlan?.id ?? "",
    nodeId: nextTask?.id ?? parentPlan?.id ?? parentGoal?.id ?? fallbackGoal?.id ?? "",
  };
}

function getDateValuesWithStatusUpdates(
  node: WorkspaceNode,
  input: UpdateNodeInput,
  autoFillActualDatesOnStatusChange: boolean,
) {
  let actualStartDate = input.actualStartDate;
  let actualEndDate = input.actualEndDate;

  if (node.status === input.status || !autoFillActualDatesOnStatusChange) {
    return { actualStartDate, actualEndDate };
  }

  const today = getLocalDateString(new Date());

  if (input.status === "in_progress" && !actualStartDate) {
    actualStartDate = today;
  }

  if (
    input.status === "done" &&
    (node.status === "in_progress" || node.status === "blocked") &&
    !actualEndDate
  ) {
    actualEndDate = today;
  }

  if (node.status === "done" && input.status === "in_progress") {
    actualEndDate = null;
  }

  return { actualStartDate, actualEndDate };
}

function emptyStringToNull(value: string) {
  const trimmedValue = value.trim();
  return trimmedValue ? trimmedValue : null;
}

function isValidDateRange(start: string | null, end: string | null) {
  return !start || !end || start <= end;
}

function getLocalDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
