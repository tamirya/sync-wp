"use client";

import {
  createContext,
  useContext,
  useRef,
  useEffect,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import {
  createStoreCategoryAction,
  updateStoreCategoryAction,
  deleteStoreCategoryAction,
} from "@/app/actions/store-categories";
import type { getAppMessages } from "@/messages/app";

export type CategoryItem = {
  id: number;
  name: string;
  slug: string;
  parent: number;
  count?: number;
};

/* ------------------------------------------------------------------ */
/*  Context                                                             */
/* ------------------------------------------------------------------ */

type ManageCtx = {
  manageMode: boolean;
  onEdit: (cat: CategoryItem) => void;
  onDelete: (cat: CategoryItem) => void;
};

const ManageContext = createContext<ManageCtx>({
  manageMode: false,
  onEdit: () => {},
  onDelete: () => {},
});

/* ------------------------------------------------------------------ */
/*  Per-card wrapper — exported for use in page.tsx                     */
/* ------------------------------------------------------------------ */

export function CategoryCardWrapper({
  category,
  children,
}: {
  category: CategoryItem;
  children: React.ReactNode;
}) {
  const { manageMode, onEdit, onDelete } = useContext(ManageContext);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className="relative">
      {/* Dim overlay when in manage mode — blocks link navigation */}
      {manageMode && (
        <div className="absolute inset-0 z-10 rounded-2xl bg-black/5 transition" />
      )}

      {children}

      {manageMode && (
        <div ref={ref} className="absolute left-2 top-2 z-20">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setOpen((o) => !o);
            }}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm hover:bg-black/55 transition"
            aria-label="פעולות"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
              <circle cx="12" cy="5" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="12" cy="19" r="1.5" />
            </svg>
          </button>

          {open && (
            <div className="absolute left-0 top-9 z-30 min-w-[130px] overflow-hidden rounded-xl border border-border/60 bg-card shadow-xl">
              <button
                onClick={() => {
                  setOpen(false);
                  onEdit(category);
                }}
                className="flex w-full items-center gap-2 px-3.5 py-2.5 text-sm font-medium text-foreground hover:bg-muted-bg transition"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-4 w-4 shrink-0"
                  aria-hidden
                >
                  <path
                    d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                עריכה
              </button>
              <button
                onClick={() => {
                  setOpen(false);
                  onDelete(category);
                }}
                className="flex w-full items-center gap-2 px-3.5 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/5 transition"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-4 w-4 shrink-0"
                  aria-hidden
                >
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6M14 11v6" />
                  <path
                    d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                מחיקה
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Category Form Modal                                                 */
/* ------------------------------------------------------------------ */

function CategoryFormModal({
  messages,
  categories,
  initial,
  onClose,
  onSave,
}: {
  messages: ReturnType<typeof getAppMessages>;
  categories: CategoryItem[];
  initial?: CategoryItem | null;
  onClose: () => void;
  onSave: (data: { name: string; parent: number }) => Promise<void>;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [parent, setParent] = useState<number>(initial?.parent ?? 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await onSave({ name: name.trim(), parent });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
      setSaving(false);
    }
  }

  const selectableCategories = categories.filter(
    (c) => c.parent === 0 && c.id !== initial?.id,
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-md rounded-2xl border border-border/60 bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">
            {initial
              ? messages.storeCategoryFormTitleEdit
              : messages.storeCategoryFormTitleCreate}
          </h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-muted-bg hover:text-foreground transition"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-4 w-4"
              aria-hidden
            >
              <path
                d="M18 6L6 18M6 6l12 12"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-xl bg-destructive/5 px-3 py-2.5 text-sm text-destructive border border-destructive/20">
            <span>
              {messages.storeCategorySaveError} {error}
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-foreground">
              {messages.storeCategoryFormNameLabel}
            </label>
            <input
              ref={nameRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-foreground">
              {messages.storeCategoryFormParentLabel}
            </label>
            <select
              value={parent}
              onChange={(e) => setParent(Number(e.target.value))}
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
            >
              <option value={0}>{messages.storeCategoryFormParentRoot}</option>
              {selectableCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted-bg disabled:opacity-50 transition"
            >
              {messages.storeCategoryFormCancel}
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50 transition"
            >
              {saving
                ? messages.storeCategoryFormSaving
                : messages.storeCategoryFormSave}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Delete Confirm Dialog                                               */
/* ------------------------------------------------------------------ */

function DeleteConfirmDialog({
  messages,
  categoryName,
  onClose,
  onConfirm,
}: {
  messages: ReturnType<typeof getAppMessages>;
  categoryName: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setDeleting(true);
    setError(null);
    try {
      await onConfirm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
      setDeleting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-sm rounded-2xl border border-border/60 bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-5 w-5"
              aria-hidden
            >
              <path
                d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">
              {messages.storeCategoryDeleteTitle}
            </h2>
            <p className="mt-1 text-sm font-semibold text-foreground/80">
              "{categoryName}"
            </p>
            <p className="mt-1.5 text-sm text-muted">
              {messages.storeCategoryDeleteBody}
            </p>
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {messages.storeCategoryDeleteError} {error}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={deleting}
            className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted-bg disabled:opacity-50 transition"
          >
            {messages.confirmNo}
          </button>
          <button
            onClick={handleConfirm}
            disabled={deleting}
            className="rounded-xl bg-destructive px-4 py-2 text-sm font-semibold text-white hover:bg-destructive/90 disabled:opacity-50 transition"
          >
            {deleting
              ? messages.storeCategoryDeleteConfirming
              : messages.storeCategoryDeleteConfirm}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Provider / toolbar — exported as default                           */
/* ------------------------------------------------------------------ */

export default function CategoryManageClient({
  locale,
  storeId,
  categories,
  messages,
  children,
}: {
  locale: string;
  storeId: string;
  categories: CategoryItem[];
  messages: ReturnType<typeof getAppMessages>;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [manageMode, setManageMode] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<CategoryItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CategoryItem | null>(null);

  function openCreate() {
    setEditTarget(null);
    setFormOpen(true);
  }
  function openEdit(cat: CategoryItem) {
    setEditTarget(cat);
    setFormOpen(true);
  }
  function closeForm() {
    setFormOpen(false);
    setEditTarget(null);
  }
  function closeDelete() {
    setDeleteTarget(null);
  }

  async function handleSave(data: { name: string; parent: number }) {
    const result = editTarget
      ? await updateStoreCategoryAction(locale, storeId, editTarget.id, data)
      : await createStoreCategoryAction(locale, storeId, data);
    if (!result.ok) throw new Error(result.message);
    closeForm();
    startTransition(() => router.refresh());
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const result = await deleteStoreCategoryAction(
      locale,
      storeId,
      deleteTarget.id,
    );
    if (!result.ok) throw new Error(result.message);
    closeDelete();
    startTransition(() => router.refresh());
  }

  return (
    <ManageContext.Provider
      value={{ manageMode, onEdit: openEdit, onDelete: setDeleteTarget }}
    >
      {/* Toolbar */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setManageMode((m) => !m)}
          className={`rounded-xl border px-4 py-1.5 text-sm font-semibold transition ${
            manageMode
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-foreground hover:bg-muted-bg"
          }`}
        >
          {manageMode
            ? messages.storeCategoryManageDone
            : messages.storeCategoryManageToggle}
        </button>

        {manageMode && (
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-1.5 text-sm font-semibold text-white hover:bg-primary/90 transition"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="h-4 w-4"
              aria-hidden
            >
              <path
                d="M12 5v14M5 12h14"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {messages.storeCategoryAdd}
          </button>
        )}
      </div>

      {/* Grid */}
      {children}

      {/* Modals */}
      {formOpen && (
        <CategoryFormModal
          messages={messages}
          categories={categories}
          initial={editTarget}
          onClose={closeForm}
          onSave={handleSave}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmDialog
          messages={messages}
          categoryName={deleteTarget.name}
          onClose={closeDelete}
          onConfirm={handleDelete}
        />
      )}
    </ManageContext.Provider>
  );
}
