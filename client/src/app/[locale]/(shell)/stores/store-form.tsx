"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import type { Locale } from "@/i18n/config";
import {
  submitStoreFormAction,
  type StoreFormField,
  type StoreFormState,
} from "@/app/actions/stores";
import type { StoresFormMessages } from "@/messages/stores-form";

function SubmitButton({
  label,
}: {
  label: string;
}) {
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

type FormValues = {
  name: string;
  url: string;
  port: string;
  consumerKey: string;
  consumerSecret: string;
};

function emptyForm(): FormValues {
  return { name: "", url: "", port: "", consumerKey: "", consumerSecret: "" };
}

function fromInitial(initial: FormValues | undefined): FormValues {
  if (!initial) return emptyForm();
  return { ...initial };
}

type FieldRowProps = {
  id: string;
  name: string;
  label: string;
  placeholder: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  blockAutofill?: boolean;
  error?: string;
};

function FieldRow({
  id,
  name,
  label,
  placeholder,
  type = "text",
  value,
  onChange,
  autoComplete,
  blockAutofill,
  error,
}: FieldRowProps) {
  const ac =
    blockAutofill === true
      ? type === "password"
        ? "new-password"
        : "off"
      : autoComplete;

  const invalid = Boolean(error);

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
        name={name}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={ac}
        aria-invalid={invalid}
        aria-describedby={invalid ? `${id}-err` : undefined}
        {...(blockAutofill
          ? {
              "data-lpignore": "true",
              "data-bwignore": "true",
              "data-1p-ignore": "",
            }
          : {})}
        className="w-full min-w-0 border-0 bg-transparent text-base text-foreground outline-none placeholder:text-muted"
      />
      {error ? (
        <p id={`${id}-err`} className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

type Props = {
  locale: Locale;
  mode: "create" | "edit";
  messages: StoresFormMessages;
  storeId?: string;
  envRowId?: number | null;
  initial?: {
    name: string;
    url: string;
    port: string;
    consumerKey: string;
    consumerSecret: string;
  };
};

export function StoreForm({
  locale,
  mode,
  messages,
  storeId,
  envRowId = null,
  initial,
}: Props) {
  const dir = locale === "he" ? "rtl" : "ltr";

  const [values, setValues] = useState<FormValues>(() => fromInitial(initial));

  const editKey = mode === "edit" ? (storeId ?? "") : "create";
  useEffect(() => {
    setValues(fromInitial(initial));
  }, [
    editKey,
    initial?.name,
    initial?.url,
    initial?.port,
    initial?.consumerKey,
    initial?.consumerSecret,
  ]);

  const [state, formAction] = useActionState(
    submitStoreFormAction.bind(
      null,
      locale,
      mode,
      mode === "edit" ? (storeId ?? null) : null,
      envRowId ?? null,
    ),
    null as StoreFormState,
  );

  const serverFieldErrors = state?.fieldErrors;
  const [dismissed, setDismissed] = useState<
    Partial<Record<StoreFormField, boolean>>
  >({});

  useEffect(() => {
    setDismissed({});
  }, [state]);

  function fieldError(f: StoreFormField): string | undefined {
    if (dismissed[f]) return undefined;
    return serverFieldErrors?.[f];
  }

  function patchField(f: keyof FormValues, v: string) {
    setValues((p) => ({ ...p, [f]: v }));
    const map: Record<keyof FormValues, StoreFormField> = {
      name: "name",
      url: "url",
      port: "port",
      consumerKey: "consumerKey",
      consumerSecret: "consumerSecret",
    };
    const sf = map[f];
    if (sf) setDismissed((d) => ({ ...d, [sf]: true }));
  }

  const title = mode === "create" ? messages.addTitle : messages.editTitle;
  const subtitle =
    mode === "create" ? messages.addSubtitle : messages.editSubtitle;
  const submitLabel =
    mode === "create" ? messages.submitCreate : messages.submitEdit;

  const showBanner = Boolean(state?.message);

  return (
    <div className="mx-auto max-w-lg pb-12" dir={dir}>
      <Link
        href={`/${locale}/stores`}
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
        <FieldRow
          id="sf-name"
          name="name"
          label={messages.storeName}
          placeholder={messages.storeNamePlaceholder}
          value={values.name}
          onChange={(v) => patchField("name", v)}
          autoComplete="organization"
          error={fieldError("name")}
        />
        <FieldRow
          id="sf-url"
          name="url"
          label={messages.storeUrl}
          placeholder={messages.storeUrlPlaceholder}
          value={values.url}
          onChange={(v) => patchField("url", v)}
          autoComplete="url"
          error={fieldError("url")}
        />
        <FieldRow
          id="sf-port"
          name="port"
          type="number"
          label={messages.storePort}
          placeholder={messages.storePortPlaceholder}
          value={values.port}
          onChange={(v) => patchField("port", v)}
          autoComplete="off"
          error={fieldError("port")}
        />
        <FieldRow
          id="sf-key"
          name="consumerKey"
          label={messages.apiKey}
          placeholder={messages.apiKeyPlaceholder}
          value={values.consumerKey}
          onChange={(v) => patchField("consumerKey", v)}
          autoComplete="off"
          error={fieldError("consumerKey")}
        />
        <FieldRow
          id="sf-secret"
          name="consumerSecret"
          type="password"
          label={messages.apiSecret}
          placeholder={messages.apiSecretPlaceholder}
          value={values.consumerSecret}
          onChange={(v) => patchField("consumerSecret", v)}
          autoComplete="off"
          error={fieldError("consumerSecret")}
        />

        {showBanner ? (
          <p
            className="rounded-xl border border-destructive/35 bg-destructive-muted px-4 py-3 text-sm text-destructive"
            role="alert"
          >
            {state?.message}
          </p>
        ) : null}

        <div className="flex justify-center pt-2">
          <SubmitButton label={submitLabel} />
        </div>
      </form>
    </div>
  );
}
