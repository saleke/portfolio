import Link from "next/link";
import { redirect } from "next/navigation";
import { isAuthenticated, isAuthConfigured } from "@/lib/auth";
import { getSiteCopy } from "@/lib/content";
import { AdminShell } from "@/components/admin/AdminShell";

/**
 * Authenticated shell for every route in the dashboard group.
 *
 * This is a rendering guard, not an authorization boundary: it stops an
 * unauthenticated visitor from seeing the interface, but the Server Actions
 * themselves re-check the session before doing any work. Both are required. A
 * Server Action is a public HTTP endpoint and is reachable regardless of what
 * this layout chose to render.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAuthenticated())) {
    // Distinguish "not configured" from "signed out". Redirecting to /login on
    // a deployment where the admin was never enabled would show a password
    // prompt that can never succeed, which is a confusing dead end.
    if (!isAuthConfigured()) {
      return (
        <main className="admin-standalone">
          <div className="admin-panel">
            <p className="admin-eyebrow">SETUP</p>
            <h1>Admin area not configured</h1>
            <p className="admin-subtle">
              Two environment variables are required. Generate the first with the password script
              and the second with any random string generator.
            </p>
            <ol className="admin-steps">
              <li>
                Run{" "}
                <code>node scripts/hash-password.mjs &quot;your password&quot;</code> and copy the
                printed value.
              </li>
              <li>
                Run{" "}
                <code>
                  node -e &quot;console.log(require(&apos;crypto&apos;).randomBytes(32).toString(
                  &apos;base64url&apos;))&quot;
                </code>{" "}
                for a session secret.
              </li>
              <li>
                Set <code>ADMIN_PASSWORD_HASH</code> and <code>ADMIN_SESSION_SECRET</code>, then
                redeploy.
              </li>
            </ol>
            <Link href="/admin/login" className="admin-button">
              Go to sign in
            </Link>
          </div>
        </main>
      );
    }

    redirect("/admin/login");
  }

  const site = await getSiteCopy();

  return <AdminShell name={site.name}>{children}</AdminShell>;
}