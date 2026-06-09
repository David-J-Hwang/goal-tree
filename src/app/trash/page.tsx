import { redirect } from "next/navigation";

import { getWorkspaceData } from "@/lib/goaltree/workspace-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { TrashBoard } from "./trash-board";

export default async function TrashPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const trashData = await getWorkspaceData(supabase, user.id);

  return <TrashBoard initialNodes={trashData.nodes} userId={user.id} />;
}
