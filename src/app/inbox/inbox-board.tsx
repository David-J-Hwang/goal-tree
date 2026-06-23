"use client";

import {
  type ComponentType,
  type FormEvent,
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
  Inbox,
  PauseCircle,
  Plus,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { sortableStackModifiers } from "@/lib/dnd/sortable-stack-modifier";
import {
  inboxCardSelectColumns,
  legacyInboxCardSelectColumns,
  mapInboxCardRow,
  type InboxCardRow,
} from "@/lib/goaltree/inbox-card-rows";
import {
  mapNodeRow,
  nodeSelectColumns,
  type NodeRow,
} from "@/lib/goaltree/node-rows";
import { syncAncestorStatuses } from "@/lib/goaltree/parent-status-sync";
import { getWorkspaceNodeHref } from "@/lib/goaltree/workspace-links";
import {
  appPageContentClassName,
  appPageMainClassName,
} from "@/lib/page-layout";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type {
  GoalTreeNode,
  InboxCard,
  NodeStatus,
  NodeType,
  PlanCategory,
  UserSettings,
} from "@/types/domain";

type CreateInboxCardInput = {
  title: string;
};

type UpdateInboxCardInput = {
  id: string;
  title: string;
  memo: string | null;
  status: NodeStatus;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  actualStartDate: string | null;
  actualEndDate: string | null;
};

type ConvertInboxCardInput = UpdateInboxCardInput & {
  type: NodeType;
  parentId: string | null;
  categoryId: string | null;
};

const statusOptions: NodeStatus[] = [
  "not_started",
  "in_progress",
  "blocked",
  "done",
  "paused",
];
const columnLabels: Record<NodeType, string> = {
  goal: "Goal",
  plan: "Plan",
  task: "Task",
};

const statusMeta: Record<
  NodeStatus,
  {
    label: string;
    icon: ComponentType<{ className?: string }>;
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

export function InboxBoard({
  hasWorkspaceFields,
  initialCategories,
  initialCards,
  initialNodes,
  initialSettings,
  userId,
}: {
  hasWorkspaceFields: boolean;
  initialCategories: PlanCategory[];
  initialCards: InboxCard[];
  initialNodes: GoalTreeNode[];
  initialSettings: UserSettings;
  userId: string;
}) {
  const router = useRouter();
  const [cards, setCards] = useState<InboxCard[]>(initialCards);
  const [nodes, setNodes] = useState<GoalTreeNode[]>(initialNodes);
  const [categories, setCategories] = useState<PlanCategory[]>(initialCategories);
  const [selectedCardId, setSelectedCardId] = useState(initialCards[0]?.id ?? "");
  const [isCreating, setIsCreating] = useState(false);
  const [isDeletingCard, setIsDeletingCard] = useState(false);
  const [isReorderingCards, setIsReorderingCards] = useState(false);
  const [createError, setCreateError] = useState("");
  const [reorderErrorMessage, setReorderErrorMessage] = useState("");
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
  const isInboxCardMutationInProgress =
    isCreating || isDeletingCard || isReorderingCards;

  const activeCards = useMemo(
    () => cards.filter((card) => !card.convertedNodeId),
    [cards],
  );
  const selectedCard =
    activeCards.find((card) => card.id === selectedCardId) ?? activeCards[0];

  useEffect(() => {
    setCards(initialCards);
    setSelectedCardId(initialCards[0]?.id ?? "");
  }, [initialCards]);

  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes]);

  useEffect(() => {
    setCategories(initialCategories);
  }, [initialCategories]);

  async function handleCreateCard(input: CreateInboxCardInput) {
    const supabase = createSupabaseBrowserClient();
    const selectColumns = hasWorkspaceFields
      ? inboxCardSelectColumns
      : legacyInboxCardSelectColumns;
    const { data, error } = await supabase
      .from("inbox_cards")
      .insert({
        user_id: userId,
        title: input.title,
        sort_order: getNextSortOrder(cards),
      })
      .select(selectColumns)
      .single()
      .returns<InboxCardRow>();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      throw new Error("Created inbox card was not returned.");
    }

    const createdCard = mapInboxCardRow(data);

    setCards((currentCards) => [...currentCards, createdCard]);
    setSelectedCardId(createdCard.id);
  }

  async function handleUpdateCard(input: UpdateInboxCardInput) {
    const supabase = createSupabaseBrowserClient();
    const updatePayload = hasWorkspaceFields
      ? {
          title: input.title,
          memo: input.memo,
          status: input.status,
          planned_start_date: input.plannedStartDate,
          planned_end_date: input.plannedEndDate,
          actual_start_date: input.actualStartDate,
          actual_end_date: input.actualEndDate,
        }
      : {
          title: input.title,
          memo: input.memo,
        };
    const selectColumns = hasWorkspaceFields
      ? inboxCardSelectColumns
      : legacyInboxCardSelectColumns;
    const { data, error } = await supabase
      .from("inbox_cards")
      .update(updatePayload)
      .eq("id", input.id)
      .eq("user_id", userId)
      .select(selectColumns)
      .single()
      .returns<InboxCardRow>();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      throw new Error("Updated inbox card was not returned.");
    }

    const updatedCard = mapInboxCardRow(data);

    setCards((currentCards) =>
      currentCards.map((card) =>
        card.id === updatedCard.id ? updatedCard : card,
      ),
    );
  }

  async function handleDeleteCard(cardId: string) {
    const nextSelectedCardId =
      activeCards.find((card) => card.id !== cardId)?.id ?? "";
    const supabase = createSupabaseBrowserClient();
    const abortController = new AbortController();
    const timeoutId = window.setTimeout(() => abortController.abort(), 10_000);

    let deleteResult: {
      data: { id: string } | null;
      error: { message: string; name?: string } | null;
    };

    try {
      deleteResult = await supabase
        .from("inbox_cards")
        .delete()
        .eq("id", cardId)
        .eq("user_id", userId)
        .select("id")
        .abortSignal(abortController.signal)
        .maybeSingle();
    } catch (error) {
      throw new Error(
        error instanceof DOMException && error.name === "AbortError"
          ? "Inbox card delete request timed out."
          : error instanceof Error
            ? error.message
            : "Failed to delete inbox card.",
      );
    } finally {
      window.clearTimeout(timeoutId);
    }

    const { data, error } = deleteResult;

    if (error) {
      throw new Error(
        error.name === "AbortError"
          ? "Inbox card delete request timed out."
          : error.message,
      );
    }

    if (!data) {
      throw new Error(
        "Inbox card was not deleted. Check the inbox_cards DELETE policy in Supabase.",
      );
    }

    setCards((currentCards) =>
      currentCards.filter((card) => card.id !== cardId),
    );
    setSelectedCardId((currentSelectedCardId) =>
      currentSelectedCardId === cardId
        ? nextSelectedCardId
        : currentSelectedCardId,
    );
  }

  async function handleReorderCards(orderedIds: string[]) {
    const previousCards = cards;
    const orderedActiveCards = orderedIds
      .map((id, index) => {
        const card = activeCards.find((currentCard) => currentCard.id === id);

        return card ? { ...card, sortOrder: index + 1 } : null;
      })
      .filter((card): card is InboxCard => Boolean(card));
    const orderedActiveCardsById = new Map(
      orderedActiveCards.map((card) => [card.id, card]),
    );
    const orderedActiveCardIds = new Set(orderedIds);

    setCards((currentCards) =>
      [
        ...orderedActiveCards,
        ...currentCards.filter((card) => !orderedActiveCardIds.has(card.id)),
      ].map((card) => orderedActiveCardsById.get(card.id) ?? card),
    );

    const supabase = createSupabaseBrowserClient();
    const updates = orderedActiveCards.map((card) =>
      supabase
        .from("inbox_cards")
        .update({ sort_order: card.sortOrder })
        .eq("id", card.id)
        .eq("user_id", userId),
    );
    const results = await Promise.all(updates);
    const failedResult = results.find((result) => result.error);

    if (failedResult?.error) {
      setCards(previousCards);
      throw new Error(failedResult.error.message);
    }
  }

  async function handleCardDragEnd(event: DragEndEvent) {
    if (isInboxCardMutationInProgress) {
      return;
    }

    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = activeCards.findIndex((card) => card.id === active.id);
    const newIndex = activeCards.findIndex((card) => card.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    const orderedIds = arrayMove(activeCards, oldIndex, newIndex).map(
      (card) => card.id,
    );

    setIsReorderingCards(true);
    setReorderErrorMessage("");

    try {
      await handleReorderCards(orderedIds);
    } catch (error) {
      setReorderErrorMessage(
        error instanceof Error ? error.message : "Failed to save card order.",
      );
    } finally {
      setIsReorderingCards(false);
    }
  }

  async function handleConvertCard(input: ConvertInboxCardInput) {
    const sortOrder = getNextNodeSortOrder(nodes, input.type, input.parentId);
    const supabase = createSupabaseBrowserClient();

    const { data: nodeRow, error: nodeError } = await supabase
      .from("nodes")
      .insert({
        user_id: userId,
        type: input.type,
        parent_id: input.parentId,
        title: input.title,
        memo: input.memo,
        status: input.status,
        planned_start_date: input.plannedStartDate,
        planned_end_date: input.plannedEndDate,
        actual_start_date: input.actualStartDate,
        actual_end_date: input.actualEndDate,
        category_id: input.type === "plan" ? input.categoryId : null,
        sort_order: sortOrder,
      })
      .select(nodeSelectColumns)
      .single()
      .returns<NodeRow>();

    if (nodeError) {
      throw new Error(nodeError.message);
    }

    if (!nodeRow) {
      throw new Error("Created Workspace card was not returned.");
    }

    const createdNode = mapNodeRow(nodeRow);
    const { data: deletedCardRow, error: cardError } = await supabase
      .from("inbox_cards")
      .delete()
      .eq("id", input.id)
      .eq("user_id", userId)
      .select("id")
      .maybeSingle();

    if (cardError) {
      throw new Error(cardError.message);
    }

    if (!deletedCardRow) {
      throw new Error("Converted inbox card was not deleted.");
    }

    const syncedNodes = await syncAncestorStatuses({
      autoFillActualDatesOnStatusChange:
        initialSettings.autoFillActualDatesOnStatusChange,
      nodes: [...nodes, createdNode],
      parentIds: [createdNode.parentId],
      supabase,
      userId,
    });

    setNodes(syncedNodes);
    setCards((currentCards) =>
      currentCards.filter((card) => card.id !== input.id),
    );
    router.push(getWorkspaceNodeHref(createdNode.id));
  }

  async function handleCreateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isInboxCardMutationInProgress) {
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    const title = String(formData.get("title") ?? "").trim();

    if (!title) {
      setCreateError("Title is required.");
      return;
    }

    setIsCreating(true);
    setCreateError("");

    try {
      await handleCreateCard({ title });
      form.reset();
    } catch (error) {
      setCreateError(
        error instanceof Error ? error.message : "Failed to create inbox card.",
      );
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <main className={appPageMainClassName}>
      <div className={cn(appPageContentClassName, "max-w-[1440px]")}>
        <header className="flex shrink-0 flex-col gap-4 border-b pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Goaltree</p>
            <h1 className="mt-1 text-2xl font-semibold">Inbox</h1>
          </div>
          <div className="inline-flex h-10 items-center gap-2 rounded-md border bg-card px-3 text-sm text-muted-foreground shadow-sm">
            <Inbox className="h-4 w-4" aria-hidden="true" />
            {activeCards.length} {activeCards.length === 1 ? "card" : "cards"}
          </div>
        </header>

        <section className="mt-5 grid gap-4 xl:min-h-0 xl:flex-1 xl:grid-cols-[minmax(0,1fr)_minmax(340px,420px)]">
          <Card className="flex min-h-[34rem] flex-col overflow-hidden rounded-lg shadow-none xl:h-full xl:min-h-0">
            <CardHeader className="shrink-0 border-b p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base">Inbox Cards</CardTitle>
                  <CardDescription className="mt-1">
                    {activeCards.length} active cards
                  </CardDescription>
                </div>
                <Button
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:bg-muted hover:text-foreground"
                  disabled={isInboxCardMutationInProgress}
                  size="icon"
                  type="submit"
                  form="inbox-create-form"
                  variant="ghost"
                  aria-label="Add Inbox card"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
              <form
                className="mt-4 flex gap-2"
                id="inbox-create-form"
                onSubmit={handleCreateSubmit}
              >
                <input
                  className="h-10 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary/60 focus:ring-1 focus:ring-primary/30"
                  disabled={isInboxCardMutationInProgress}
                  name="title"
                  placeholder="New inbox card"
                />
                <Button disabled={isInboxCardMutationInProgress} type="submit">
                  {isCreating ? "Adding" : "Add"}
                </Button>
              </form>
              {createError ? (
                <p className="mt-2 text-xs text-destructive">{createError}</p>
              ) : null}
            </CardHeader>

            <CardContent className="min-h-0 flex-1 overflow-y-auto p-3">
              {reorderErrorMessage ? (
                <p className="mb-3 rounded-md border border-destructive/25 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                  {reorderErrorMessage}
                </p>
              ) : null}
              {activeCards.length === 0 ? (
                <div className="flex min-h-40 items-center justify-center rounded-md border border-dashed px-4 text-center text-sm text-muted-foreground">
                  No Inbox cards yet
                </div>
              ) : (
                <DndContext
                  id="inbox-cards"
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  modifiers={sortableStackModifiers}
                  onDragEnd={handleCardDragEnd}
                >
                  <SortableContext
                    items={activeCards.map((card) => card.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-3">
                      {activeCards.map((card) => (
                        <SortableInboxCardItem
                          card={card}
                          isReorderDisabled={isInboxCardMutationInProgress}
                          key={card.id}
                          onSelect={() => setSelectedCardId(card.id)}
                          selected={card.id === selectedCard?.id}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </CardContent>
          </Card>

          <InboxDetailPanel
            card={selectedCard}
            categories={categories}
            hasWorkspaceFields={hasWorkspaceFields}
            isBoardLocked={isDeletingCard || isReorderingCards}
            nodes={nodes}
            onConvert={handleConvertCard}
            onDelete={handleDeleteCard}
            onDeleteInProgressChange={setIsDeletingCard}
            onUpdate={handleUpdateCard}
          />
        </section>
      </div>
    </main>
  );
}

function SortableInboxCardItem({
  card,
  isReorderDisabled,
  onSelect,
  selected,
}: {
  card: InboxCard;
  isReorderDisabled: boolean;
  onSelect: () => void;
  selected: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: card.id,
      disabled: isReorderDisabled,
      transition: {
        duration: 120,
        easing: "cubic-bezier(0.2, 0, 0, 1)",
      },
    });
  const status = statusMeta[card.status];
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
          aria-label={`Reorder ${card.title}`}
          disabled={isReorderDisabled}
          type="button"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          className="min-w-0 flex-1 text-left disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isReorderDisabled}
          onClick={onSelect}
          type="button"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="line-clamp-2 text-sm font-medium leading-5">
                {card.title}
              </h3>
              {card.memo ? (
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                  {card.memo}
                </p>
              ) : null}
            </div>
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
        </button>
      </div>
    </article>
  );
}

function InboxDetailPanel({
  card,
  categories,
  hasWorkspaceFields,
  isBoardLocked,
  nodes,
  onConvert,
  onDelete,
  onDeleteInProgressChange,
  onUpdate,
}: {
  card?: InboxCard;
  categories: PlanCategory[];
  hasWorkspaceFields: boolean;
  isBoardLocked: boolean;
  nodes: GoalTreeNode[];
  onConvert: (input: ConvertInboxCardInput) => Promise<void>;
  onDelete: (cardId: string) => Promise<void>;
  onDeleteInProgressChange: (isInProgress: boolean) => void;
  onUpdate: (input: UpdateInboxCardInput) => Promise<void>;
}) {
  const [titleValue, setTitleValue] = useState(card?.title ?? "");
  const [memoValue, setMemoValue] = useState(card?.memo ?? "");
  const [statusValue, setStatusValue] = useState<NodeStatus>(
    card?.status ?? "not_started",
  );
  const [plannedStartDateValue, setPlannedStartDateValue] = useState(
    card?.plannedStartDate ?? "",
  );
  const [plannedEndDateValue, setPlannedEndDateValue] = useState(
    card?.plannedEndDate ?? "",
  );
  const [actualStartDateValue, setActualStartDateValue] = useState(
    card?.actualStartDate ?? "",
  );
  const [actualEndDateValue, setActualEndDateValue] = useState(
    card?.actualEndDate ?? "",
  );
  const [convertType, setConvertType] = useState<NodeType>("goal");
  const [convertGoalId, setConvertGoalId] = useState("");
  const [convertPlanId, setConvertPlanId] = useState("");
  const [convertCategoryId, setConvertCategoryId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const deleteButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!card) {
      return;
    }

    setTitleValue(card.title);
    setMemoValue(card.memo ?? "");
    setStatusValue(card.status);
    setPlannedStartDateValue(card.plannedStartDate ?? "");
    setPlannedEndDateValue(card.plannedEndDate ?? "");
    setActualStartDateValue(card.actualStartDate ?? "");
    setActualEndDateValue(card.actualEndDate ?? "");
    setIsDeleting(false);
    setIsConfirmingDelete(false);
    setMessage("");
    setErrorMessage("");
  }, [
    card?.actualEndDate,
    card?.actualStartDate,
    card?.id,
    card?.memo,
    card?.plannedEndDate,
    card?.plannedStartDate,
    card?.status,
    card?.title,
    card,
  ]);

  const goalOptions = useMemo(
    () => getSortedNodeOptions(nodes, "goal", null),
    [nodes],
  );
  const planOptions = useMemo(
    () => getSortedNodeOptions(nodes, "plan"),
    [nodes],
  );
  const selectedGoalPlanOptions = useMemo(
    () => planOptions.filter((plan) => plan.parentId === convertGoalId),
    [convertGoalId, planOptions],
  );

  useEffect(() => {
    setConvertGoalId((currentGoalId) =>
      goalOptions.some((goal) => goal.id === currentGoalId)
        ? currentGoalId
        : goalOptions[0]?.id ?? "",
    );
  }, [goalOptions]);

  useEffect(() => {
    setConvertPlanId((currentPlanId) =>
      planOptions.some((plan) => plan.id === currentPlanId)
        ? currentPlanId
        : planOptions[0]?.id ?? "",
    );
  }, [planOptions]);

  useEffect(() => {
    if (convertType !== "task") {
      return;
    }

    const currentPlan = planOptions.find((plan) => plan.id === convertPlanId);

    if (currentPlan) {
      if (currentPlan.parentId !== convertGoalId) {
        setConvertGoalId(currentPlan.parentId ?? "");
      }

      return;
    }

    const fallbackGoalId = convertGoalId || goalOptions[0]?.id || "";
    const fallbackPlanId =
      planOptions.find((plan) => plan.parentId === fallbackGoalId)?.id ?? "";

    if (fallbackGoalId !== convertGoalId) {
      setConvertGoalId(fallbackGoalId);
    }

    if (fallbackPlanId !== convertPlanId) {
      setConvertPlanId(fallbackPlanId);
    }
  }, [convertGoalId, convertPlanId, convertType, goalOptions, planOptions]);

  useEffect(() => {
    setConvertCategoryId((currentCategoryId) =>
      categories.some((category) => category.id === currentCategoryId)
        ? currentCategoryId
        : categories[0]?.id ?? "",
    );
  }, [categories]);

  useEffect(() => {
    if (!isConfirmingDelete || isDeleting) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (deleteButtonRef.current?.contains(target)) {
        return;
      }

      setIsConfirmingDelete(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isConfirmingDelete, isDeleting]);

  if (!card) {
    return (
      <Card className="flex min-h-[34rem] flex-col overflow-hidden rounded-lg shadow-none xl:h-full xl:min-h-0">
        <CardHeader className="shrink-0 border-b p-4">
          <CardTitle className="text-base">Details</CardTitle>
          <CardDescription className="mt-1">
            Select an Inbox card to view details
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const currentCard = card;
  const status = statusMeta[statusValue];
  const StatusIcon = status.icon;
  const normalizedMemo = memoValue.trim();
  const hasChanges =
    titleValue.trim() !== currentCard.title ||
    normalizedMemo !== (currentCard.memo ?? "") ||
    statusValue !== currentCard.status ||
    plannedStartDateValue !== (currentCard.plannedStartDate ?? "") ||
    plannedEndDateValue !== (currentCard.plannedEndDate ?? "") ||
    actualStartDateValue !== (currentCard.actualStartDate ?? "") ||
    actualEndDateValue !== (currentCard.actualEndDate ?? "");
  const isLocked = isSaving || isConverting || isDeleting || isBoardLocked;
  const isWorkspaceFieldDisabled = isLocked || !hasWorkspaceFields;
  const selectedTaskPlan = planOptions.find((plan) => plan.id === convertPlanId);
  const targetParentId =
    convertType === "goal"
      ? null
      : convertType === "plan"
        ? convertGoalId || null
        : convertPlanId || null;
  const isConvertTargetReady =
    convertType === "goal" ||
    (convertType === "plan" && Boolean(convertGoalId)) ||
    (convertType === "task" &&
      Boolean(convertGoalId) &&
      Boolean(convertPlanId) &&
      selectedTaskPlan?.parentId === convertGoalId);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isLocked) {
      return;
    }

    const title = titleValue.trim();
    const plannedStartDate = emptyStringToNull(plannedStartDateValue);
    const plannedEndDate = emptyStringToNull(plannedEndDateValue);
    const actualStartDate = emptyStringToNull(actualStartDateValue);
    const actualEndDate = emptyStringToNull(actualEndDateValue);

    if (!title) {
      setErrorMessage("Title is required.");
      setMessage("");
      return;
    }

    if (!isValidDateRange(plannedStartDate, plannedEndDate)) {
      setErrorMessage("Planned start date must be before planned end date.");
      setMessage("");
      return;
    }

    if (!isValidDateRange(actualStartDate, actualEndDate)) {
      setErrorMessage("Actual start date must be before actual end date.");
      setMessage("");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");
    setMessage("");

    try {
      await onUpdate({
        id: currentCard.id,
        title,
        memo: normalizedMemo || null,
        status: statusValue,
        plannedStartDate,
        plannedEndDate,
        actualStartDate,
        actualEndDate,
      });
      setMessage("Saved.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to save changes.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleConvert() {
    if (isLocked) {
      return;
    }

    const title = titleValue.trim();
    const plannedStartDate = emptyStringToNull(plannedStartDateValue);
    const plannedEndDate = emptyStringToNull(plannedEndDateValue);
    const actualStartDate = emptyStringToNull(actualStartDateValue);
    const actualEndDate = emptyStringToNull(actualEndDateValue);

    if (!hasWorkspaceFields) {
      setErrorMessage("Run migration 005 before converting Inbox cards.");
      setMessage("");
      return;
    }

    if (!title) {
      setErrorMessage("Title is required.");
      setMessage("");
      return;
    }

    if (!isConvertTargetReady) {
      setErrorMessage(getConvertTargetErrorMessage(convertType));
      setMessage("");
      return;
    }

    if (!isValidDateRange(plannedStartDate, plannedEndDate)) {
      setErrorMessage("Planned start date must be before planned end date.");
      setMessage("");
      return;
    }

    if (!isValidDateRange(actualStartDate, actualEndDate)) {
      setErrorMessage("Actual start date must be before actual end date.");
      setMessage("");
      return;
    }

    setIsConverting(true);
    setErrorMessage("");
    setMessage("");

    try {
      await onConvert({
        id: currentCard.id,
        type: convertType,
        parentId: targetParentId,
        categoryId: convertType === "plan" ? convertCategoryId || null : null,
        title,
        memo: normalizedMemo || null,
        status: statusValue,
        plannedStartDate,
        plannedEndDate,
        actualStartDate,
        actualEndDate,
      });
      setMessage("Added to Workspace.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to add to Workspace.",
      );
      setIsConverting(false);
    }
  }

  function handleDiscardChanges() {
    if (isLocked) {
      return;
    }

    setTitleValue(currentCard.title);
    setMemoValue(currentCard.memo ?? "");
    setStatusValue(currentCard.status);
    setPlannedStartDateValue(currentCard.plannedStartDate ?? "");
    setPlannedEndDateValue(currentCard.plannedEndDate ?? "");
    setActualStartDateValue(currentCard.actualStartDate ?? "");
    setActualEndDateValue(currentCard.actualEndDate ?? "");
    setMessage("");
    setErrorMessage("");
  }

  async function handleDelete() {
    if (isDeleting) {
      return;
    }

    if (!isConfirmingDelete) {
      setIsConfirmingDelete(true);
      setMessage("");
      setErrorMessage("");
      return;
    }

    setIsDeleting(true);
    onDeleteInProgressChange(true);
    setMessage("");
    setErrorMessage("");

    try {
      await onDelete(currentCard.id);
      setIsDeleting(false);
      setIsConfirmingDelete(false);
      onDeleteInProgressChange(false);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to delete card.",
      );
      setIsConfirmingDelete(false);
      setIsDeleting(false);
      onDeleteInProgressChange(false);
    }
  }

  return (
    <Card className="flex min-h-[34rem] flex-col overflow-hidden rounded-lg shadow-none xl:h-full xl:min-h-0">
      <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSave}>
        <CardHeader className="shrink-0 border-b p-3">
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="text-base">Details</CardTitle>
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
          <label className="mt-3 block">
            <span className="sr-only">Inbox card title</span>
            <input
              className="h-9 w-full rounded-md border bg-background px-3 text-sm font-medium outline-none transition focus:border-primary/60 focus:ring-1 focus:ring-primary/30"
              disabled={isLocked}
              onChange={(event) => setTitleValue(event.target.value)}
              value={titleValue}
            />
          </label>
        </CardHeader>

        <CardContent className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 pb-6 pt-3">
          <section className="rounded-lg border border-secondary/70 bg-secondary/35 p-3 dark:border-secondary/60 dark:bg-secondary/25">
            <h3 className="text-xs font-semibold uppercase text-secondary-foreground/80">
              Status
            </h3>
            {!hasWorkspaceFields ? (
              <p className="mt-3 rounded-md border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                Run migration 005 to edit status and dates.
              </p>
            ) : null}
            <div className="mt-3 grid grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-2">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-background"
                aria-hidden="true"
              >
                <StatusIcon
                  className={cn("h-4 w-4", status.iconClassName)}
                />
              </span>
              <select
                className="h-10 min-w-0 w-full rounded-md border bg-background px-3 text-sm outline-none transition focus:border-secondary-foreground/40 focus:ring-1 focus:ring-secondary-foreground/20"
                disabled={isWorkspaceFieldDisabled}
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

          <section>
            <h3 className="mb-1.5 text-xs font-semibold uppercase text-muted-foreground">
              Dates
            </h3>
            <DateRangeFields
              disabled={isWorkspaceFieldDisabled}
              endValue={plannedEndDateValue}
              label="Planned"
              onEndChange={setPlannedEndDateValue}
              onStartChange={setPlannedStartDateValue}
              startValue={plannedStartDateValue}
            />
            <DateRangeFields
              disabled={isWorkspaceFieldDisabled}
              endValue={actualEndDateValue}
              label="Actual"
              onEndChange={setActualEndDateValue}
              onStartChange={setActualStartDateValue}
              startValue={actualStartDateValue}
            />
          </section>

          <section className="flex min-h-36 flex-1 flex-col">
            <h3 className="mb-1.5 text-xs font-semibold uppercase text-muted-foreground">
              Memo
            </h3>
            <textarea
              className="min-h-32 flex-1 resize-y rounded-md border bg-background px-3 py-2 text-sm leading-5 outline-none transition placeholder:text-muted-foreground focus:border-primary/60 focus:ring-1 focus:ring-primary/30"
              disabled={isLocked}
              onChange={(event) => setMemoValue(event.target.value)}
              placeholder="Add a memo"
              value={memoValue}
            />
          </section>

          {!hasChanges ? (
            <section className="rounded-lg border bg-background p-3">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xs font-semibold uppercase text-muted-foreground">
                      Add to Workspace
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Convert this Inbox card into a structured card.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {(["goal", "plan", "task"] as NodeType[]).map((type) => (
                    <button
                      className={cn(
                        "h-9 rounded-md border px-3 text-sm text-muted-foreground transition",
                        convertType === type
                          ? "border-primary/50 bg-primary/10 text-primary hover:bg-primary/15"
                          : "bg-card hover:bg-muted hover:text-foreground",
                      )}
                      disabled={isLocked}
                      key={type}
                      onClick={() => setConvertType(type)}
                      type="button"
                    >
                      {columnLabels[type]}
                    </button>
                  ))}
                </div>

                <div className="flex min-h-[8.25rem] flex-col rounded-md border bg-card/40 p-3">
                  <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                    Target
                  </div>
                  {convertType === "goal" ? (
                    <div className="flex min-h-0 flex-1 items-center rounded-md border bg-background px-3 text-sm text-muted-foreground">
                      Will be added as a top-level Goal.
                    </div>
                  ) : null}

                  {convertType === "plan" ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      <label className="block">
                        <span className="text-xs font-medium text-muted-foreground">
                          Linked Goal
                        </span>
                        <select
                          className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm outline-none transition focus:border-primary/60 focus:ring-1 focus:ring-primary/30"
                          disabled={isLocked || goalOptions.length === 0}
                          onChange={(event) => setConvertGoalId(event.target.value)}
                          value={convertGoalId}
                        >
                          {goalOptions.length === 0 ? (
                            <option value="">Create a Goal first</option>
                          ) : null}
                          {goalOptions.map((goal) => (
                            <option key={goal.id} value={goal.id}>
                              {goal.title}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block">
                        <span className="text-xs font-medium text-muted-foreground">
                          Category
                        </span>
                        <select
                          className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm outline-none transition focus:border-primary/60 focus:ring-1 focus:ring-primary/30"
                          disabled={isLocked}
                          onChange={(event) =>
                            setConvertCategoryId(event.target.value)
                          }
                          value={convertCategoryId}
                        >
                          <option value="">No category</option>
                          {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  ) : null}

                  {convertType === "task" ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      <label className="block">
                        <span className="text-xs font-medium text-muted-foreground">
                          Linked Goal
                        </span>
                        <select
                          className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm outline-none transition focus:border-primary/60 focus:ring-1 focus:ring-primary/30"
                          disabled={isLocked || goalOptions.length === 0}
                          onChange={(event) => {
                            const nextGoalId = event.target.value;

                            setConvertGoalId(nextGoalId);
                            setConvertPlanId(
                              planOptions.find(
                                (plan) => plan.parentId === nextGoalId,
                              )?.id ?? "",
                            );
                          }}
                          value={convertGoalId}
                        >
                          {goalOptions.length === 0 ? (
                            <option value="">Create a Goal first</option>
                          ) : null}
                          {goalOptions.map((goal) => (
                            <option key={goal.id} value={goal.id}>
                              {goal.title}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block">
                        <span className="text-xs font-medium text-muted-foreground">
                          Linked Plan
                        </span>
                        <select
                          className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm outline-none transition focus:border-primary/60 focus:ring-1 focus:ring-primary/30"
                          disabled={
                            isLocked ||
                            !convertGoalId ||
                            selectedGoalPlanOptions.length === 0
                          }
                          onChange={(event) => setConvertPlanId(event.target.value)}
                          value={convertPlanId}
                        >
                          {selectedGoalPlanOptions.length === 0 ? (
                            <option value="">Create a Plan for this Goal first</option>
                          ) : null}
                          {selectedGoalPlanOptions.map((plan) => (
                            <option key={plan.id} value={plan.id}>
                              {plan.title}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  ) : null}
                </div>
                <Button
                  className="w-full"
                  disabled={
                    isLocked ||
                    !hasWorkspaceFields ||
                    !isConvertTargetReady
                  }
                  onClick={handleConvert}
                  type="button"
                >
                  {isConverting ? "Adding" : `Add as ${columnLabels[convertType]}`}
                </Button>
              </div>
            </section>
          ) : null}

          {message ? (
            <p className="rounded-md border border-primary/25 bg-primary/5 px-3 py-2 text-xs text-primary">
              {message}
            </p>
          ) : null}
          {errorMessage ? (
            <p className="rounded-md border border-destructive/25 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {errorMessage}
            </p>
          ) : null}
        </CardContent>

        <div
          className={cn(
            "flex shrink-0 flex-wrap items-center gap-2 border-t p-3",
            hasChanges ? "justify-between" : "justify-center",
          )}
        >
          <Button
            className={cn(
              isConfirmingDelete
                ? "border-destructive bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:text-destructive-foreground"
                : "border-destructive/35 text-destructive hover:bg-destructive/10 hover:text-destructive",
            )}
            disabled={isSaving || isConverting || isDeleting}
            onClick={handleDelete}
            ref={deleteButtonRef}
            size="sm"
            type="button"
            variant="outline"
          >
            <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
            {isDeleting
              ? "Deleting"
              : isConfirmingDelete
                ? "Confirm delete"
                : "Delete card"}
          </Button>
          {hasChanges ? (
            <div className="flex items-center gap-2">
              <Button
                disabled={isLocked}
                onClick={handleDiscardChanges}
                size="sm"
                type="button"
                variant="outline"
              >
                Discard changes
              </Button>
              <Button disabled={isLocked} size="sm" type="submit">
                {isSaving ? "Saving" : "Save changes"}
              </Button>
            </div>
          ) : null}
        </div>
      </form>
    </Card>
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

function emptyStringToNull(value: string) {
  const trimmedValue = value.trim();
  return trimmedValue ? trimmedValue : null;
}

function isValidDateRange(start: string | null, end: string | null) {
  return !start || !end || start <= end;
}

function getNextSortOrder(cards: InboxCard[]) {
  return cards.reduce(
    (currentMax, card) => Math.max(currentMax, card.sortOrder),
    0,
  ) + 1;
}

function getNextNodeSortOrder(
  nodes: GoalTreeNode[],
  type: NodeType,
  parentId: string | null,
) {
  return (
    getSortedNodeOptions(nodes, type, parentId).reduce(
      (currentMax, node) => Math.max(currentMax, node.sortOrder),
      0,
    ) + 1
  );
}

function getSortedNodeOptions(
  nodes: GoalTreeNode[],
  type: NodeType,
  parentId?: string | null,
) {
  return nodes
    .filter((node) => {
      if (node.type !== type || !isNodeVisible(node, nodes)) {
        return false;
      }

      return parentId === undefined ? true : node.parentId === parentId;
    })
    .sort((first, second) => {
      if (first.sortOrder !== second.sortOrder) {
        return first.sortOrder - second.sortOrder;
      }

      return first.createdAt.localeCompare(second.createdAt);
    });
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


function getConvertTargetErrorMessage(type: NodeType) {
  if (type === "plan") {
    return "Create or select a linked Goal first.";
  }

  if (type === "task") {
    return "Create or select a linked Goal and Plan first.";
  }

  return "Select a Workspace target.";
}
