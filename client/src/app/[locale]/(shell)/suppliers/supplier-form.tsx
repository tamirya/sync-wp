"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import type { Locale } from "@/i18n/config";
import {
  submitSupplierFormAction,
  type SupplierFormField,
  type SupplierFormState,
} from "@/app/actions/suppliers";
import type { SuppliersFormMessages } from "@/messages/suppliers-form";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 w-full max-w-md rounded-2xl bg-accent px-6 py-3.5 text-base font-bold text-accent-foreground shadow-md transition hover:brightness-105 disabled:opacity-60"
    >
      {pending ? "…" : label}
    </button>
  );
}

type Props = {
  locale: Locale;
  mode: "create" | "edit";
  messages: SuppliersFormMessages;
  supplierId?: string;
  initial?: { name: string; url: string };
};

export function SupplierForm({
  locale,
  mode,
  messages,
  supplierId,
  initial,
}: Props) {
  const dir = locale === "he" ? "rtl" : "ltr";

  const [name, setName] = useState(initial?.name ?? "");
  const [url, setUrl] = useState(initial?.url ?? "");

  const editKey = mode === "edit" ? (supplierId ?? "") : "create";
  useEffect(() => {
    setName(initial?.name ?? "");
    setUrl(initial?.url ?? "");
  }, [editKey, initial?.name, initial?.url]);

  const [state, formAction] = useActionState(
    submitSupplierFormAction.bind(
      null,
      locale,
      mode,
      mode === "edit" ? (supplierId ?? null) : null,
    ),
    null as SupplierFormState,
  );

  const serverFieldErrors = state?.fieldErrors;
  const [dismissed, setDismissed] = useState<
    Partial<Record<SupplierFormField, boolean>>
  >({});

  useEffect(() => {
    setDismissed({});
  }, [state]);

  function fieldError(f: SupplierFormField): string | undefined {
    if (dismissed[f]) {
      return undefined;
    }
    return serverFieldErrors?.[f];
  }

  const title = mode === "create" ? messages.addTitle : messages.editTitle;
  const subtitle =
    mode === "create" ? messages.addSubtitle : messages.editSubtitle;
  const submitLabel =
    mode === "create" ? messages.submitCreate : messages.submitEdit;

  function row(
    id: string,
    field: SupplierFormField,
    label: string,
    placeholder: string,
    value: string,
    set: (v: string) => void,
    inputType: "text" | "url" = "text",
  ) {
    const err = fieldError(field);
    const invalid = Boolean(err);
    return (
      <div
        className={`flex min-h-13 flex-col justify-center gap-1 rounded-2xl bg-muted-bg/90 px-4 py-3 ring-1 focus-within:ring-2 ${
          invalid
            ? "ring-destructive focus-within:ring-destructive"
            : "ring-border/80 focus-within:ring-ring"
        }`}
      >
        <label htmlFor={id} className="text-sm font-bold text-primary">
          {label}
        </label>
        <input
          id={id}
          name={field}
          type={inputType}
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            set(e.target.value);
            setDismissed((d) => ({ ...d, [field]: true }));
          }}
          autoComplete="off"
          aria-invalid={invalid}
          aria-describedby={invalid ? `${id}-err` : undefined}
          className="w-full min-w-0 border-0 bg-transparent text-base text-foreground outline-none placeholder:text-muted"
        />
        {err ? (
          <p id={`${id}-err`} className="text-xs font-medium text-destructive">
            {err}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg pb-12" dir={dir}>
      <Link
        href={`/${locale}/suppliers`}
        className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
      >
        <svg
          viewBox="0 0 24 24"
          className={`h-5 w-5 shrink-0 ${locale === "he" ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {messages.back}
      </Link>

      <h1 className="mt-6 text-center text-2xl font-bold tracking-tight text-foreground md:text-[1.65rem]">
        {title}
      </h1>
      <p className="mt-2 text-center text-sm text-muted">{subtitle}</p>

      <form
        action={formAction}
        autoComplete="off"
        className="mt-10 flex flex-col gap-4"
      >
        {row(
          "sf-sup-name",
          "name",
          messages.name,
          messages.namePlaceholder,
          name,
          setName,
        )}
        {row(
          "sf-sup-url",
          "url",
          messages.url,
          messages.urlPlaceholder,
          url,
          setUrl,
          "url",
        )}

        {state?.message ? (
          <p
            className="rounded-xl border border-destructive/35 bg-destructive-muted px-4 py-3 text-sm text-destructive"
            role="alert"
          >
            {state.message}
          </p>
        ) : null}

        <div className="flex justify-center pt-2">
          <SubmitButton label={submitLabel} />
        </div>
      </form>
    </div>
  );
}
