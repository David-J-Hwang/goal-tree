export type Theme = "light" | "dark";

export const themeStorageKey = "goaltree-theme";

export function isTheme(value: string | null | undefined): value is Theme {
  return value === "light" || value === "dark";
}
