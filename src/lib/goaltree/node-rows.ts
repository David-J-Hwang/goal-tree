import type { GoalTreeNode, NodeStatus, NodeType, PlanCategory } from "@/types/domain";

export type NodeRow = {
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

export type PlanCategoryRow = {
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

export const nodeSelectColumns = [
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
].join(",");

export function mapPlanCategoryRow(row: PlanCategoryRow): PlanCategory {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    color: row.color,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapNodeRow(row: NodeRow): GoalTreeNode {
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
