import { redirect } from "next/navigation";

import { getWorkspaceData } from "@/lib/goaltree/workspace-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { WorkspaceBoard } from "./workspace-board";

export default async function WorkspacePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const workspaceData = await getWorkspaceData(supabase, user.id);

  return (
    <WorkspaceBoard
      initialCategories={workspaceData.categories}
      initialNodes={workspaceData.nodes}
      initialTodayDate={workspaceData.todayDate}
      initialTodayTodos={workspaceData.todayTodos}
      userId={user.id}
    />
  );
}
