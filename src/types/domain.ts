export type NodeType = "goal" | "plan" | "task";

export type NodeStatus =
  | "not_started"
  | "in_progress"
  | "blocked"
  | "done"
  | "paused";

export type GoalTreeNode = {
  id: string;
  userId: string;
  type: NodeType;
  parentId: string | null;
  title: string;
  memo?: string | null;
  status: NodeStatus;
  plannedStartDate?: string | null;
  plannedEndDate?: string | null;
  actualStartDate?: string | null;
  actualEndDate?: string | null;
  importanceReason?: string | null;
  successCriteriaText?: string | null;
  categoryId?: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  trashedAt?: string | null;
};

export type PlanCategory = {
  id: string;
  userId: string;
  name: string;
  color?: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type TodayTodo = {
  id: string;
  userId: string;
  taskId: string;
  date: string;
  sortOrder: number;
  done: boolean;
  createdAt: string;
  updatedAt: string;
};

export type UserSettings = {
  userId: string;
  autoFillActualDatesOnStatusChange: boolean;
};
