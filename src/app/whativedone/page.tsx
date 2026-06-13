import { redirect } from "next/navigation";

import { getWorkspaceData } from "@/lib/goaltree/workspace-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { WhatIveDoneBoard } from "./what-ive-done-board";

export default async function WhatIveDonePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const whatIveDoneData = await getWorkspaceData(supabase, user.id);

  return (
    <WhatIveDoneBoard
      initialCategories={whatIveDoneData.categories}
      initialNodes={whatIveDoneData.nodes}
    />
  );
}
