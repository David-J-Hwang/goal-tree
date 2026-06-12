export function getWorkspaceNodeHref(nodeId?: string | null) {
  if (!nodeId) {
    return "/workspace";
  }

  return `/workspace?nodeId=${encodeURIComponent(nodeId)}`;
}
