import type { Metadata } from "next";

/**
 * Shell for every admin route.
 *
 * Authentication lives in `app/admin/(dashboard)/layout.tsx` rather than here,
 * so that `/admin/login` stays reachable while signed out. Splitting the
 * guarded pages into a route group is what makes that possible; a guard in this
 * shared layout would redirect the login page back to itself.
 *
 * `noindex, nofollow` is set here so it applies to the whole tree, including
 * the login page. `robots.ts` also disallows the path, but this metadata is the
 * stronger guarantee: it emits the robots tag on the page itself, so a crawler
 * that ignores the disallow rule still will not list it.
 */
export const metadata: Metadata = {
  title: "Admin | Solomon Aleke",
  robots: { index: false, follow: false, nocache: true },
};

/**
 * The admin area is always rendered per request, never prerendered.
 *
 * This is a correctness requirement, not an optimisation. `isAuthenticated()`
 * short-circuits to `false` when `ADMIN_PASSWORD_HASH` is unset, which means
 * `cookies()` is never reached during the build — so Next would classify the
 * dashboard routes as static whenever the admin is not configured, and dynamic
 * once it is. Leaving that to inference would make prerendering depend on
 * whether environment variables happened to be present at build time.
 *
 * A prerendered admin page is worse than a cosmetic bug: the guard in
 * `(dashboard)/layout.tsx` runs at build time with no session, so the page
 * could be served from the CDN to anyone who asked for it. Forcing dynamic
 * rendering means the guard and the Server Actions always agree.
 */
export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="admin-shell">{children}</div>;
}