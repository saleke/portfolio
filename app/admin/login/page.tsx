import { redirect } from "next/navigation";
import { isAuthenticated, isAuthConfigured } from "@/lib/auth";
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
 */
export default async function LoginPage() {
  if (await isAuthenticated()) redirect("/admin");

  const configured = isAuthConfigured();

  return (
    <main className="admin-main admin-main-centered">
      <div className="admin-panel admin-panel-narrow">
        <p className="admin-eyebrow">ADMIN</p>
        <h1>Sign in</h1>

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