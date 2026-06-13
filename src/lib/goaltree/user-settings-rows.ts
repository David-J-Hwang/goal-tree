import type { UserSettings } from "@/types/domain";

export type UserSettingsRow = {
  user_id: string;
  auto_fill_actual_dates_on_status_change: boolean;
};

export const userSettingsSelectColumns = [
  "user_id",
  "auto_fill_actual_dates_on_status_change",
].join(",");

export function mapUserSettingsRow(row: UserSettingsRow): UserSettings {
  return {
    userId: row.user_id,
    autoFillActualDatesOnStatusChange:
      row.auto_fill_actual_dates_on_status_change,
  };
}
