import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { GoalTreeNode, NodeStatus, NodeType, PlanCategory } from "@/types/domain";

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

type NodeRow = {
  id: string;
  user_id: string;
  type: string;
  parent_id: string | null;
  title: string;
  memo: string | null;
  status: string;
  planned_start_date: string | null;
  planned_end_date: string | null;
  actual_start_date: string | null;
  actual_end_date: string | null;
  importance_reason: string | null;
  success_criteria_text: string | null;
  category_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  trashed_at: string | null;
};

type PlanCategoryRow = {
  id: string;
  user_id: string;
  name: string;
  color: string | null;
  created_at: string;
  updated_at: string;
};

const nodeTypes = new Set<NodeType>(["goal", "plan", "task"]);
const nodeStatuses = new Set<NodeStatus>([
  "not_started",
  "in_progress",
  "blocked",
  "done",
  "paused",
]);

export const defaultPlanCategories = [
  { name: "웹개발", color: "#2563eb" },
  { name: "공부", color: "#16a34a" },
  { name: "외부활동", color: "#7c3aed" },
  { name: "콘텐츠", color: "#0891b2" },
  { name: "사업", color: "#d97706" },
  { name: "건강", color: "#dc2626" },
  { name: "기타", color: "#64748b" },
] as const;

export type WorkspaceData = {
  categories: PlanCategory[];
  nodes: GoalTreeNode[];
};

export async function getWorkspaceData(
  supabase: SupabaseServerClient,
  userId: string,
): Promise<WorkspaceData> {
  const isNewWorkspaceUser = await ensureUserSettings(supabase, userId);

  if (isNewWorkspaceUser) {
    await createDefaultPlanCategories(supabase, userId);
  }

  const [{ data: categoryRows, error: categoriesError }, { data: nodeRows, error: nodesError }] =
    await Promise.all([
      supabase
        .from("plan_categories")
        .select("id,user_id,name,color,created_at,updated_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: true })
        .returns<PlanCategoryRow[]>(),
      supabase
        .from("nodes")
        .select(
          [
            "id",
            "user_id",
            "type",
            "parent_id",
            "title",
            "memo",
            "status",
            "planned_start_date",
            "planned_end_date",
            "actual_start_date",
            "actual_end_date",
            "importance_reason",
            "success_criteria_text",
            "category_id",
            "sort_order",
            "created_at",
            "updated_at",
            "trashed_at",
          ].join(","),
        )
        .eq("user_id", userId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true })
        .returns<NodeRow[]>(),
    ]);

  if (categoriesError) {
    throw new Error(`Failed to load plan categories: ${categoriesError.message}`);
  }

  if (nodesError) {
    throw new Error(`Failed to load workspace nodes: ${nodesError.message}`);
  }

  return {
    categories: (categoryRows ?? []).map(mapPlanCategoryRow),
    nodes: (nodeRows ?? []).map(mapNodeRow),
  };
}

async function ensureUserSettings(
  supabase: SupabaseServerClient,
  userId: string,
) {
  const { data: existingSettings, error: lookupError } = await supabase
    .from("user_settings")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (lookupError) {
    throw new Error(`Failed to load user settings: ${lookupError.message}`);
  }

  if (existingSettings) {
    return false;
  }

  const { error: insertError } = await supabase.from("user_settings").insert({
    user_id: userId,
    auto_fill_actual_dates_on_status_change: true,
  });

  if (insertError) {
    throw new Error(`Failed to initialize user settings: ${insertError.message}`);
  }

  return true;
}

async function createDefaultPlanCategories(
  supabase: SupabaseServerClient,
  userId: string,
) {
  const { error: insertError } = await supabase.from("plan_categories").insert(
    defaultPlanCategories.map((category) => ({
      user_id: userId,
      name: category.name,
      color: category.color,
    })),
  );

  if (insertError) {
    throw new Error(`Failed to initialize plan categories: ${insertError.message}`);
  }
}

function mapPlanCategoryRow(row: PlanCategoryRow): PlanCategory {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    color: row.color,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapNodeRow(row: NodeRow): GoalTreeNode {
  return {
    id: row.id,
    userId: row.user_id,
    type: parseNodeType(row.type),
    parentId: row.parent_id,
    title: row.title,
    memo: row.memo,
    status: parseNodeStatus(row.status),
    plannedStartDate: row.planned_start_date,
    plannedEndDate: row.planned_end_date,
    actualStartDate: row.actual_start_date,
    actualEndDate: row.actual_end_date,
    importanceReason: row.importance_reason,
    successCriteriaText: row.success_criteria_text,
    categoryId: row.category_id,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    trashedAt: row.trashed_at,
  };
}

function parseNodeType(value: string): NodeType {
  if (nodeTypes.has(value as NodeType)) {
    return value as NodeType;
  }

  throw new Error(`Unknown node type: ${value}`);
}

function parseNodeStatus(value: string): NodeStatus {
  if (nodeStatuses.has(value as NodeStatus)) {
    return value as NodeStatus;
  }

  throw new Error(`Unknown node status: ${value}`);
}
