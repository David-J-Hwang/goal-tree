import { redirect } from "next/navigation";

import { getWorkspaceData } from "@/lib/goaltree/workspace-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { DashboardBoard } from "./dashboard-board";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const dashboardData = await getWorkspaceData(supabase, user.id);

  return (
    <DashboardBoard
      initialNodes={dashboardData.nodes}
      initialSettings={dashboardData.settings}
      initialTodayDate={dashboardData.todayDate}
      initialTodayTodos={dashboardData.todayTodos}
      userId={user.id}
    />
  );
}
