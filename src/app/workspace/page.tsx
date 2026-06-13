import { redirect } from "next/navigation";

import { getWorkspaceData } from "@/lib/goaltree/workspace-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { WorkspaceBoard } from "./workspace-board";

type WorkspacePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function WorkspacePage({ searchParams }: WorkspacePageProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const resolvedSearchParams = await searchParams;
  const workspaceData = await getWorkspaceData(supabase, user.id);

  return (
    <WorkspaceBoard
      initialCategories={workspaceData.categories}
      initialNodes={workspaceData.nodes}
      initialSelectedNodeId={getInitialSelectedNodeId(resolvedSearchParams)}
      initialSettings={workspaceData.settings}
      initialTodayDate={workspaceData.todayDate}
      initialTodayTodos={workspaceData.todayTodos}
      userId={user.id}
    />
  );
}

function getInitialSelectedNodeId(
  searchParams?: Record<string, string | string[] | undefined>,
) {
  return (
    getSearchParamValue(searchParams?.nodeId) ??
    getSearchParamValue(searchParams?.taskId) ??
    getSearchParamValue(searchParams?.planId) ??
    getSearchParamValue(searchParams?.goalId) ??
    null
  );
}

function getSearchParamValue(value?: string | string[]) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}
