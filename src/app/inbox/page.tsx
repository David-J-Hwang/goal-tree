import { redirect } from "next/navigation";

import { getInboxData } from "@/lib/goaltree/inbox-data";
import { getWorkspaceData } from "@/lib/goaltree/workspace-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { InboxBoard } from "./inbox-board";

export default async function InboxPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const inboxData = await getInboxData(supabase, user.id);
  const workspaceData = await getWorkspaceData(supabase, user.id);

  return (
    <InboxBoard
      hasWorkspaceFields={inboxData.hasWorkspaceFields}
      initialCategories={workspaceData.categories}
      initialCards={inboxData.cards}
      initialNodes={workspaceData.nodes}
      userId={user.id}
    />
  );
}
