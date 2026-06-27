"use client";

import {
  type ComponentType,
  type FormEvent,
  type ReactNode,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  ChevronDownIcon,
  Cog6ToothIcon,
  MoonIcon,
  PlusIcon,
  SunIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { GripVertical } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  mapPlanCategoryRow,
  type PlanCategoryRow,
} from "@/lib/goaltree/node-rows";
import { sortableStackModifiers } from "@/lib/dnd/sortable-stack-modifier";
import {
  mapUserSettingsRow,
  userSettingsSelectColumns,
  type UserSettingsRow,
} from "@/lib/goaltree/user-settings-rows";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isTheme, themeStorageKey, type Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import type { PlanCategory, UserSettings } from "@/types/domain";

const categorySelectColumns = "id,user_id,name,color,sort_order,created_at,updated_at";
const defaultCategoryColor = "#16a34a";

export function SettingsDialog() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [theme, setTheme] = useState<Theme | null>(null);
  const [userId, setUserId] = useState("");
  const [categories, setCategories] = useState<PlanCategory[]>([]);
  const [savedCategories, setSavedCategories] = useState<PlanCategory[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isPlanCategoriesOpen, setIsPlanCategoriesOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState(defaultCategoryColor);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [savingCategoryId, setSavingCategoryId] = useState("");
  const [deletingCategoryId, setDeletingCategoryId] = useState("");
  const [isReorderingCategories, setIsReorderingCategories] = useState(false);
  const [pendingDeleteCategoryId, setPendingDeleteCategoryId] = useState("");
  const [isUpdatingAutomation, setIsUpdatingAutomation] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const pendingDeleteButtonRef = useRef<HTMLButtonElement | null>(null);
  const categorySensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 2,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

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
      setIsPlanCategoriesOpen(false);
      setPendingDeleteCategoryId("");
      setStatusMessage("");
      setErrorMessage("");
      return;
    }

    void loadSettingsData();
  }, [isOpen]);

  useEffect(() => {
    if (!pendingDeleteCategoryId) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (pendingDeleteButtonRef.current?.contains(target)) {
        return;
      }

      setPendingDeleteCategoryId("");
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [pendingDeleteCategoryId]);

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
        .order("sort_order", { ascending: true })
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

    const nextCategories = (categoryRows ?? []).map(mapPlanCategoryRow);

    setCategories(nextCategories);
    setSavedCategories(nextCategories);

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
    setThemeCookie(nextTheme);
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
        sort_order: getNextCategorySortOrder(categories),
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
    setSavedCategories((currentCategories) => [
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
    setSavedCategories((currentCategories) =>
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
    setSavedCategories((currentCategories) =>
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

  async function handleCategoryDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || active.id === over.id || isCategoryMutationInProgress) {
      return;
    }

    const oldIndex = categories.findIndex((category) => category.id === active.id);
    const newIndex = categories.findIndex((category) => category.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    const previousCategories = categories;
    const previousSavedCategories = savedCategories;
    const nextCategories = normalizeCategorySortOrder(
      arrayMove(categories, oldIndex, newIndex),
    );
    const orderedIds = nextCategories.map((category) => category.id);
    const nextSavedCategories = normalizeCategorySortOrder(
      orderedIds
        .map((id) => savedCategories.find((category) => category.id === id))
        .filter((category): category is PlanCategory => Boolean(category)),
    );

    setCategories(nextCategories);
    setPendingDeleteCategoryId("");
    setIsReorderingCategories(true);
    setErrorMessage("");
    setStatusMessage("");

    const supabase = createSupabaseBrowserClient();
    const updates = nextCategories.map((category) =>
      supabase
        .from("plan_categories")
        .update({ sort_order: category.sortOrder })
        .eq("id", category.id)
        .eq("user_id", userId),
    );
    const results = await Promise.all(updates);
    const failedResult = results.find((result) => result.error);

    if (failedResult?.error) {
      setCategories(previousCategories);
      setSavedCategories(previousSavedCategories);
      setErrorMessage(failedResult.error.message);
      setIsReorderingCategories(false);
      return;
    }

    setSavedCategories(nextSavedCategories);
    setStatusMessage("Category order saved.");
    setIsReorderingCategories(false);
    router.refresh();
  }

  const isCategoryMutationInProgress = Boolean(
    isLoading ||
      isAddingCategory ||
      savingCategoryId ||
      deletingCategoryId ||
      isReorderingCategories,
  );
  const canAddCategory = Boolean(newCategoryName.trim());

  function hasCategoryChanges(category: PlanCategory) {
    const savedCategory = savedCategories.find(
      (currentCategory) => currentCategory.id === category.id,
    );

    if (!savedCategory) {
      return true;
    }

    return (
      category.name.trim() !== savedCategory.name ||
      (category.color ?? defaultCategoryColor) !==
        (savedCategory.color ?? defaultCategoryColor)
    );
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
            collapsible
            description={`${categories.length} categories`}
            isOpen={isPlanCategoriesOpen}
            isLoading={isLoading}
            onToggle={() =>
              setIsPlanCategoriesOpen((currentIsOpen) => !currentIsOpen)
            }
            title="Plan Categories"
          >
            <div className="h-[24rem] space-y-3 overflow-y-auto pr-1">
              <form
                className="rounded-md border bg-muted/25 p-3"
                onSubmit={handleAddCategory}
              >
                <div
                  className={cn(
                    "grid gap-2",
                    canAddCategory
                      ? "grid-cols-[2.5rem_minmax(0,1fr)_auto]"
                      : "grid-cols-[2.5rem_minmax(0,1fr)]",
                  )}
                >
                  <input
                    aria-label="New category color"
                    className="size-10 rounded-md border bg-background p-1"
                    disabled={isCategoryMutationInProgress}
                    onChange={(event) => setNewCategoryColor(event.target.value)}
                    type="color"
                    value={newCategoryColor}
                  />
                  <input
                    className="h-10 rounded-md border bg-background px-3 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary/60 focus:ring-1 focus:ring-primary/30"
                    disabled={isCategoryMutationInProgress}
                    onChange={(event) => setNewCategoryName(event.target.value)}
                    placeholder="Add new category"
                    value={newCategoryName}
                  />
                  {canAddCategory ? (
                    <Button disabled={isCategoryMutationInProgress} type="submit">
                      <PlusIcon className="h-4 w-4" aria-hidden="true" />
                      {isAddingCategory ? "Adding" : "Add"}
                    </Button>
                  ) : null}
                </div>
              </form>

              <div className="space-y-2">
                {categories.length > 0 ? (
                  <DndContext
                    id="settings-plan-categories"
                    sensors={categorySensors}
                    collisionDetection={closestCenter}
                    modifiers={sortableStackModifiers}
                    onDragEnd={handleCategoryDragEnd}
                  >
                    <SortableContext
                      items={categories.map((category) => category.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-2">
                        {categories.map((category) => (
                          <SortableCategoryRow
                            category={category}
                            defaultColor={defaultCategoryColor}
                            deleteButtonRef={
                              pendingDeleteCategoryId === category.id
                                ? pendingDeleteButtonRef
                                : null
                            }
                            hasChanges={hasCategoryChanges(category)}
                            isDeleting={deletingCategoryId === category.id}
                            isPendingDelete={pendingDeleteCategoryId === category.id}
                            isReorderDisabled={isCategoryMutationInProgress}
                            isSaving={savingCategoryId === category.id}
                            key={category.id}
                            onDelete={() => handleDeleteCategory(category)}
                            onSave={() => handleUpdateCategory(category)}
                            onUpdate={(values) =>
                              updateCategoryDraft(category.id, values)
                            }
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                ) : (
                  <p className="rounded-md border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
                    No categories yet
                  </p>
                )}
              </div>
            </div>
          </SettingsSection>

          <SettingsSection
            description="Workspace"
            isLoading={isLoading}
            title="Automation"
          >
            <label className="flex items-center justify-between gap-4 rounded-md border bg-background px-3 py-3">
              <span className="text-sm font-medium">
                Auto-fill actual start/end dates on status change
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
        className="text-muted-foreground hover:bg-blue-600 hover:text-white focus-visible:bg-blue-600 focus-visible:text-white"
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
  collapsible = false,
  description,
  isOpen = true,
  isLoading,
  onToggle,
  title,
}: {
  children: ReactNode;
  collapsible?: boolean;
  description: string;
  isOpen?: boolean;
  isLoading: boolean;
  onToggle?: () => void;
  title: string;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-lg border bg-card",
        isLoading && "opacity-70",
      )}
    >
      <div className="border-b px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-sm font-semibold">{title}</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{description}</span>
            {collapsible ? (
              <Button
                aria-expanded={isOpen}
                aria-label={`${isOpen ? "Collapse" : "Expand"} ${title}`}
                className="size-8 text-muted-foreground hover:text-foreground"
                onClick={onToggle}
                size="icon"
                type="button"
                variant="ghost"
              >
                <ChevronDownIcon
                  className={cn(
                    "h-4 w-4 transition-transform",
                    isOpen && "rotate-180",
                  )}
                  aria-hidden="true"
                />
              </Button>
            ) : null}
          </div>
        </div>
      </div>
      {isOpen ? <div className="space-y-3 p-4">{children}</div> : null}
    </section>
  );
}

function SortableCategoryRow({
  category,
  defaultColor,
  deleteButtonRef,
  hasChanges,
  isDeleting,
  isPendingDelete,
  isReorderDisabled,
  isSaving,
  onDelete,
  onSave,
  onUpdate,
}: {
  category: PlanCategory;
  defaultColor: string;
  deleteButtonRef: RefObject<HTMLButtonElement | null> | null;
  hasChanges: boolean;
  isDeleting: boolean;
  isPendingDelete: boolean;
  isReorderDisabled: boolean;
  isSaving: boolean;
  onDelete: () => void;
  onSave: () => void;
  onUpdate: (values: Partial<Pick<PlanCategory, "name" | "color">>) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: category.id,
      disabled: isReorderDisabled,
      transition: {
        duration: 120,
        easing: "cubic-bezier(0.2, 0, 0, 1)",
      },
    });

  const style = {
    position: "relative" as const,
    transform: transform ? `translate3d(0, ${Math.round(transform.y)}px, 0)` : undefined,
    transition: isDragging ? "none" : transition,
    zIndex: isDragging ? 50 : undefined,
    willChange: "transform",
  };
  const isRowDisabled = isSaving || isDeleting || isReorderDisabled;

  return (
    <div
      className={cn(
        "grid gap-2 rounded-md border bg-background p-3 shadow-sm transition-colors",
        hasChanges
          ? "grid-cols-[2rem_2.5rem_minmax(0,1fr)_auto_auto]"
          : "grid-cols-[2rem_2.5rem_minmax(0,1fr)_auto]",
        isDragging && "shadow-md ring-1 ring-primary/30",
      )}
      ref={setNodeRef}
      style={style}
    >
      <button
        aria-label={`Reorder ${category.name}`}
        className={cn(
          "flex h-10 w-8 touch-none items-center justify-center rounded text-muted-foreground transition hover:bg-muted hover:text-foreground",
          isReorderDisabled
            ? "cursor-default opacity-50 hover:bg-transparent hover:text-muted-foreground"
            : "cursor-grab active:cursor-grabbing",
        )}
        disabled={isReorderDisabled}
        type="button"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" aria-hidden="true" />
      </button>
      <input
        aria-label={`${category.name} color`}
        className="size-10 rounded-md border bg-background p-1"
        disabled={isRowDisabled}
        onChange={(event) =>
          onUpdate({
            color: event.target.value,
          })
        }
        type="color"
        value={category.color ?? defaultColor}
      />
      <input
        className="h-10 rounded-md border bg-background px-3 text-sm outline-none transition focus:border-primary/60 focus:ring-1 focus:ring-primary/30"
        disabled={isRowDisabled}
        onChange={(event) =>
          onUpdate({
            name: event.target.value,
          })
        }
        value={category.name}
      />
      {hasChanges ? (
        <Button
          disabled={isRowDisabled}
          onClick={onSave}
          type="button"
          variant="outline"
        >
          {isSaving ? "Saving" : "Save"}
        </Button>
      ) : null}
      <Button
        aria-label={
          isPendingDelete
            ? `Confirm delete ${category.name}`
            : `Delete ${category.name}`
        }
        className={cn(
          isPendingDelete
            ? "border-destructive bg-destructive px-3 text-destructive-foreground hover:bg-destructive/90 hover:text-destructive-foreground"
            : "size-10 border-destructive/35 px-0 text-destructive hover:bg-destructive/10 hover:text-destructive",
        )}
        disabled={isRowDisabled}
        onClick={onDelete}
        ref={deleteButtonRef}
        type="button"
        variant="outline"
      >
        <TrashIcon className="h-4 w-4" aria-hidden="true" />
        {isDeleting ? "Deleting" : isPendingDelete ? "Confirm" : null}
      </Button>
    </div>
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
  const cookieTheme = getThemeCookie();

  if (cookieTheme) {
    window.localStorage.setItem(themeStorageKey, cookieTheme);
    return cookieTheme;
  }

  const storedTheme = window.localStorage.getItem(themeStorageKey);

  if (isTheme(storedTheme)) {
    setThemeCookie(storedTheme);
    return storedTheme;
  }

  return null;
}

function getSystemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("light", theme === "light");
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
}

function getThemeCookie() {
  const cookie = document.cookie
    .split("; ")
    .find((currentCookie) => currentCookie.startsWith(`${themeStorageKey}=`));

  if (!cookie) {
    return null;
  }

  const [, value] = cookie.split("=");
  const theme = decodeURIComponent(value ?? "");

  return isTheme(theme) ? theme : null;
}

function setThemeCookie(theme: Theme) {
  document.cookie = `${themeStorageKey}=${encodeURIComponent(
    theme,
  )}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

function normalizeCategorySortOrder(categories: PlanCategory[]) {
  return categories.map((category, index) => ({
    ...category,
    sortOrder: index + 1,
  }));
}

function getNextCategorySortOrder(categories: PlanCategory[]) {
  return Math.max(0, ...categories.map((category) => category.sortOrder)) + 1;
}
