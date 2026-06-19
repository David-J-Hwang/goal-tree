import type { InboxCard, NodeStatus } from "@/types/domain";

export type InboxCardRow = {
  id: string;
  user_id: string;
  title: string;
  memo: string | null;
  status: string;
  planned_start_date?: string | null;
  planned_end_date?: string | null;
  actual_start_date?: string | null;
  actual_end_date?: string | null;
  sort_order: number;
  converted_node_id: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

const nodeStatuses = new Set<NodeStatus>([
  "not_started",
  "in_progress",
  "blocked",
  "done",
  "paused",
]);

export const inboxCardSelectColumns = [
  "id",
  "user_id",
  "title",
  "memo",
  "status",
  "planned_start_date",
  "planned_end_date",
  "actual_start_date",
  "actual_end_date",
  "sort_order",
  "converted_node_id",
  "archived_at",
  "created_at",
  "updated_at",
].join(",");

export const legacyInboxCardSelectColumns = [
  "id",
  "user_id",
  "title",
  "memo",
  "status",
  "sort_order",
  "converted_node_id",
  "archived_at",
  "created_at",
  "updated_at",
].join(",");

export function mapInboxCardRow(row: InboxCardRow): InboxCard {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    memo: row.memo,
    status: parseNodeStatus(row.status),
    plannedStartDate: row.planned_start_date ?? null,
    plannedEndDate: row.planned_end_date ?? null,
    actualStartDate: row.actual_start_date ?? null,
    actualEndDate: row.actual_end_date ?? null,
    sortOrder: row.sort_order,
    convertedNodeId: row.converted_node_id,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parseNodeStatus(value: string): NodeStatus {
  const legacyStatusMap: Record<string, NodeStatus> = {
    converted: "done",
    new: "not_started",
    reviewing: "in_progress",
  };
  const normalizedValue = legacyStatusMap[value] ?? value;

  if (nodeStatuses.has(normalizedValue as NodeStatus)) {
    return normalizedValue as NodeStatus;
  }

  throw new Error(`Unknown node status: ${value}`);
}
