import type { SupabaseClient } from "@supabase/supabase-js";

import {
  inboxCardSelectColumns,
  legacyInboxCardSelectColumns,
  mapInboxCardRow,
  type InboxCardRow,
} from "@/lib/goaltree/inbox-card-rows";
import type { InboxCard } from "@/types/domain";

export type InboxData = {
  cards: InboxCard[];
  hasWorkspaceFields: boolean;
};

export async function getInboxData(
  supabase: SupabaseClient,
  userId: string,
): Promise<InboxData> {
  const { data: cardRows, error } = await supabase
    .from("inbox_cards")
    .select(inboxCardSelectColumns)
    .eq("user_id", userId)
    .is("converted_node_id", null)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .returns<InboxCardRow[]>();

  if (!error) {
    return {
      cards: (cardRows ?? []).map(mapInboxCardRow),
      hasWorkspaceFields: true,
    };
  }

  if (isMissingWorkspaceFieldError(error.message)) {
    const { data: legacyCardRows, error: legacyError } = await supabase
      .from("inbox_cards")
      .select(legacyInboxCardSelectColumns)
      .eq("user_id", userId)
      .is("converted_node_id", null)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })
      .returns<InboxCardRow[]>();

    if (legacyError) {
      throw new Error(`Failed to load inbox cards: ${legacyError.message}`);
    }

    return {
      cards: (legacyCardRows ?? []).map(mapInboxCardRow),
      hasWorkspaceFields: false,
    };
  }

  if (error) {
    throw new Error(`Failed to load inbox cards: ${error.message}`);
  }

  return { cards: [], hasWorkspaceFields: true };
}

function isMissingWorkspaceFieldError(message: string) {
  return (
    message.includes("inbox_cards.planned_start_date") ||
    message.includes("inbox_cards.planned_end_date") ||
    message.includes("inbox_cards.actual_start_date") ||
    message.includes("inbox_cards.actual_end_date")
  );
}
