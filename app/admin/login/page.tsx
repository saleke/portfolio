import { redirect } from "next/navigation";
import { isAuthenticated, isAuthConfigured } from "@/lib/auth";
import { getSiteCopy } from "@/lib/content";
import { LoginForm } from "./LoginForm";

export const metadata = {
  title: "Sign in | Admin",
  robots: { index: false, follow: false },
};

/**
 * Sign-in page.
 *
 * Sits outside the dashboard route group so it is reachable while signed out.
 * An already-authenticated visitor is sent onward rather than shown a form that
 * would do nothing.
 *
 * The identity block and the prompt line are the same parts the dashboard
 * sidebar shows, so the page reads as the same product rather than as a bare
 * form someone dropped in front of it. The name comes from site copy, which is
 * cached, so reading it here costs nothing on a page that renders per request.
 */
export default async function LoginPage() {
  if (await isAuthenticated()) redirect("/admin");

  const configured = isAuthConfigured();
  const { name } = await getSiteCopy();
  const initial = name.trim().charAt(0).toUpperCase() || "A";

  return (
    <main className="admin-main login-main">
      <div className="login-card">
        <div className="login-brand">
          <span className="login-brand-mark" aria-hidden="true">
            {initial}
          </span>
          <span className="login-brand-id">
            <strong>Control plane</strong>
            <small>{name}</small>
          </span>
        </div>

        {/* Decorative. The prompt says nothing the heading does not. */}
        <p className="login-prompt" aria-hidden="true">
          <span className="login-prompt-path">~/admin</span>
          <span className="login-prompt-caret" />
        </p>

        <div className="login-head">
          <p className="admin-eyebrow">ADMIN</p>
          <h1 className="login-title">Sign in</h1>
          <p className="login-lede">
            Everything published here is written to the repository as a commit. The dashboard is
            the only place that can change the public site.
          </p>
        </div>

        {configured ? (
          <LoginForm />
        ) : (
          <div className="admin-note">
            <p>The admin area is not configured on this deployment.</p>
            <p>
              Set <code>ADMIN_PASSWORD_HASH</code> and <code>ADMIN_SESSION_SECRET</code>, then
              redeploy.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
