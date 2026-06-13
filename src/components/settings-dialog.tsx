"use client";

import {
  type ComponentType,
  type FormEvent,
  type ReactNode,
  useEffect,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Cog6ToothIcon,
  MoonIcon,
  PlusIcon,
  SunIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

import { Button } from "@/components/ui/button";
import {
  mapPlanCategoryRow,
  type PlanCategoryRow,
} from "@/lib/goaltree/node-rows";
import {
  mapUserSettingsRow,
  userSettingsSelectColumns,
  type UserSettingsRow,
} from "@/lib/goaltree/user-settings-rows";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { PlanCategory, UserSettings } from "@/types/domain";

type Theme = "light" | "dark";

const themeStorageKey = "goaltree-theme";
const categorySelectColumns = "id,user_id,name,color,created_at,updated_at";
const defaultCategoryColor = "#16a34a";

export function SettingsDialog() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [theme, setTheme] = useState<Theme | null>(null);
  const [userId, setUserId] = useState("");
  const [categories, setCategories] = useState<PlanCategory[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState(defaultCategoryColor);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [savingCategoryId, setSavingCategoryId] = useState("");
  const [deletingCategoryId, setDeletingCategoryId] = useState("");
  const [pendingDeleteCategoryId, setPendingDeleteCategoryId] = useState("");
  const [isUpdatingAutomation, setIsUpdatingAutomation] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const savedTheme = getStoredTheme();
    const initialTheme = savedTheme ?? getSystemTheme();

    setTheme(initialTheme);
    applyTheme(initialTheme);

    if (savedTheme) {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemThemeChange = () => {
      const nextTheme = getSystemTheme();
      setTheme(nextTheme);
      applyTheme(nextTheme);
    };

    mediaQuery.addEventListener("change", handleSystemThemeChange);

    return () => {
      mediaQuery.removeEventListener("change", handleSystemThemeChange);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    void loadSettingsData();
  }, [isOpen]);

  async function loadSettingsData() {
    setIsLoading(true);
    setErrorMessage("");
    setStatusMessage("");

    const supabase = createSupabaseBrowserClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setErrorMessage(userError?.message ?? "User was not found.");
      setIsLoading(false);
      return;
    }

    setUserId(user.id);

    const [
      { data: categoryRows, error: categoriesError },
      { data: settingsRow, error: settingsError },
    ] = await Promise.all([
      supabase
        .from("plan_categories")
        .select(categorySelectColumns)
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .returns<PlanCategoryRow[]>(),
      supabase
        .from("user_settings")
        .select(userSettingsSelectColumns)
        .eq("user_id", user.id)
        .maybeSingle()
        .returns<UserSettingsRow>(),
    ]);

    if (categoriesError) {
      setErrorMessage(categoriesError.message);
      setIsLoading(false);
      return;
    }

    if (settingsError) {
      setErrorMessage(settingsError.message);
      setIsLoading(false);
      return;
    }

    setCategories((categoryRows ?? []).map(mapPlanCategoryRow));

    if (settingsRow) {
      setSettings(mapUserSettingsRow(settingsRow));
      setIsLoading(false);
      return;
    }

    const { data: createdSettingsRow, error: createSettingsError } = await supabase
      .from("user_settings")
      .insert({
        user_id: user.id,
        auto_fill_actual_dates_on_status_change: true,
      })
      .select(userSettingsSelectColumns)
      .single()
      .returns<UserSettingsRow>();

    if (createSettingsError || !createdSettingsRow) {
      setErrorMessage(
        createSettingsError?.message ?? "Failed to initialize settings.",
      );
      setIsLoading(false);
      return;
    }

    setSettings(mapUserSettingsRow(createdSettingsRow));
    setIsLoading(false);
  }

  function handleThemeChange(nextTheme: Theme) {
    setTheme(nextTheme);
    window.localStorage.setItem(themeStorageKey, nextTheme);
    applyTheme(nextTheme);
  }

  async function handleAddCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = newCategoryName.trim();

    if (!userId || !trimmedName) {
      setErrorMessage("Category name is required.");
      setStatusMessage("");
      return;
    }

    setIsAddingCategory(true);
    setErrorMessage("");
    setStatusMessage("");

    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("plan_categories")
      .insert({
        user_id: userId,
        name: trimmedName,
        color: newCategoryColor,
      })
      .select(categorySelectColumns)
      .single()
      .returns<PlanCategoryRow>();

    if (error || !data) {
      setErrorMessage(error?.message ?? "Failed to add category.");
      setIsAddingCategory(false);
      return;
    }

    setCategories((currentCategories) => [
      ...currentCategories,
      mapPlanCategoryRow(data),
    ]);
    setNewCategoryName("");
    setNewCategoryColor(defaultCategoryColor);
    setStatusMessage("Category added.");
    setIsAddingCategory(false);
    router.refresh();
  }

  async function handleUpdateCategory(category: PlanCategory) {
    const trimmedName = category.name.trim();

    if (!trimmedName) {
      setErrorMessage("Category name is required.");
      setStatusMessage("");
      return;
    }

    setSavingCategoryId(category.id);
    setErrorMessage("");
    setStatusMessage("");

    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("plan_categories")
      .update({
        name: trimmedName,
        color: category.color || null,
      })
      .eq("id", category.id)
      .eq("user_id", userId)
      .select(categorySelectColumns)
      .single()
      .returns<PlanCategoryRow>();

    if (error || !data) {
      setErrorMessage(error?.message ?? "Failed to update category.");
      setSavingCategoryId("");
      return;
    }

    const updatedCategory = mapPlanCategoryRow(data);
    setCategories((currentCategories) =>
      currentCategories.map((currentCategory) =>
        currentCategory.id === updatedCategory.id
          ? updatedCategory
          : currentCategory,
      ),
    );
    setStatusMessage("Category saved.");
    setSavingCategoryId("");
    router.refresh();
  }

  async function handleDeleteCategory(category: PlanCategory) {
    if (pendingDeleteCategoryId !== category.id) {
      setPendingDeleteCategoryId(category.id);
      setErrorMessage("");
      setStatusMessage("");
      return;
    }

    setDeletingCategoryId(category.id);
    setErrorMessage("");
    setStatusMessage("");

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase
      .from("plan_categories")
      .delete()
      .eq("id", category.id)
      .eq("user_id", userId);

    if (error) {
      setErrorMessage(error.message);
      setDeletingCategoryId("");
      return;
    }

    setCategories((currentCategories) =>
      currentCategories.filter((currentCategory) => currentCategory.id !== category.id),
    );
    setPendingDeleteCategoryId("");
    setDeletingCategoryId("");
    setStatusMessage("Category deleted.");
    router.refresh();
  }

  async function handleAutomationChange(checked: boolean) {
    if (!settings) {
      return;
    }

    setIsUpdatingAutomation(true);
    setErrorMessage("");
    setStatusMessage("");

    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("user_settings")
      .update({
        auto_fill_actual_dates_on_status_change: checked,
      })
      .eq("user_id", settings.userId)
      .select(userSettingsSelectColumns)
      .single()
      .returns<UserSettingsRow>();

    if (error || !data) {
      setErrorMessage(error?.message ?? "Failed to update automation.");
      setIsUpdatingAutomation(false);
      return;
    }

    setSettings(mapUserSettingsRow(data));
    setStatusMessage("Automation saved.");
    setIsUpdatingAutomation(false);
    router.refresh();
  }

  function updateCategoryDraft(
    categoryId: string,
    values: Partial<Pick<PlanCategory, "name" | "color">>,
  ) {
    setCategories((currentCategories) =>
      currentCategories.map((category) =>
        category.id === categoryId ? { ...category, ...values } : category,
      ),
    );
    setPendingDeleteCategoryId("");
  }

  const settingsDialog = isOpen ? (
    <div className="fixed inset-0 z-[100] overflow-hidden">
      <button
        aria-label="Close settings"
        className="absolute inset-0 h-full w-full bg-background/75 backdrop-blur-sm"
        onClick={() => setIsOpen(false)}
        type="button"
      />
      <section
        aria-modal="true"
        className="fixed inset-y-0 right-0 flex h-screen w-full max-w-xl flex-col border-l bg-background shadow-xl"
        role="dialog"
      >
        <header className="flex h-14 shrink-0 items-center justify-between border-b px-4">
          <div>
            <h2 className="text-sm font-semibold">Settings</h2>
          </div>
          <Button
            aria-label="Close settings"
            onClick={() => setIsOpen(false)}
            size="icon"
            type="button"
            variant="ghost"
          >
            <XMarkIcon className="h-5 w-5" aria-hidden="true" />
          </Button>
        </header>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
          {errorMessage ? (
            <p className="rounded-md border border-destructive/25 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {errorMessage}
            </p>
          ) : null}
          {statusMessage ? (
            <p className="rounded-md border border-primary/25 bg-primary/5 px-3 py-2 text-sm text-primary">
              {statusMessage}
            </p>
          ) : null}

          <SettingsSection
            description="Theme"
            isLoading={isLoading}
            title="Appearance"
          >
            <div className="grid grid-cols-2 gap-2">
              <ThemeButton
                active={theme === "light"}
                icon={SunIcon}
                label="Light"
                onClick={() => handleThemeChange("light")}
              />
              <ThemeButton
                active={theme === "dark"}
                icon={MoonIcon}
                label="Dark"
                onClick={() => handleThemeChange("dark")}
              />
            </div>
          </SettingsSection>

          <SettingsSection
            description={`${categories.length} categories`}
            isLoading={isLoading}
            title="Plan Categories"
          >
            <form
              className="rounded-md border bg-muted/25 p-3"
              onSubmit={handleAddCategory}
            >
              <div className="grid gap-2 sm:grid-cols-[3rem_minmax(0,1fr)_auto]">
                <input
                  aria-label="New category color"
                  className="h-10 w-full rounded-md border bg-background p-1"
                  disabled={isAddingCategory || isLoading}
                  onChange={(event) => setNewCategoryColor(event.target.value)}
                  type="color"
                  value={newCategoryColor}
                />
                <input
                  className="h-10 rounded-md border bg-background px-3 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary/60 focus:ring-1 focus:ring-primary/30"
                  disabled={isAddingCategory || isLoading}
                  onChange={(event) => setNewCategoryName(event.target.value)}
                  placeholder="New category"
                  value={newCategoryName}
                />
                <Button disabled={isAddingCategory || isLoading} type="submit">
                  <PlusIcon className="h-4 w-4" aria-hidden="true" />
                  {isAddingCategory ? "Adding" : "Add"}
                </Button>
              </div>
            </form>

            <div className="space-y-2">
              {categories.length > 0 ? (
                categories.map((category) => (
                  <div
                    className="grid gap-2 rounded-md border bg-background p-3 sm:grid-cols-[3rem_minmax(0,1fr)_auto_auto]"
                    key={category.id}
                  >
                    <input
                      aria-label={`${category.name} color`}
                      className="h-10 w-full rounded-md border bg-background p-1"
                      disabled={isLoading || savingCategoryId === category.id}
                      onChange={(event) =>
                        updateCategoryDraft(category.id, {
                          color: event.target.value,
                        })
                      }
                      type="color"
                      value={category.color ?? defaultCategoryColor}
                    />
                    <input
                      className="h-10 rounded-md border bg-background px-3 text-sm outline-none transition focus:border-primary/60 focus:ring-1 focus:ring-primary/30"
                      disabled={isLoading || savingCategoryId === category.id}
                      onChange={(event) =>
                        updateCategoryDraft(category.id, {
                          name: event.target.value,
                        })
                      }
                      value={category.name}
                    />
                    <Button
                      disabled={
                        isLoading ||
                        savingCategoryId === category.id ||
                        deletingCategoryId === category.id
                      }
                      onClick={() => handleUpdateCategory(category)}
                      type="button"
                      variant="outline"
                    >
                      {savingCategoryId === category.id ? "Saving" : "Save"}
                    </Button>
                    <Button
                      className={cn(
                        pendingDeleteCategoryId === category.id
                          ? "border-destructive bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:text-destructive-foreground"
                          : "border-destructive/35 text-destructive hover:bg-destructive/10 hover:text-destructive",
                      )}
                      disabled={
                        isLoading ||
                        savingCategoryId === category.id ||
                        deletingCategoryId === category.id
                      }
                      onClick={() => handleDeleteCategory(category)}
                      type="button"
                      variant="outline"
                    >
                      <TrashIcon className="h-4 w-4" aria-hidden="true" />
                      {deletingCategoryId === category.id
                        ? "Deleting"
                        : pendingDeleteCategoryId === category.id
                          ? "Confirm"
                          : "Delete"}
                    </Button>
                  </div>
                ))
              ) : (
                <p className="rounded-md border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
                  No categories yet
                </p>
              )}
            </div>
          </SettingsSection>

          <SettingsSection
            description="Workspace"
            isLoading={isLoading}
            title="Automation"
          >
            <label className="flex items-center justify-between gap-4 rounded-md border bg-background px-3 py-3">
              <span className="text-sm font-medium">
                Auto-fill actual dates on status change
              </span>
              <input
                checked={settings?.autoFillActualDatesOnStatusChange ?? true}
                className="h-4 w-4 accent-primary"
                disabled={isLoading || isUpdatingAutomation || !settings}
                onChange={(event) =>
                  handleAutomationChange(event.target.checked)
                }
                type="checkbox"
              />
            </label>
          </SettingsSection>
        </div>
      </section>
    </div>
  ) : null;

  return (
    <>
      <Button
        aria-label="Open settings"
        className="text-muted-foreground hover:text-foreground"
        onClick={() => setIsOpen(true)}
        size="sm"
        type="button"
        variant="ghost"
      >
        <Cog6ToothIcon className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">Settings</span>
      </Button>

      {isMounted && settingsDialog
        ? createPortal(settingsDialog, document.body)
        : null}
    </>
  );
}

function SettingsSection({
  children,
  description,
  isLoading,
  title,
}: {
  children: ReactNode;
  description: string;
  isLoading: boolean;
  title: string;
}) {
  return (
    <section className={cn("rounded-lg border bg-card", isLoading && "opacity-70")}>
      <div className="border-b px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-sm font-semibold">{title}</h3>
          <span className="text-xs text-muted-foreground">{description}</span>
        </div>
      </div>
      <div className="space-y-3 p-4">{children}</div>
    </section>
  );
}

function ThemeButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "flex h-11 items-center justify-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors hover:border-primary/50 hover:bg-primary/5",
        active && "border-primary bg-primary/10 text-primary",
      )}
      onClick={onClick}
      type="button"
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {label}
    </button>
  );
}

function getStoredTheme() {
  const storedTheme = window.localStorage.getItem(themeStorageKey);
  return storedTheme === "light" || storedTheme === "dark" ? storedTheme : null;
}

function getSystemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
}
