"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/admin/Icon";
import { logoutAction } from "@/app/admin/login/actions";

/**
 * Navigation model.
 *
 * Grouped rather than flat because the distinction matters to the owner: content
 * is written copy, the library is a taxonomy that feeds several places, and
 * system is deployment configuration. Sections with a single item are omitted so
 * the sidebar never shows a heading with nothing under it.
 */
const navigation: { section?: string; items: { href: string; label: string; icon: IconName }[] }[] = [
  { items: [{ href: "/admin", label: "Dashboard", icon: "grid" }] },
  {
    section: "Content",
    items: [
      { href: "/admin/projects", label: "Projects", icon: "layers" },
      { href: "/admin/content", label: "Homepage", icon: "document" },
    ],
  },
  {
    section: "Library",
    items: [
      { href: "/admin/technology", label: "Skills and tools", icon: "chip" },
      { href: "/admin/direction", label: "Current direction", icon: "target" },
    ],
  },
  { section: "System", items: [{ href: "/admin/settings", label: "Configuration", icon: "sliders" }] },
];

/**
 * Active-route matching.
 *
 * `/admin` must match exactly, otherwise it would stay highlighted on every
 * nested page because every admin route starts with it. Deeper routes match on
 * a path boundary so `/admin/projects` does not light up for `/admin/projectsx`.
 */
function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminShell({ name, children }: { name: string; children: ReactNode }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerTriggerRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);

  // Escape closes the drawer, matching the convention for anything that
  // overlays the page.
  useEffect(() => {
    if (!drawerOpen) return;
    const trigger = drawerTriggerRef.current;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDrawerOpen(false);
        return;
      }

      if (event.key === "Tab") {
        const elements = Array.from(
          sidebarRef.current?.querySelectorAll<HTMLElement>("a, button:not(:disabled)") ?? [],
        );
        const first = elements[0];
        const last = elements.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    // Prevent the page behind the drawer from scrolling with it.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = window.requestAnimationFrame(() => {
      sidebarRef.current?.querySelector<HTMLElement>("a, button")?.focus();
    });
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      trigger?.focus();
    };
  }, [drawerOpen]);

  const initial = name.trim().charAt(0).toUpperCase() || "A";
  const currentLabel = navigation
    .flatMap((group) => group.items)
    .find((item) => isActive(pathname, item.href))?.label ?? "Dashboard";

  return (
    <div className="admin-app">
      <a className="skip-link" href="#admin-main">Skip to editor</a>
      {/*
        The scrim is only rendered while the drawer is open. Keeping it out of
        the tree the rest of the time means it cannot intercept clicks, and it
        removes the need for a `pointer-events` toggle.
      */}
      {drawerOpen ? (
        <button
          type="button"
          className="admin-scrim"
          aria-label="Close navigation"
          onClick={() => setDrawerOpen(false)}
        />
      ) : null}

      <aside ref={sidebarRef} className={`admin-sidebar ${drawerOpen ? "is-open" : ""}`} aria-label="Admin sections">
        <div className="admin-sidebar-head">
          <span className="admin-brand-mark" aria-hidden="true">
            {initial}
          </span>
          <span className="admin-sidebar-id">
            <strong>Portfolio admin</strong>
            <small>{name}</small>
          </span>
          <button
            ref={drawerTriggerRef}
            type="button"
            className="admin-icon-button admin-sidebar-close"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close navigation"
          >
            <Icon name="close" />
          </button>
        </div>

        <nav className="admin-nav">
          {navigation.map((group, groupIndex) => (
            <div className="admin-nav-group" key={group.section ?? `group-${groupIndex}`}>
              {group.section ? <p className="admin-nav-label">{group.section}</p> : null}
              <ul>
                {group.items.map((item) => {
                  const active = isActive(pathname, item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`admin-nav-link ${active ? "is-active" : ""}`}
                        aria-current={active ? "page" : undefined}
                        onClick={() => setDrawerOpen(false)}
                      >
                        <Icon name={item.icon} />
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="admin-sidebar-foot">
          <Link href="/" target="_blank" rel="noreferrer" className="admin-nav-link">
            <Icon name="external" />
            <span>View live site</span>
          </Link>
          <form action={logoutAction}>
            <button type="submit" className="admin-nav-link admin-nav-button">
              <Icon name="signout" />
              <span>Sign out</span>
            </button>
          </form>
        </div>
      </aside>

      <div className="admin-body" id="admin-main" tabIndex={-1}>
        {/* Mobile-only bar. On wider screens the sidebar is always visible and
            this would be a duplicate of it. */}
        <header className="admin-mobilebar">
          <button
            type="button"
            className="admin-icon-button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation"
            aria-expanded={drawerOpen}
          >
            <Icon name="menu" size={18} />
          </button>
          <span className="admin-mobilebar-title">{currentLabel}</span>
          <Link href="/" target="_blank" rel="noreferrer" className="admin-icon-button" aria-label="View live site">
            <Icon name="external" />
          </Link>
        </header>

        {children}
      </div>
    </div>
  );
}
