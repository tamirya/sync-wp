"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { Locale } from "@/i18n/config";
import { apiLogin } from "@/lib/api";
import { translateLoginApiError, type LoginMessages } from "@/messages/login";

function SyncLogo({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect width="40" height="40" rx="10" className="fill-primary" />
      <path
        d="M12 14h10M22 14l-2-2m2 2l-2 2M28 26H18m10 0l-2 2m2-2l-2-2"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden
    >
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <path d="M1 1l22 22" strokeLinecap="round" />
    </svg>
  );
}

function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path
        d="M5 12h14M13 6l6 6-6 6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DecorativeLines() {
  return (
    <div
      className="pointer-events-none absolute start-0 top-0 hidden h-full w-[min(28vw,200px)] overflow-hidden md:block"
      aria-hidden
    >
      <svg
        className="h-full w-full text-slate-800/15"
        preserveAspectRatio="none"
        viewBox="0 0 100 400"
      >
        <path
          d="M70 0 Q55 100 75 200 T65 400"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
        />
        <path
          d="M85 0 Q70 120 90 220 T80 400"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
        />
        <path
          d="M55 0 Q40 90 60 190 T50 400"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
        />
      </svg>
    </div>
  );
}

function LocaleSwitcher({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const other: Locale = locale === "he" ? "en" : "he";
  const rest = pathname.replace(/^\/(he|en)/, "") || "/";
  const href = `/${other}${rest === "/" ? "/login" : rest}`;

  const label = locale === "he" ? "English" : "עברית";

  return (
    <Link
      href={href}
      className="text-sm font-medium text-accent hover:underline underline-offset-4"
    >
      {label}
    </Link>
  );
}

type Props = {
  locale: Locale;
  messages: LoginMessages;
  /** Safe in-app path after login (from middleware ?next=). */
  redirectAfterLogin?: string | null;
};

export function LoginScreen({ locale, messages, redirectAfterLogin }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await apiLogin(email.trim(), password);
      const data = (await res.json().catch(() => ({}))) as {
        message?: string;
      };
      if (!res.ok) {
        setError(
          translateLoginApiError(data.message, locale, messages.errorGeneric),
        );
        return;
      }
      const dest = redirectAfterLogin ?? `/${locale}/stores`;
      window.location.assign(dest);
    } catch {
      setError(messages.errorGeneric);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="relative min-h-dvh overflow-hidden bg-gradient-to-br from-slate-200/80 via-slate-50 to-slate-100">
      <DecorativeLines />

      <div className="relative z-[1] flex min-h-dvh flex-col items-center px-4 py-10 sm:py-16">
        <header className="flex w-full max-w-md flex-col items-center gap-3 text-center mb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/login-logo.svg"
            alt={messages.brand}
            className="w-auto"
            draggable={false}
          />
          {/* <p className="max-w-sm text-sm text-muted">{messages.tagline}</p> */}
        </header>

        <div className="w-full max-w-[min(100%,28rem)] rounded-3xl border border-border/60 bg-card p-6 shadow-[0_4px_24px_rgba(15,23,42,0.06)] sm:p-8">
          <div className="flex justify-between gap-4">
            <div className="text-start">
              <h1 className="text-xl font-bold text-card-foreground sm:text-2xl">
                {messages.title}
              </h1>
              <p className="mt-1 mb-1 text-sm text-muted">
                {messages.subtitle}
              </p>
            </div>
            <div>
              <div className="mt-1">
                <LocaleSwitcher locale={locale} />
              </div>
            </div>
          </div>

          <form onSubmit={onSubmit} className="flex flex-col gap-5">
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-start text-sm font-semibold text-foreground"
              >
                {messages.emailLabel}
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute top-1/2 start-3 -translate-y-1/2 text-muted">
                  <UserIcon className="h-5 w-5" />
                </span>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="off"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={messages.emailPlaceholder}
                  className="w-full rounded-xl border-0 bg-muted-bg py-3 ps-11 pe-3 text-start text-sm text-foreground placeholder:text-muted/80 focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                <label
                  htmlFor="password"
                  className="text-start text-sm font-semibold text-foreground"
                >
                  {messages.passwordLabel}
                </label>
                <button
                  type="button"
                  className="text-sm font-medium text-accent hover:underline"
                  onClick={() => {
                    /* future: /forgot-password */
                  }}
                >
                  {messages.forgotPassword}
                </button>
              </div>
              <div className="relative">
                <span className="pointer-events-none absolute top-1/2 start-3 -translate-y-1/2 text-muted">
                  <LockIcon className="h-5 w-5" />
                </span>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={messages.passwordPlaceholder}
                  className="w-full rounded-xl border-0 bg-muted-bg py-3 ps-11 pe-11 text-start text-sm text-foreground placeholder:text-muted/80 focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  type="button"
                  className="absolute top-1/2 end-3 -translate-y-1/2 rounded-md text-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={
                    showPassword ? messages.hidePassword : messages.showPassword
                  }
                  aria-pressed={showPassword}
                >
                  {showPassword ? (
                    <EyeOffIcon className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {error ? (
              <p
                className="rounded-lg bg-red-50 px-3 py-2 text-start text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200"
                role="alert"
              >
                {error}
              </p>
            ) : null}

            <p className="text-center text-sm text-muted">
              {messages.termsPrefix}{" "}
              <a
                href="/agriments.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-accent hover:underline underline-offset-4"
              >
                {messages.termsLink}
              </a>
            </p>

            <button
              type="submit"
              disabled={pending}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-95 disabled:opacity-60"
            >
              <span>{messages.submit}</span>
              <ArrowIcon className="h-5 w-5 rtl:rotate-180" />
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted">
            {messages.supportPrefix}{" "}
            <a
              href="mailto:support@example.com"
              className="font-medium text-accent hover:underline"
            >
              {messages.supportLink}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
