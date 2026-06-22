import type { SupabaseClient } from "@supabase/supabase-js";

import type { GoalTreeNode, NodeStatus, NodeType } from "@/types/domain";

import { mapNodeRow, nodeSelectColumns, type NodeRow } from "./node-rows";

type SyncAncestorStatusesInput = {
  nodes: GoalTreeNode[];
  parentIds?: Array<string | null | undefined>;
  nodeIds?: Array<string | null | undefined>;
  supabase: SupabaseClient;
  userId: string;
};

export async function syncAncestorStatuses({
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

    const nextStatus = getDerivedParentStatus(parentNode, nextNodes);

    if (!nextStatus) {
      continue;
    }

    if (nextStatus !== parentNode.status) {
      const { data, error } = await supabase
        .from("nodes")
        .update({ status: nextStatus })
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

function getDerivedParentStatus(
  parentNode: GoalTreeNode,
  nodes: GoalTreeNode[],
): NodeStatus | null {
  const childType = getChildType(parentNode.type);

  if (!childType) {
    return null;
  }

  const calculableChildren = nodes.filter(
    (node) =>
      node.type === childType &&
      node.parentId === parentNode.id &&
      node.status !== "paused" &&
      isNodeVisible(node, nodes),
  );

  if (calculableChildren.length === 0) {
    return null;
  }

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

  return null;
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
