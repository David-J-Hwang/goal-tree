import { redirect } from "next/navigation";

import { getWorkspaceData } from "@/lib/goaltree/workspace-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { TimelineBoard } from "./timeline-board";

export default async function TimelinePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const timelineData = await getWorkspaceData(supabase, user.id);

  return <TimelineBoard initialNodes={timelineData.nodes} />;
}
