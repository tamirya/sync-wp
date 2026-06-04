"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import type { Locale } from "@/i18n/config";
import { parseSupplierNavPath } from "@/lib/supplier-nav-utils";
import type { AppMessages } from "@/messages/app";
import { SupplierCategorySidebarPanel } from "@/components/supplier-category-sidebar-panel";

function NavIcon({
  active,
  children,
}: {
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors [&>svg]:h-5 [&>svg]:w-5 ${
        active
          ? "bg-primary/15 text-primary"
          : "bg-shell-sidebar-accent text-shell-sidebar-foreground"
      }`}
    >
      {children}
    </span>
  );
}

function IconStore() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
    >
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function IconArrows() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
    >
      <path d="M7 16V4M7 4L3 8M7 4l4 4M17 8v12M17 20l4-4M17 20l-4-4" />
    </svg>
  );
}

function IconPackage() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
    >
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

function IconBell() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function IconCloud() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
    >
      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
    </svg>
  );
}

function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 300);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="חזרה להתחלה"
      className={`fixed bottom-6 end-6 z-50 flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-opacity duration-200 hover:brightness-110 active:scale-95 ${
        visible
          ? "opacity-100 pointer-events-auto"
          : "opacity-0 pointer-events-none"
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        className="h-5 w-5"
        aria-hidden
      >
        <path
          d="M12 19V5M5 12l7-7 7 7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

type Props = {
  locale: Locale;
  messages: AppMessages;
  children: React.ReactNode;
};

export function AppShell({ locale, messages, children }: Props) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [footerOpen, setFooterOpen] = useState(true);
  const [categoryPanelOpen, setCategoryPanelOpen] = useState(true);

  const prefix = `/${locale}`;
  const nav = [
    {
      href: `${prefix}/stores`,
      label: messages.navStores,
      icon: <IconStore />,
    },
    {
      href: `${prefix}/suppliers`,
      label: messages.navSuppliers,
      icon: <IconPackage />,
    },
    {
      href: `${prefix}/mapping`,
      label: messages.navMapping,
      icon: <IconArrows />,
    },
    {
      href: `${prefix}/settings`,
      label: messages.navSettings,
      icon: <IconSettings />,
    },
  ];

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const supplierNav = parseSupplierNavPath(pathname, locale);
  const suppliersNavHref = `${prefix}/suppliers`;
  const sidebarWidth = supplierNav ? "w-72" : "w-[17.5rem]";

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.assign(`${prefix}/login`);
  }

  function renderNavLink({
    href,
    label,
    icon,
  }: {
    href: string;
    label: string;
    icon: ReactNode;
  }) {
    const active = isActive(href);
    return (
      <Link
        key={href}
        href={href}
        onClick={() => setMobileOpen(false)}
        className={`flex items-center gap-3 rounded-xl border-e-[3px] px-3 py-2.5 text-sm font-medium transition-colors ${
          active
            ? "border-e-primary bg-shell-sidebar-active text-primary shadow-sm"
            : "border-e-transparent text-shell-sidebar-foreground hover:bg-shell-sidebar-accent"
        }`}
      >
        <NavIcon active={active}>{icon}</NavIcon>
        <span className="min-w-0 flex-1 text-start leading-snug">{label}</span>
      </Link>
    );
  }

  const suppliersNavIndex = nav.findIndex((item) => item.href === suppliersNavHref);
  const navBeforeSuppliers =
    suppliersNavIndex >= 0 ? nav.slice(0, suppliersNavIndex) : nav;
  const navFromSuppliers =
    suppliersNavIndex >= 0 ? nav.slice(suppliersNavIndex) : [];

  const sidebar = (
    <aside
      className={`flex h-full ${sidebarWidth} shrink-0 flex-col border-shell-sidebar-border bg-shell-sidebar shadow-[2px_0_24px_rgba(15,23,42,0.04)] md:border-e`}
    >
      <div className="border-b border-shell-sidebar-border px-5 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl shadow-sm ring-1 ring-black/5">
            <Image
              src="/sidebar-logo.svg"
              alt={messages.brandName}
              width={44}
              height={44}
              className="h-full w-full object-contain"
            />
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-bold tracking-tight text-shell-sidebar-foreground">
              {messages.brandName}
            </p>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        {supplierNav ? (
          <>
            <nav
              className="flex shrink-0 flex-col gap-0.5 p-3 pb-2"
              aria-label="Main"
            >
              {navBeforeSuppliers.map(({ href, label, icon }) =>
                renderNavLink({ href, label, icon }),
              )}
              {navFromSuppliers.length > 0
                ? renderNavLink(navFromSuppliers[0]!)
                : null}
            </nav>

            <div
              className={
                categoryPanelOpen
                  ? "min-h-0 flex-1 overflow-y-auto border-y border-shell-sidebar-border px-2 py-2"
                  : "shrink-0 border-y border-shell-sidebar-border px-2 py-2"
              }
            >
              <SupplierCategorySidebarPanel
                locale={locale}
                supplierId={supplierNav.supplierId}
                activeCategoryId={supplierNav.categoryId}
                messages={messages}
                onNavigate={() => setMobileOpen(false)}
                onOpenChange={setCategoryPanelOpen}
              />
            </div>

            <nav className="flex shrink-0 flex-col gap-0.5 p-3 pt-2">
              {navFromSuppliers.slice(1).map(({ href, label, icon }) =>
                renderNavLink({ href, label, icon }),
              )}
            </nav>
          </>
        ) : (
          <nav
            className="flex flex-1 flex-col gap-0.5 p-3"
            aria-label="Main"
          >
            {nav.map(({ href, label, icon }) =>
              renderNavLink({ href, label, icon }),
            )}
          </nav>
        )}
      </div>

      <div className="shrink-0 border-t border-shell-sidebar-border">
        <button
          type="button"
          onClick={() => setFooterOpen((v) => !v)}
          aria-expanded={footerOpen}
          className="flex w-full items-center gap-2 px-4 py-3 text-start transition hover:bg-shell-sidebar-accent"
        >
          <svg
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`h-4 w-4 shrink-0 text-muted transition-transform duration-200 ${
              footerOpen ? "rotate-180" : ""
            }`}
            aria-hidden
          >
            <path
              fillRule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
          <span className="min-w-0 flex-1 text-xs font-bold text-shell-sidebar-foreground">
            {messages.sidebarQuickActions}
          </span>
        </button>
        {footerOpen ? (
          <div className="space-y-2 px-4 pb-4">
            <Link
              href={`${prefix}/stores/new`}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-md transition hover:brightness-110"
            >
              <span className="text-lg leading-none">+</span>
              {messages.addStore}
            </Link>
            <Link
              href={`${prefix}/suppliers/new`}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-shell-sidebar-border bg-shell-sidebar px-4 py-2.5 text-sm font-semibold text-primary transition hover:bg-shell-sidebar-accent"
            >
              <span className="text-lg leading-none">+</span>
              {messages.addSupplierShort}
            </Link>
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="w-full rounded-lg py-2.5 text-sm font-medium text-muted transition hover:bg-shell-sidebar-accent hover:text-foreground"
            >
              {messages.logout}
            </button>
          </div>
        ) : null}
      </div>
    </aside>
  );

  return (
    <div className="flex min-h-dvh bg-background">
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-900/35 backdrop-blur-[2px] md:hidden"
          aria-label={messages.closeMenu}
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <div
        className={`${
          mobileOpen
            ? `fixed inset-y-0 start-0 z-50 flex max-h-dvh ${supplierNav ? "w-[min(18rem,calc(100vw-1.5rem))]" : "w-[min(17.5rem,calc(100vw-1.5rem))]"}`
            : "hidden"
        } md:sticky md:top-0 md:z-auto md:flex md:h-dvh`}
      >
        {sidebar}
      </div>

      <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex min-h-14 shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-shell-topbar-border bg-shell-topbar/95 px-3 py-2.5 shadow-sm backdrop-blur-md md:px-6 md:py-3">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4">
            <button
              type="button"
              className="rounded-lg p-2 text-shell-sidebar-foreground hover:bg-shell-sidebar-accent md:hidden"
              aria-label={messages.openMenu}
              onClick={() => setMobileOpen(true)}
            >
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
              </svg>
            </button>
            <div className="hidden min-w-0 items-center gap-4 text-sm sm:flex">
              <span className="font-bold text-foreground">
                {messages.brandName}
              </span>
              <span
                className="hidden h-4 w-px bg-border md:block"
                aria-hidden
              />
              <a
                href="#"
                className="text-shell-topbar-muted transition hover:text-primary"
              >
                {messages.topBarDocs}
              </a>
              <a
                href="#"
                className="text-shell-topbar-muted transition hover:text-primary"
              >
                {messages.topBarSupport}
              </a>
            </div>
          </div>

          <div className="flex w-full items-center justify-end gap-1.5 sm:w-auto sm:max-w-none md:gap-2">
            <label className="relative w-full min-w-0 sm:w-44 md:w-52 lg:w-56">
              <span className="pointer-events-none absolute top-1/2 start-3 -translate-y-1/2 text-shell-topbar-muted">
                <IconSearch />
              </span>
              <input
                type="search"
                placeholder={messages.searchPlaceholder}
                className="w-full rounded-xl border border-transparent bg-muted-bg py-2 ps-9 pe-3 text-sm text-foreground shadow-inner placeholder:text-shell-topbar-muted focus:border-primary/20 focus:outline-none focus:ring-2 focus:ring-ring/30"
                readOnly
              />
            </label>
            <button
              type="button"
              className="hidden rounded-xl p-2 text-shell-topbar-muted transition hover:bg-shell-sidebar-accent sm:inline-flex"
              aria-label="Notifications"
            >
              <IconBell />
            </button>
            <button
              type="button"
              className="hidden rounded-xl p-2 text-shell-topbar-muted transition hover:bg-shell-sidebar-accent sm:inline-flex"
              aria-label="Cloud"
            >
              <IconCloud />
            </button>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted-bg text-xs font-semibold text-muted ring-1 ring-border">
              U
            </div>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-auto bg-gradient-to-b from-background to-muted-bg/30 p-4 md:p-8">
          {children}
        </main>
        <ScrollToTopButton />
      </div>
    </div>
  );
}
