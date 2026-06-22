import type { SupabaseClient } from "@supabase/supabase-js";

import type { GoalTreeNode, NodeStatus, NodeType } from "@/types/domain";

import { mapNodeRow, nodeSelectColumns, type NodeRow } from "./node-rows";

type SyncAncestorStatusesInput = {
  autoFillActualDatesOnStatusChange?: boolean;
  nodes: GoalTreeNode[];
  parentIds?: Array<string | null | undefined>;
  nodeIds?: Array<string | null | undefined>;
  supabase: SupabaseClient;
  userId: string;
};

export async function syncAncestorStatuses({
  autoFillActualDatesOnStatusChange = false,
  nodes,
  parentIds = [],
  nodeIds = [],
  supabase,
  userId,
}: SyncAncestorStatusesInput): Promise<GoalTreeNode[]> {
  let nextNodes = nodes;
  const queuedParentIds = new Set<string>();
  const processedParentIds = new Set<string>();

  for (const parentId of parentIds) {
    if (parentId) {
      queuedParentIds.add(parentId);
    }
  }

  for (const nodeId of nodeIds) {
    const node = nodeId ? nextNodes.find((item) => item.id === nodeId) : undefined;

    if (node?.parentId) {
      queuedParentIds.add(node.parentId);
    }
  }

  while (queuedParentIds.size > 0) {
    const parentId = Array.from(queuedParentIds)[0];
    queuedParentIds.delete(parentId);

    if (processedParentIds.has(parentId)) {
      continue;
    }

    processedParentIds.add(parentId);

    const parentNode = nextNodes.find((node) => node.id === parentId);

    if (!parentNode || parentNode.type === "task" || parentNode.trashedAt) {
      continue;
    }

    const calculableChildren = getCalculableChildren(parentNode, nextNodes);

    if (calculableChildren.length === 0) {
      continue;
    }

    const nextStatus = getDerivedParentStatus(calculableChildren);
    const nextDates = autoFillActualDatesOnStatusChange
      ? getDerivedParentActualDates(parentNode, calculableChildren, nextStatus)
      : {
          actualStartDate: parentNode.actualStartDate ?? null,
          actualEndDate: parentNode.actualEndDate ?? null,
        };
    const updatePayload: {
      actual_end_date?: string | null;
      actual_start_date?: string | null;
      status?: NodeStatus;
    } = {};

    if (nextStatus !== parentNode.status) {
      updatePayload.status = nextStatus;
    }

    if ((parentNode.actualStartDate ?? null) !== nextDates.actualStartDate) {
      updatePayload.actual_start_date = nextDates.actualStartDate;
    }

    if ((parentNode.actualEndDate ?? null) !== nextDates.actualEndDate) {
      updatePayload.actual_end_date = nextDates.actualEndDate;
    }

    if (Object.keys(updatePayload).length > 0) {
      const { data, error } = await supabase
        .from("nodes")
        .update(updatePayload)
        .eq("id", parentNode.id)
        .eq("user_id", userId)
        .select(nodeSelectColumns)
        .single()
        .returns<NodeRow>();

      if (error) {
        throw new Error(error.message);
      }

      if (!data) {
        throw new Error("Synced parent node was not returned.");
      }

      const syncedParent = mapNodeRow(data);

      nextNodes = nextNodes.map((node) =>
        node.id === syncedParent.id ? syncedParent : node,
      );
    }

    const latestParent = nextNodes.find((node) => node.id === parentId);

    if (latestParent?.parentId) {
      queuedParentIds.add(latestParent.parentId);
    }
  }

  return nextNodes;
}

function getCalculableChildren(
  parentNode: GoalTreeNode,
  nodes: GoalTreeNode[],
): GoalTreeNode[] {
  const childType = getChildType(parentNode.type);

  if (!childType) {
    return [];
  }

  return nodes.filter(
    (node) =>
      node.type === childType &&
      node.parentId === parentNode.id &&
      node.status !== "paused" &&
      isNodeVisible(node, nodes),
  );
}

function getDerivedParentStatus(
  calculableChildren: GoalTreeNode[],
): NodeStatus {
  if (calculableChildren.every((node) => node.status === "done")) {
    return "done";
  }

  if (calculableChildren.some((node) => node.status === "blocked")) {
    return "blocked";
  }

  if (
    calculableChildren.some(
      (node) => node.status === "in_progress" || node.status === "done",
    )
  ) {
    return "in_progress";
  }

  if (calculableChildren.every((node) => node.status === "not_started")) {
    return "not_started";
  }

  return "not_started";
}

function getDerivedParentActualDates(
  parentNode: GoalTreeNode,
  calculableChildren: GoalTreeNode[],
  nextStatus: NodeStatus,
) {
  const hasOnlyNotStartedChildren = calculableChildren.every(
    (node) => node.status === "not_started",
  );

  if (hasOnlyNotStartedChildren) {
    return {
      actualStartDate: null,
      actualEndDate: null,
    };
  }

  const startDates = calculableChildren
    .map((node) => node.actualStartDate)
    .filter((date): date is string => Boolean(date))
    .sort();
  const endDates = calculableChildren
    .map((node) => node.actualEndDate)
    .filter((date): date is string => Boolean(date))
    .sort();

  return {
    actualStartDate: startDates[0] ?? parentNode.actualStartDate ?? null,
    actualEndDate:
      nextStatus === "done"
        ? endDates.at(-1) ?? parentNode.actualEndDate ?? null
        : null,
  };
}

function getChildType(nodeType: NodeType): NodeType | null {
  if (nodeType === "goal") {
    return "plan";
  }

  if (nodeType === "plan") {
    return "task";
  }

  return null;
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
