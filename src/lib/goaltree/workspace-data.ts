import { createSupabaseServerClient } from "@/lib/supabase/server";
import { addDaysToDateString, getAppDateString } from "@/lib/date";
import {
  mapNodeRow,
  mapPlanCategoryRow,
  nodeSelectColumns,
  type NodeRow,
  type PlanCategoryRow,
} from "@/lib/goaltree/node-rows";
import {
  mapTodayTodoRow,
  todayTodoSelectColumns,
  type TodayTodoRow,
} from "@/lib/goaltree/today-todo-rows";
import {
  mapUserSettingsRow,
  userSettingsSelectColumns,
  type UserSettingsRow,
} from "@/lib/goaltree/user-settings-rows";
import type {
  GoalTreeNode,
  PlanCategory,
  TodayTodo,
  UserSettings,
} from "@/types/domain";

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export const defaultPlanCategories = [
  { name: "웹개발", color: "#2563eb" },
  { name: "공부", color: "#16a34a" },
  { name: "외부활동", color: "#7c3aed" },
  { name: "콘텐츠", color: "#0891b2" },
  { name: "사업", color: "#d97706" },
  { name: "건강", color: "#dc2626" },
  { name: "기타", color: "#64748b" },
] as const;

export type WorkspaceData = {
  categories: PlanCategory[];
  nodes: GoalTreeNode[];
  settings: UserSettings;
  todayDate: string;
  todayTodos: TodayTodo[];
};

export async function getWorkspaceData(
  supabase: SupabaseServerClient,
  userId: string,
): Promise<WorkspaceData> {
  const isNewWorkspaceUser = await ensureUserSettings(supabase, userId);

  if (isNewWorkspaceUser) {
    await createDefaultPlanCategories(supabase, userId);
  }

  const today = getAppDateString();
  const recentTodoStartDate = addDaysToDateString(today, -6);
  await cleanupExpiredTodayTodos(supabase, userId, recentTodoStartDate);

  const [
    { data: categoryRows, error: categoriesError },
    { data: nodeRows, error: nodesError },
    { data: settingsRow, error: settingsError },
    { data: todayTodoRows, error: todayTodosError },
  ] = await Promise.all([
    supabase
      .from("plan_categories")
      .select("id,user_id,name,color,sort_order,created_at,updated_at")
      .eq("user_id", userId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })
      .returns<PlanCategoryRow[]>(),
    supabase
      .from("nodes")
      .select(nodeSelectColumns)
      .eq("user_id", userId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })
      .returns<NodeRow[]>(),
    supabase
      .from("user_settings")
      .select(userSettingsSelectColumns)
      .eq("user_id", userId)
      .single()
      .returns<UserSettingsRow>(),
    supabase
      .from("today_todos")
      .select(todayTodoSelectColumns)
      .eq("user_id", userId)
      .gte("date", recentTodoStartDate)
      .lte("date", today)
      .order("date", { ascending: true })
      .order("sort_order", { ascending: true })
      .returns<TodayTodoRow[]>(),
  ]);

  if (categoriesError) {
    throw new Error(`Failed to load plan categories: ${categoriesError.message}`);
  }

  if (nodesError) {
    throw new Error(`Failed to load workspace nodes: ${nodesError.message}`);
  }

  if (settingsError) {
    throw new Error(`Failed to load user settings: ${settingsError.message}`);
  }

  if (todayTodosError) {
    throw new Error(`Failed to load today todos: ${todayTodosError.message}`);
  }

  return {
    categories: (categoryRows ?? []).map(mapPlanCategoryRow),
    nodes: (nodeRows ?? []).map(mapNodeRow),
    settings: mapUserSettingsRow(settingsRow),
    todayDate: today,
    todayTodos: (todayTodoRows ?? []).map(mapTodayTodoRow),
  };
}

async function ensureUserSettings(
  supabase: SupabaseServerClient,
  userId: string,
) {
  const { data: existingSettings, error: lookupError } = await supabase
    .from("user_settings")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (lookupError) {
    throw new Error(`Failed to load user settings: ${lookupError.message}`);
  }

  if (existingSettings) {
    return false;
  }

  const { error: insertError } = await supabase.from("user_settings").insert({
    user_id: userId,
    auto_fill_actual_dates_on_status_change: true,
  });

  if (insertError) {
    throw new Error(`Failed to initialize user settings: ${insertError.message}`);
  }

  return true;
}

async function createDefaultPlanCategories(
  supabase: SupabaseServerClient,
  userId: string,
) {
  const { data: existingCategories, error: lookupError } = await supabase
    .from("plan_categories")
    .select("id")
    .eq("user_id", userId)
    .limit(1);

  if (lookupError) {
    throw new Error(`Failed to check plan categories: ${lookupError.message}`);
  }

  if (existingCategories && existingCategories.length > 0) {
    return;
  }

  const { error: insertError } = await supabase.from("plan_categories").insert(
    defaultPlanCategories.map((category, index) => ({
      user_id: userId,
      name: category.name,
      color: category.color,
      sort_order: index + 1,
    })),
  );

  if (insertError) {
    throw new Error(`Failed to initialize plan categories: ${insertError.message}`);
  }
}

async function cleanupExpiredTodayTodos(
  supabase: SupabaseServerClient,
  userId: string,
  recentTodoStartDate: string,
) {
  const { error } = await supabase
    .from("today_todos")
    .delete()
    .eq("user_id", userId)
    .lt("date", recentTodoStartDate);

  if (error) {
    console.error(`Failed to cleanup expired today todos: ${error.message}`);
  }
}
