import type { TodayTodo } from "@/types/domain";

export type TodayTodoRow = {
  id: string;
  user_id: string;
  task_id: string;
  date: string;
  sort_order: number;
  done: boolean;
  created_at: string;
  updated_at: string;
};

export const todayTodoSelectColumns = [
  "id",
  "user_id",
  "task_id",
  "date",
  "sort_order",
  "done",
  "created_at",
  "updated_at",
].join(",");

export function mapTodayTodoRow(row: TodayTodoRow): TodayTodo {
  return {
    id: row.id,
    userId: row.user_id,
    taskId: row.task_id,
    date: row.date,
    sortOrder: row.sort_order,
    done: row.done,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
