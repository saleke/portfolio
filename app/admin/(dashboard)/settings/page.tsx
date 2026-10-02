import { isAuthConfigured } from "@/lib/auth";
import { isGitConfigured } from "@/lib/github";
import { contactVariables } from "@/data/profile";
import { Icon } from "@/components/admin/Icon";

/**
 * Settings.
 *
 * Read-only on purpose. These values are environment variables, and a deployed
 * function has no way to write its own environment. Making them editable would
 * mean storing the real values somewhere else, which is the opposite of why they
 * are variables in the first place.
 *
 * What this page does instead is show exactly which are set, and what each one
 * is for, so setting them is a lookup rather than an archaeology exercise
 * through the README. Nothing secret is rendered: only whether a variable is
 * present, never its value.
 */

type Variable = {
  name: string;
  purpose: string;
  required: boolean;
  example?: string;
};

/** Reads presence only. Values are never interpolated into the page. */
function isSet(name: string): boolean {
  const value = process.env[name];
  return typeof value === "string" && value.trim().length > 0;
}

function VariableRow({ variable }: { variable: Variable }) {
  const set = isSet(variable.name);

  return (
    <li className={`admin-var ${set ? "is-set" : "is-missing"}`}>
      <span className="admin-var-dot" aria-hidden="true">
        <Icon name={set ? "check" : "close"} size={12} />
      </span>
      <div className="admin-var-body">
        <code>{variable.name}</code>
        <p>{variable.purpose}</p>
        {variable.example ? (
          <small className="admin-var-example">
            <span>Example</span>
            <code>{variable.example}</code>
          </small>
        ) : null}
      </div>
      <span className="admin-var-state">
        {set ? "Set" : variable.required ? "Required" : "Optional"}
      </span>
    </li>
  );
}

/** A titled group of variables. */
function Group({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="admin-panel">
      <h2 className="admin-section-title">{title}</h2>
      <p className="admin-note">{description}</p>
      <ul className="admin-vars">{children}</ul>
    </section>
  );
}

export default function SettingsPage() {
  const authReady = isAuthConfigured();
  const gitReady = isGitConfigured();

  const missing = [
    ...(!authReady
      ? ["ADMIN_PASSWORD_HASH", "ADMIN_SESSION_SECRET"]
      : []
    ).concat(!gitReady ? ["GITHUB_TOKEN", "GITHUB_REPO_OWNER", "GITHUB_REPO_NAME"] : []),
  ];

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <p className="admin-eyebrow">SYSTEM</p>
          <h1>Settings</h1>
          <p className="admin-subtle">
            Configuration is read from environment variables and cannot be changed here. This page
            shows which are set.
          </p>
        </div>
      </header>

      {missing.length > 0 ? (
        <section className="admin-callout is-warning">
          <Icon name="alert" size={16} />
          <div>
            <h2>Publishing is incomplete</h2>
            <p>
              {missing.length} variable{missing.length === 1 ? " is" : "s are"} not set. Until they
              are, forms will load but saving will fail. Set them in your host&amp;rsquo;s environment and
              redeploy.
            </p>
            <ul>
              {missing.map((name) => (
                <li key={name}>
                  <code>{name}</code>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : (
        <section className="admin-callout is-success">
          <Icon name="check" size={16} />
          <div>
            <h2>Everything required is configured</h2>
            <p>Publishing and sign-in are both ready. Contact channels are listed below.</p>
          </div>
        </section>
      )}

      <Group
        title="Sign-in"
        description="Both are required for the admin area to be reachable at all. The hash itself is never stored in the repository."
      >
        <VariableRow
          variable={{
            name: "ADMIN_PASSWORD_HASH",
            purpose:
              "The admin password, stored as a scrypt hash. Generate it with the password script and paste the printed value here.",
            required: true,
            example: "scrypt$9f2a…$4c1d…",
          }}
        />
        <VariableRow
          variable={{
            name: "ADMIN_SESSION_SECRET",
            purpose:
              "Signs the session cookie. Any long random string works; changing it signs everyone out.",
            required: true,
            example: "k3Jd9xQm2Lp7…",
          }}
        />
      </Group>

      <Group
        title="Publishing"
        description="These decide where saves are written. A deploy happens automatically after each commit."
      >
        <VariableRow
          variable={{
            name: "GITHUB_TOKEN",
            purpose:
              "A fine-grained token with Contents: write on this repository only. A classic token with repo scope also works but grants far more access than publishing needs.",
            required: true,
          }}
        />
        <VariableRow
          variable={{
            name: "GITHUB_REPO_OWNER",
            purpose: "The repository owner or organisation.",
            required: true,
            example: "saleke",
          }}
        />
        <VariableRow
          variable={{
            name: "GITHUB_REPO_NAME",
            purpose: "The repository name.",
            required: true,
            example: "portfolio",
          }}
        />
        <VariableRow
          variable={{
            name: "GITHUB_BRANCH",
            purpose: "The branch that content is committed to. Leave unset for main.",
            required: false,
            example: "main",
          }}
        />
      </Group>

      <Group
        title="Contact details"
        description="Optional. A channel with no value is hidden from the site entirely rather than shown as a broken link, so unset entries here are safe."
      >
        {contactVariables.map((entry) => (
          <VariableRow
            key={entry.name}
            variable={{
              name: entry.name,
              purpose:
                entry.name.includes("EMAIL")
                  ? "Shown as a mailto link in the contact section, navbar and footer."
                  : entry.name.includes("PHONE")
                    ? "Shown as a tel link. Dialling characters are stripped automatically."
                    : entry.name.includes("GITHUB")
                      ? "Used for the GitHub link in the navbar, hero and contact section."
                      : "Shown in the contact section.",
              required: false,
            }}
          />
        ))}
      </Group>

      <section className="admin-panel">
        <h2 className="admin-section-title">How publishing works</h2>
        <ol className="admin-explainer">
          <li>
            A form submission writes the edited JSON and any new images to the repository in a
            single commit, so the content is either fully published or not published at all.
          </li>
          <li>
            That commit triggers your host to rebuild. The build reads the content files and
            validates them; invalid content fails the build rather than shipping.
          </li>
          <li>
            The new build goes live, usually within one to three minutes. Nothing here is instant,
            and nothing needs to be pressed to trigger it.
          </li>
        </ol>
        <p className="admin-note">
          Because every save is a commit, the full history of the site&rsquo;s content is in the
          repository&rsquo;s git history. Any change can be reverted there, and nothing is lost if a
          save looks wrong.
        </p>
      </section>
    </div>
  );
}