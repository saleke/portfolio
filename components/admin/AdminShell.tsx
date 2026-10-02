"use client";

import { useEffect, useState, type ReactNode } from "react";
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
  { items: [{ href: "/admin", label: "Overview", icon: "grid" }] },
  {
    section: "Content",
    items: [
      { href: "/admin/projects", label: "Projects", icon: "layers" },
      { href: "/admin/content", label: "Site copy", icon: "document" },
    ],
  },
  {
    section: "Library",
    items: [
      { href: "/admin/technology", label: "Technology", icon: "chip" },
      { href: "/admin/direction", label: "Direction", icon: "target" },
    ],
  },
  { section: "System", items: [{ href: "/admin/settings", label: "Settings", icon: "sliders" }] },
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

  // Track the route the drawer was opened on. When the route changes, close it.
  // Comparing the previous pathname in render avoids the extra pass that an
  // effect would cause, and the stored value from the last render is exactly
  // what that comparison needs.
  const [routeAtOpen, setRouteAtOpen] = useState(pathname);
  if (routeAtOpen !== pathname) {
    setRouteAtOpen(pathname);
    if (drawerOpen) setDrawerOpen(false);
  }

  // Escape closes the drawer, matching the convention for anything that
  // overlays the page.
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };
    document.addEventListener("keydown", onKey);
    // Prevent the page behind the drawer from scrolling with it.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [drawerOpen]);

  const initial = name.trim().charAt(0).toUpperCase() || "A";

  return (
    <div className="admin-app">
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

      <aside className={`admin-sidebar ${drawerOpen ? "is-open" : ""}`} aria-label="Admin sections">
        <div className="admin-sidebar-head">
          <span className="admin-brand-mark" aria-hidden="true">
            {initial}
          </span>
          <span className="admin-sidebar-id">
            <strong>Control plane</strong>
            <small>{name}</small>
          </span>
          <button
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

      <div className="admin-body">
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
          <span className="admin-mobilebar-title">Control plane</span>
          <Link href="/" target="_blank" rel="noreferrer" className="admin-icon-button" aria-label="View live site">
            <Icon name="external" />
          </Link>
        </header>

        {children}
      </div>
    </div>
  );
}