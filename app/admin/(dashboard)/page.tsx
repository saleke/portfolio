import Link from "next/link";
import { getProjects } from "@/lib/projects";
import { getTechnologies, getFocusAreas } from "@/lib/content";
import { listRecentCommits, isGitConfigured, type RecentCommit } from "@/lib/github";
import { isAuthConfigured } from "@/lib/auth";
import { contactVariables } from "@/data/profile";
import { Icon, type IconName } from "@/components/admin/Icon";

/**
 * The overview.
 *
 * Answers three questions, in order of how often the owner will ask them:
 * did my last save land, is anything broken, and what do I do next. Content
 * counts come from the local build (they are always accurate for what is
 * currently live); the activity feed comes from GitHub (it is always current).
 *
 * Everything here degrades rather than fails. A missing token or an unreachable
 * API must not take the landing page down, because the owner's first need is to
 * get to the form they came for.
 */

type Check = {
  label: string;
  ok: boolean;
  detail: string;
  /** Set when the item is the thing blocking everything else. */
  critical?: boolean;
};

/**
 * Builds the readiness checklist.
 *
 * Marked as a list rather than a progress bar because these are independent
 * items, and a percentage would imply a partial state is meaningfully better
 * than another. One missing contact email is not "80% ready".
 */
function buildChecks(): Check[] {
  const checks: Check[] = [];

  if (!isAuthConfigured()) {
    checks.push({
      label: "Admin sign-in",
      ok: false,
      critical: true,
      detail:
        "ADMIN_PASSWORD_HASH and ADMIN_SESSION_SECRET are not both set, so publishing is disabled.",
    });
  } else {
    checks.push({
      label: "Admin sign-in",
      ok: true,
      detail: "A password hash and session secret are configured.",
    });
  }

  if (!isGitConfigured()) {
    checks.push({
      label: "Publishing",
      ok: false,
      critical: true,
      detail:
        "GITHUB_TOKEN, GITHUB_REPO_OWNER and GITHUB_REPO_NAME are missing, so nothing can be saved.",
    });
  } else {
    checks.push({
      label: "Publishing",
      ok: true,
      detail: "GitHub is configured. Saves commit to the repository and trigger a deploy.",
    });
  }

  const missingContact = contactVariables.filter((entry) => !entry.configured);
  checks.push({
    label: "Contact details",
    ok: missingContact.length === 0,
    // Not critical: a missing phone number leaves a working site, just a
    // smaller one.
    detail:
      missingContact.length === 0
        ? "Every contact channel is configured."
        : `Not set: ${missingContact.map((entry) => entry.name).join(", ")}. Those channels are hidden from the site rather than shown as broken links.`,
  });

  return checks;
}

/** Formats an ISO timestamp as a short relative phrase. */
function relativeTime(iso?: string): string {
  if (!iso) return "";

  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "";

  const seconds = Math.round((Date.now() - then) / 1000);

  // Recent commits are the interesting case, so precision increases with
  // recency. Anything older than a week just gets a date.
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} d ago`;

  return new Date(then).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/** One tile in the counts row. */
function Stat({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string | number;
  hint: string;
  icon: IconName;
}) {
  return (
    <div className="admin-stat">
      <span className="admin-stat-icon" aria-hidden="true">
        <Icon name={icon} size={16} />
      </span>
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
        <small>{hint}</small>
      </div>
    </div>
  );
}

export default async function OverviewPage() {
  const [projects, technologies, focus] = await Promise.all([
    getProjects(),
    getTechnologies(),
    getFocusAreas(),
  ]);

  // Failures are swallowed on purpose: an activity feed is a convenience, and
  // an expired token should not block the owner from opening the project form.
  let commits: RecentCommit[] = [];
  let feedError: string | null = null;
  if (isGitConfigured()) {
    try {
      commits = await listRecentCommits(5);
    } catch {
      feedError = "Recent activity could not be loaded from GitHub.";
    }
  }

  const checks = buildChecks();
  const blockers = checks.filter((check) => !check.ok && check.critical);
  const imageCount = projects.reduce((total, project) => total + project.images.length, 0);
  const technologyCount = technologies.groups.reduce(
    (total, group) => total + group.items.length,
    0,
  );

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <p className="admin-eyebrow">OVERVIEW</p>
          <h1>Control plane</h1>
          <p className="admin-subtle">
            Everything on the public site is edited here and published to the repository.
          </p>
        </div>
        <div className="admin-head-actions">
          <Link href="/admin/projects/new" className="admin-button admin-button-primary">
            New project
          </Link>
        </div>
      </header>

      {blockers.length > 0 ? (
        // Rendered first and styled as a warning because a blocked save is the
        // one problem that makes every other button on this page useless.
        <section className="admin-callout is-warning" aria-labelledby="blockers-title">
          <Icon name="alert" size={16} />
          <div>
            <h2 id="blockers-title">Publishing needs setup</h2>
            <ul>
              {blockers.map((check) => (
                <li key={check.label}>{check.detail}</li>
              ))}
            </ul>
            <Link href="/admin/settings" className="admin-link">
              See what to set →
            </Link>
          </div>
        </section>
      ) : null}

      <section aria-labelledby="counts-title">
        <h2 className="admin-section-title" id="counts-title">
          Live content
        </h2>
        <div className="admin-stats">
          <Stat
            label="Projects"
            value={projects.length}
            hint={`${projects.filter((p) => p.featured).length} featured`}
            icon="layers"
          />
          <Stat
            label="Images"
            value={imageCount}
            hint="stored in the repository"
            icon="image"
          />
          <Stat
            label="Technologies"
            value={technologyCount}
            hint={`in ${technologies.groups.length} groups`}
            icon="chip"
          />
          <Stat
            label="Focus areas"
            value={focus.items.length}
            hint={`${focus.items.filter((item) => item.accent).length} highlighted`}
            icon="target"
          />
        </div>
      </section>

      <div className="admin-split">
        <section className="admin-panel" aria-labelledby="quick-title">
          <h2 className="admin-section-title" id="quick-title">
            Edit
          </h2>
          <ul className="admin-quicklinks">
            <li>
              <Link href="/admin/content">
                <Icon name="document" />
                <span>
                  <strong>Site copy</strong>
                  <small>Identity, hero, about and section headings</small>
                </span>
              </Link>
            </li>
            <li>
              <Link href="/admin/technology">
                <Icon name="chip" />
                <span>
                  <strong>Technology</strong>
                  <small>{technologyCount} tools across {technologies.groups.length} groups</small>
                </span>
              </Link>
            </li>
            <li>
              <Link href="/admin/direction">
                <Icon name="target" />
                <span>
                  <strong>Direction</strong>
                  <small>Focus areas and technical interests</small>
                </span>
              </Link>
            </li>
            <li>
              <Link href="/admin/projects">
                <Icon name="layers" />
                <span>
                  <strong>Projects</strong>
                  <small>{projects.length} published, add or reorder</small>
                </span>
              </Link>
            </li>
          </ul>
        </section>

        <section className="admin-panel" aria-labelledby="checks-title">
          <h2 className="admin-section-title" id="checks-title">
            Configuration
          </h2>
          <ul className="admin-checks">
            {checks.map((check) => (
              <li key={check.label}>
                <span
                  className={`admin-check-dot ${check.ok ? "is-ok" : check.critical ? "is-bad" : "is-warn"}`}
                  aria-hidden="true"
                />
                <div>
                  <strong>{check.label}</strong>
                  <small>{check.detail}</small>
                </div>
                <span className="sr-only">{check.ok ? "Configured" : "Needs attention"}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="admin-panel" aria-labelledby="activity-title">
        <h2 className="admin-section-title" id="activity-title">
          Recent activity
        </h2>

        {feedError ? (
          <p className="admin-subtle">{feedError}</p>
        ) : commits.length > 0 ? (
          <ol className="admin-activity">
            {commits.map((commit) => (
              <li key={commit.sha}>
                {/* Short SHA is enough to identify a commit in the GitHub UI and
                    avoids a wide, hard-to-scan column. */}
                <code title={commit.sha}>{commit.sha.slice(0, 7)}</code>
                <span>{commit.summary}</span>
                <small>
                  {commit.author}
                  {commit.date ? ` · ${relativeTime(commit.date)}` : ""}
                </small>
              </li>
            ))}
          </ol>
        ) : (
          <p className="admin-subtle">No commits found on the content branch.</p>
        )}

        <p className="admin-note">
          A save appears here immediately. The public site updates only after the build finishes,
          which usually takes one to three minutes.
        </p>
      </section>
    </div>
  );
}