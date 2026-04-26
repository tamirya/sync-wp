"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import type { Locale } from "@/i18n/config";
import {
  updateProductAction,
  type ProductFormField,
  type ProductFormState,
} from "@/app/actions/product";
import type { ProductFormMessages } from "@/messages/product-form";
import { HtmlEditor } from "@/components/html-editor";

/* ------------------------------------------------------------------ */
/*  Submit button                                                       */
/* ------------------------------------------------------------------ */
function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-2xl bg-accent px-6 py-3.5 text-base font-bold text-accent-foreground shadow-md transition hover:brightness-105 disabled:opacity-60"
    >
      {pending ? "…" : label}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Section card                                                        */
/* ------------------------------------------------------------------ */
function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card shadow-sm">
      <div className="border-b border-border/60 px-5 py-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted">
          {title}
        </h2>
      </div>
      <div className="flex flex-col gap-3 p-5">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Field row                                                           */
/* ------------------------------------------------------------------ */
type FieldRowProps = {
  id: string;
  name: string;
  label: string;
  placeholder: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  hint?: string;
};

function FieldRow({
  id,
  name,
  label,
  placeholder,
  type = "text",
  value,
  onChange,
  error,
  hint,
}: FieldRowProps) {
  const invalid = Boolean(error);
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-semibold text-foreground">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid}
        aria-describedby={
          invalid ? `${id}-err` : hint ? `${id}-hint` : undefined
        }
        className={`w-full rounded-xl border bg-muted-bg/60 px-3.5 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted focus:ring-2 ${
          invalid
            ? "border-destructive focus:ring-destructive/30"
            : "border-border/70 focus:border-ring focus:ring-ring/20"
        }`}
      />
      {error && (
        <p id={`${id}-err`} className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Select row                                                          */
/* ------------------------------------------------------------------ */
function SelectRow({
  id,
  name,
  label,
  value,
  onChange,
  children,
}: {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-semibold text-foreground">
        {label}
      </label>
      <select
        id={id}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-border/70 bg-muted-bg/60 px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
      >
        {children}
      </select>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Image field — drag & drop / file-pick / URL / WP credentials       */
/* ------------------------------------------------------------------ */
type UploadStatus = "idle" | "uploading" | "success" | "error";

const CREDS_KEY = (storeId: string) => `wp_creds_${storeId}`;

function loadCreds(storeId: string): { user: string; pass: string } {
  try {
    const raw = localStorage.getItem(CREDS_KEY(storeId));
    if (raw) return JSON.parse(raw) as { user: string; pass: string };
  } catch {
    /* ignore */
  }
  return { user: "", pass: "" };
}

function saveCreds(storeId: string, user: string, pass: string) {
  try {
    localStorage.setItem(CREDS_KEY(storeId), JSON.stringify({ user, pass }));
  } catch {
    /* ignore */
  }
}

function ImageField({
  value,
  onChange,
  storeId,
  label,
  placeholder,
  hint,
}: {
  value: string;
  onChange: (v: string) => void;
  storeId: string;
  label: string;
  placeholder: string;
  hint: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [uploadError, setUploadError] = useState("");
  const [previewSrc, setPreviewSrc] = useState(value);

  /* WP credentials (loaded from localStorage lazily) */
  const [wpUser, setWpUser] = useState("");
  const [wpPass, setWpPass] = useState("");
  const [showCreds, setShowCreds] = useState(false);
  const credsLoaded = useRef(false);

  useEffect(() => {
    if (credsLoaded.current) return;
    credsLoaded.current = true;
    const saved = loadCreds(storeId);
    setWpUser(saved.user);
    setWpPass(saved.pass);
  }, [storeId]);

  /* keep local preview in sync with external value changes */
  useEffect(() => {
    setPreviewSrc(value);
  }, [value]);

  async function uploadFile(file: File) {
    const localUrl = URL.createObjectURL(file);
    setPreviewSrc(localUrl);
    setUploadStatus("uploading");
    setUploadError("");

    const fd = new FormData();
    fd.append("file", file);

    const headers: Record<string, string> = {};
    if (wpUser && wpPass) {
      headers["x-wp-user"] = wpUser;
      headers["x-wp-pass"] = wpPass;
    }

    try {
      const res = await fetch(`/api/stores/${storeId}/upload-image`, {
        method: "POST",
        headers,
        body: fd,
      });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) {
        if (res.status === 401 || res.status === 403) {
          setShowCreds(true);
        }
        throw new Error(json.error ?? "Upload failed");
      }
      setUploadStatus("success");
      setPreviewSrc(json.url);
      onChange(json.url);
    } catch (err) {
      setUploadStatus("error");
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      URL.revokeObjectURL(localUrl);
    }
  }

  function onFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = "";
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) uploadFile(file);
  }

  const hasPreview = previewSrc.trim().length > 0;

  return (
    <div className="flex flex-col gap-3">
      {/* Drop zone / preview */}
      <div
        role="button"
        tabIndex={0}
        aria-label="העלאת תמונה"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`group relative flex aspect-square w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed transition-colors ${
          dragging
            ? "border-primary bg-primary/5"
            : "border-border/60 bg-muted-bg/60 hover:border-primary/50 hover:bg-primary/[0.03]"
        }`}
      >
        {hasPreview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewSrc}
            alt=""
            className="h-full w-full object-contain p-2"
          />
        )}

        <div
          className={`absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/80 transition-opacity ${
            hasPreview ? "opacity-0 group-hover:opacity-100" : "opacity-100"
          }`}
        >
          {uploadStatus === "uploading" ? (
            <svg
              className="h-8 w-8 animate-spin text-primary"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="3"
                strokeDasharray="40 20"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="h-10 w-10 text-muted/60"
              aria-hidden
            >
              <path
                d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <polyline
                points="17 8 12 3 7 8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round" />
            </svg>
          )}
          <p className="px-4 text-center text-xs font-medium text-muted">
            {uploadStatus === "uploading"
              ? "מעלה תמונה…"
              : hasPreview
                ? "לחץ או גרור להחלפה"
                : "לחץ או גרור תמונה לכאן"}
          </p>
        </div>

        {uploadStatus === "success" && (
          <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-white shadow">
            <svg
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-3.5 w-3.5"
            >
              <polyline
                points="2 6 5 9 10 3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={onFileInput}
        />
      </div>

      {/* Upload error */}
      {uploadStatus === "error" && (
        <p className="rounded-lg border border-destructive/30 bg-destructive-muted px-3 py-2 text-xs text-destructive">
          {uploadError}
        </p>
      )}

      {/* WordPress credentials */}
      <div className="rounded-xl border border-border/60 bg-muted-bg/40">
        <button
          type="button"
          onClick={() => setShowCreds((v) => !v)}
          className="flex w-full items-center justify-between px-3.5 py-2.5 text-xs font-semibold text-muted hover:text-primary transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <svg
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              className="h-3.5 w-3.5"
              aria-hidden
            >
              <rect x="2" y="7" width="12" height="8" rx="1.5" />
              <path d="M5 7V5a3 3 0 0 1 6 0v2" strokeLinecap="round" />
            </svg>
            פרטי כניסה לוורדפרס (להעלאת תמונות)
          </span>
          <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`h-3.5 w-3.5 transition-transform ${showCreds ? "rotate-180" : ""}`}
          >
            <path
              d="M4 6l4 4 4-4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {showCreds && (
          <div className="flex flex-col gap-2 border-t border-border/50 px-3.5 pb-3.5 pt-3">
            <p className="text-[11px] text-muted leading-relaxed">
              נדרשים לצורך העלאת מדיה דרך WordPress REST API. צור{" "}
              <strong>Application Password</strong> בלוח הניהול: ניהול → משתמשים
              → הפרופיל שלך → סיסמאות יישום.
            </p>
            <input
              type="text"
              placeholder="שם משתמש WP"
              value={wpUser}
              autoComplete="off"
              onChange={(e) => {
                setWpUser(e.target.value);
                saveCreds(storeId, e.target.value, wpPass);
              }}
              className="w-full rounded-lg border border-border/70 bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
            />
            <input
              type="password"
              placeholder="Application Password"
              value={wpPass}
              autoComplete="new-password"
              onChange={(e) => {
                setWpPass(e.target.value);
                saveCreds(storeId, wpUser, e.target.value);
              }}
              className="w-full rounded-lg border border-border/70 bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
            />
            {wpUser && wpPass && (
              <p className="flex items-center gap-1 text-[11px] text-green-600">
                <svg
                  viewBox="0 0 12 12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-3 w-3"
                >
                  <polyline
                    points="2 6 5 9 10 3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                נשמר — ישמש בהעלאות הבאות
              </p>
            )}
          </div>
        )}
      </div>

      {/* URL input (always visible as fallback) */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-semibold text-foreground">{label}</label>
        <input
          name="image_url"
          type="url"
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setPreviewSrc(e.target.value);
            setUploadStatus("idle");
          }}
          className="w-full rounded-xl border border-border/70 bg-muted-bg/60 px-3.5 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted focus:border-ring focus:ring-2 focus:ring-ring/20"
        />
        <p className="text-xs text-muted">{hint}</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Initial values type                                                 */
/* ------------------------------------------------------------------ */
export type ProductFormInitial = {
  name: string;
  sku: string;
  regular_price: string;
  sale_price: string;
  description: string;
  short_description: string;
  status: string;
  manage_stock: boolean;
  stock_quantity: string;
  image_url: string;
};

/* ------------------------------------------------------------------ */
/*  Form component                                                      */
/* ------------------------------------------------------------------ */
type Props = {
  locale: Locale;
  storeId: string;
  wooProductId: string;
  messages: ProductFormMessages;
  initial: ProductFormInitial;
};

export function ProductEditForm({
  locale,
  storeId,
  wooProductId,
  messages,
  initial,
}: Props) {
  const dir = locale === "he" ? "rtl" : "ltr";

  const [values, setValues] = useState<ProductFormInitial>({ ...initial });
  const [dismissed, setDismissed] = useState<
    Partial<Record<ProductFormField, boolean>>
  >({});

  useEffect(() => {
    setValues({ ...initial });
  }, [
    initial.name,
    initial.sku,
    initial.regular_price,
    initial.sale_price,
    initial.description,
    initial.short_description,
    initial.status,
    initial.manage_stock,
    initial.stock_quantity,
    initial.image_url,
  ]);

  const [state, formAction] = useActionState(
    updateProductAction.bind(null, locale, storeId, wooProductId),
    null as ProductFormState,
  );

  useEffect(() => {
    setDismissed({});
  }, [state]);

  function fieldError(f: ProductFormField): string | undefined {
    if (dismissed[f]) return undefined;
    return state?.fieldErrors?.[f];
  }

  function patch<K extends keyof ProductFormInitial>(
    key: K,
    value: ProductFormInitial[K],
  ) {
    setValues((p) => ({ ...p, [key]: value }));
    const fieldMap: Partial<
      Record<keyof ProductFormInitial, ProductFormField>
    > = {
      name: "name",
      sku: "sku",
      regular_price: "regular_price",
      sale_price: "sale_price",
      status: "status",
      stock_quantity: "stock_quantity",
    };
    const sf = fieldMap[key];
    if (sf) setDismissed((d) => ({ ...d, [sf]: true }));
  }

  const showBanner = Boolean(state?.message);

  return (
    <div className="pb-12" dir={dir}>
      {/* ── Header ── */}
      <div className="mb-8 flex flex-col gap-1">
        <Link
          href={`/${locale}/stores/${storeId}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-primary transition-colors"
        >
          <svg
            viewBox="0 0 24 24"
            className={`h-3.5 w-3.5 shrink-0 ${locale === "he" ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            aria-hidden
          >
            <path
              d="M19 12H5M12 19l-7-7 7-7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {messages.back}
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {values.name || messages.editTitle}
        </h1>
        <p className="text-sm text-muted">{messages.editSubtitle}</p>
      </div>

      <form action={formAction} autoComplete="off">
        {/* ── Two-column layout ── */}
        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          {/* ── Main column ── */}
          <div className="flex flex-col gap-5">
            {/* General */}
            <SectionCard title={messages.sectionGeneral}>
              <FieldRow
                id="pf-name"
                name="name"
                label={messages.fieldName}
                placeholder={messages.fieldNamePlaceholder}
                value={values.name}
                onChange={(v) => patch("name", v)}
                error={fieldError("name")}
              />
              <FieldRow
                id="pf-sku"
                name="sku"
                label={messages.fieldSku}
                placeholder={messages.fieldSkuPlaceholder}
                value={values.sku}
                onChange={(v) => patch("sku", v)}
              />
            </SectionCard>

            {/* Descriptions */}
            <SectionCard title={messages.sectionDescription}>
              <HtmlEditor
                name="short_description"
                label={messages.fieldShortDescription}
                initialValue={values.short_description}
                minRows={3}
              />
              <HtmlEditor
                name="description"
                label={messages.fieldDescription}
                initialValue={values.description}
                minRows={5}
              />
            </SectionCard>
          </div>

          {/* ── Sidebar ── */}
          <div className="flex flex-col gap-5">
            {/* Image */}
            <SectionCard title={messages.sectionImage}>
              <ImageField
                value={values.image_url}
                onChange={(v) => patch("image_url", v)}
                storeId={storeId}
                label={messages.fieldImageUrl}
                placeholder={messages.fieldImageUrlPlaceholder}
                hint={messages.fieldImageUrlHint}
              />
            </SectionCard>

            {/* Pricing */}
            <SectionCard title={messages.sectionPricing}>
              <FieldRow
                id="pf-regular-price"
                name="regular_price"
                label={messages.fieldRegularPrice}
                placeholder={messages.fieldRegularPricePlaceholder}
                value={values.regular_price}
                onChange={(v) => patch("regular_price", v)}
              />
              <FieldRow
                id="pf-sale-price"
                name="sale_price"
                label={messages.fieldSalePrice}
                placeholder={messages.fieldSalePricePlaceholder}
                value={values.sale_price}
                onChange={(v) => patch("sale_price", v)}
              />
            </SectionCard>

            {/* Publish & inventory */}
            <SectionCard title={messages.sectionPublish}>
              <SelectRow
                id="pf-status"
                name="status"
                label={messages.fieldStatus}
                value={values.status}
                onChange={(v) => patch("status", v)}
              >
                <option value="publish">{messages.fieldStatusPublish}</option>
                <option value="draft">{messages.fieldStatusDraft}</option>
                <option value="private">{messages.fieldStatusPrivate}</option>
              </SelectRow>

              <label className="flex cursor-pointer items-center gap-2.5">
                <input
                  type="checkbox"
                  name="manage_stock"
                  checked={values.manage_stock}
                  onChange={(e) => patch("manage_stock", e.target.checked)}
                  className="h-4 w-4 accent-primary"
                />
                <span className="text-sm font-semibold text-foreground">
                  {messages.fieldManageStock}
                </span>
              </label>

              {values.manage_stock && (
                <FieldRow
                  id="pf-stock-qty"
                  name="stock_quantity"
                  type="number"
                  label={messages.fieldStockQuantity}
                  placeholder={messages.fieldStockQuantityPlaceholder}
                  value={values.stock_quantity}
                  onChange={(v) => patch("stock_quantity", v)}
                />
              )}
            </SectionCard>

            {/* Error banner */}
            {showBanner && (
              <p
                className="rounded-xl border border-destructive/35 bg-destructive-muted px-4 py-3 text-sm text-destructive"
                role="alert"
              >
                {state?.message}
              </p>
            )}

            {/* Save */}
            <SubmitButton label={messages.submitEdit} />
          </div>
        </div>
      </form>
    </div>
  );
}
