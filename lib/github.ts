import "server-only";
import { createHash, randomBytes } from "node:crypto";

/**
 * Writes content to GitHub, which triggers a Vercel deploy.
 *
 * Uses the Git Data API rather than the simpler Contents API. The reason is
 * atomicity: a project is one JSON file plus up to eight images, and those must
 * appear together. With the Contents API each file is a separate commit, so a
 * failure halfway through leaves the repository referencing images that do not
 * exist. The Git Data API builds blobs, assembles a tree, creates one commit and
 * moves the ref in a single step, so the content is either fully published or
 * not published at all.
 *
 * Authentication is a fine-grained personal access token with `Contents: write`
 * scoped to this one repository. It is never exposed to the browser: every call
 * happens inside a Server Action.
 */

const API = "https://api.github.com";
const API_VERSION = "2022-11-28";

const MAX_ATTEMPTS = 3;
const REQUEST_TIMEOUT_MS = 10_000;

/**
 * Upper bound on simultaneous GitHub calls.
 *
 * GitHub applies a secondary rate limit for bursts, which surfaces as a 403 or a
 * connection reset rather than a clean 429. Reordering projects rewrites every
 * project file, so without a cap a large portfolio would fire dozens of parallel
 * blob writes and get itself throttled. Six is comfortably under the limit and
 * still fast.
 */
const CONCURRENCY = 6;

/** A GitHub failure with enough context to show the owner an actionable message. */
export class GitHubError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "GitHubError";
  }
}

/** Configuration, or `null` when publishing is not set up. */
function getConfig(): { owner: string; repo: string; token: string; branch: string } | null {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_REPO_OWNER;
  const repo = process.env.GITHUB_REPO_NAME;
  if (!token || !owner || !repo) return null;

  return { owner, repo, token, branch: process.env.GITHUB_BRANCH ?? "main" };
}

export function isGitConfigured(): boolean {
  return getConfig() !== null;
}

function repoPath(): string {
  const config = getConfig();
  // Guarded by every caller checking `isGitConfigured()` first.
  return `${config!.owner}/${config!.repo}`;
}

/**
 * Runs an async mapper over a list with a fixed number of workers.
 *
 * Preserves input order in the result. Used to keep burst concurrency below
 * GitHub's secondary rate limit without paying for a batching dependency.
 */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  await Promise.all(
    Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
      while (cursor < items.length) {
        const index = cursor++;
        results[index] = await worker(items[index], index);
      }
    }),
  );

  return results;
}

type FetchOptions = Omit<RequestInit, "body"> & { body?: unknown };

/** Performs an authenticated request against the GitHub API. */
async function api(path: string, options: FetchOptions = {}) {
  const config = getConfig()!;

  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${config.token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": API_VERSION,
      "User-Agent": "saleke-portfolio-admin",
      ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    signal: options.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (response.status === 204) return null;

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new GitHubError(describe(response.status, detail), response.status);
  }

  return response.json();
}

function describe(status: number, detail: string): string {
  if (status === 401) return "GitHub rejected the token. Check that GITHUB_TOKEN is valid and not expired.";
  if (status === 403) {
    return detail.includes("rate limit") || detail.includes("secondary")
      ? "GitHub rate limit reached. Wait a few minutes and try again."
      : "GitHub refused the request. The token may lack Contents: write on this repository.";
  }
  if (status === 404) return "Repository or branch not found. Check GITHUB_REPO_OWNER, GITHUB_REPO_NAME and GITHUB_BRANCH.";
  if (status === 409) return "Someone else pushed to the repository at the same time. Try again.";
  if (status === 422) return `GitHub rejected the commit as invalid: ${detail.slice(0, 300)}`;
  return `GitHub request failed (${status}). ${detail.slice(0, 300)}`;
}

/** A file to include in a commit. `content` is text or raw bytes. */
export type GitFile =
  | { path: string; content: string | Buffer }
  | { path: string; delete: true };

export type CommitResult = { commitSha: string };

/**
 * Creates a blob and returns its SHA.
 *
 * The `content` handling is the subtle part. GitHub's blob endpoint expects
 * base64 with `encoding: "base64"`. Text is base64-encoded here on the way in;
 * a `Buffer` is already raw bytes and is base64-encoded directly. Passing
 * pre-encoded base64 text through the text path would encode it a second time
 * and produce a file that looks like valid base64 but decodes to base64.
 */
async function createBlob(content: string | Buffer): Promise<string> {
  const base64 =
    typeof content === "string"
      ? Buffer.from(content, "utf8").toString("base64")
      : content.toString("base64");

  const result = await api(`/repos/${repoPath()}/git/blobs`, {
    method: "POST",
    body: { content: base64, encoding: "base64" },
  });

  return (result as { sha: string }).sha;
}

/**
 * Commits a set of files in one atomic commit.
 *
 * A `delete` entry removes that path, which is how removing an image works. The
 * base tree is the current branch head, so the commit contains the repository as
 * it exists now plus these changes and nothing else.
 *
 * The ref update fails with 409 when the branch moved between our read and our
 * write. Retrying re-reads the head and reapplies the same tree on top, which
 * resolves the race without losing the change.
 */
export async function commitFiles(files: GitFile[], message: string): Promise<CommitResult> {
  const config = getConfig();
  if (!config) {
    throw new GitHubError(
      "Publishing is not configured. Set GITHUB_TOKEN, GITHUB_REPO_OWNER and GITHUB_REPO_NAME.",
      500,
    );
  }

  if (files.length === 0) {
    throw new GitHubError("There was nothing to save.", 400);
  }

  const base = repoPath();

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const head = await api(
      `/repos/${base}/git/ref/heads/${encodeURIComponent(config.branch)}`,
    );
    const headSha = (head as { object: { sha: string } }).object.sha;

    const parent = await api(`/repos/${base}/git/commits/${headSha}`);
    const baseTree = (parent as { tree: { sha: string } }).tree.sha;

    const entries = await mapWithConcurrency(files, CONCURRENCY, async (file) => {
      // A null sha in a tree entry is how the API is told to remove the path.
      if ("delete" in file) {
        return { path: file.path, mode: "100644", type: "blob", sha: null as string | null };
      }
      const sha = await createBlob(file.content);
      return { path: file.path, mode: "100644", type: "blob", sha };
    });

    const tree = await api(`/repos/${base}/git/trees`, {
      method: "POST",
      body: { base_tree: baseTree, tree: entries },
    });

    const created = await api(`/repos/${base}/git/commits`, {
      method: "POST",
      body: {
        message,
        tree: (tree as { sha: string }).sha,
        // The author is fixed so commits are attributable and reproducible,
        // rather than appearing as an anonymous bot.
        author: {
          name: process.env.ADMIN_COMMIT_AUTHOR ?? "Portfolio Admin",
          email: process.env.ADMIN_COMMIT_EMAIL ?? "admin@localhost",
        },
      },
    });
    const commitSha = (created as { sha: string }).sha;

    try {
      await api(`/repos/${base}/git/refs/heads/${encodeURIComponent(config.branch)}`, {
        method: "PATCH",
        body: { sha: commitSha, force: false },
      });
      return { commitSha };
    } catch (error) {
      // A non-fast-forward means someone pushed between our read and our write.
      // Retry against the new head rather than failing the owner's save.
      // GitHub returns 409 for a stale ref and 422 for a conflict; both are retryable.
      if (error instanceof GitHubError && (error.status === 409 || error.status === 422)) continue;
      throw error;
    }
  }

  throw new GitHubError(
    "Could not publish: the repository kept changing while saving. Try again.",
    409,
  );
}

/**
 * Lists every blob path under a prefix on the content branch.
 *
 * Reads the tree once rather than calling per path, so this stays a single API
 * call regardless of how many files exist.
 */
export async function listFilesUnder(prefix: string): Promise<string[]> {
  const config = getConfig();
  if (!config) return [];

  const result = await api(
    `/repos/${repoPath()}/git/trees/${encodeURIComponent(config.branch)}?recursive=1`,
  );

  const entries = (result as { tree?: { path: string; type: string }[] }).tree ?? [];
  return entries
    .filter((entry) => entry.type === "blob" && entry.path.startsWith(prefix))
    .map((entry) => entry.path);
}

/**
 * Reads the raw text of a file from the branch head.
 *
 * Returns `null` when the file does not exist, which is the normal case the
 * first time a project is created.
 */
async function readFileFromBranch(path: string): Promise<string | null> {
  const config = getConfig();
  if (!config) return null;

  const response = await fetch(
    `${API}/repos/${repoPath()}/contents/${path.split("/").map(encodeURIComponent).join("/")}` +
      `?ref=${encodeURIComponent(config.branch)}`,
    {
      headers: {
        Authorization: `Bearer ${config.token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": API_VERSION,
        "User-Agent": "saleke-portfolio-admin",
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    },
  );

  if (response.status === 404) return null;

  if (!response.ok) {
    throw new GitHubError(
      response.status === 403
        ? "GitHub refused to read the current content. The token may lack access to this repository, or the rate limit may be exhausted."
        : `GitHub request failed (${response.status}) while reading the current content.`,
      response.status,
    );
  }

  const payload = (await response.json()) as {
    content?: string;
    encoding?: string;
    size?: number;
  };

  // GitHub omits the body for files over 1 MB, and may return `encoding: "none"`
  // with a download URL instead. Content documents here are a few kilobytes, so
  // anything else means the expectation is wrong and should be reported rather
  // than silently producing an empty write.
  if (payload.encoding !== "base64" || !payload.content) {
    throw new GitHubError(
      `Could not read ${path} from GitHub (${payload.size ?? "?"} bytes, encoding "${
        payload.encoding ?? "unknown"
      }"). Content documents are expected to be small JSON files.`,
      502,
    );
  }

  // GitHub wraps base64 at 60 characters, so the whitespace has to go before
  // decoding or the payload is silently corrupted.
  return Buffer.from(payload.content.replace(/\s/g, ""), "base64").toString("utf8");
}

/**
 * Reads the current committed version of a JSON document from the branch head.
 *
 * This exists because of a correctness trap that is easy to miss. The admin
 * reads content from the local filesystem, and that filesystem reflects the
 * *last build*, not the *latest commit*. If the owner publishes twice in quick
 * succession, the second save would be computed against stale data and could
 * silently revert the first.
 *
 * Every mutating action therefore reads the authoritative version from the
 * branch head, applies only the fields its own form owns, and writes the result
 * back. Fields belonging to other forms and other tabs survive untouched.
 */
export async function fetchJsonFile<T = unknown>(path: string): Promise<T | null> {
  const raw = await readFileFromBranch(path);
  if (raw === null) return null;

  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    throw new GitHubError(
      `${path} on the content branch is not valid JSON, so the edit was not saved. Fix the file on GitHub and try again. (${
        (error as Error).message
      })`,
      502,
    );
  }
}

/**
 * Reads several JSON documents with bounded concurrency.
 *
 * `Promise.all` over an unbounded list would burst enough requests to trip
 * GitHub's secondary rate limit when a portfolio has many projects.
 */
export async function fetchJsonFiles<T = unknown>(paths: string[]): Promise<Map<string, T | null>> {
  const entries = await mapWithConcurrency(paths, CONCURRENCY, async (path) => {
    try {
      return [path, (await fetchJsonFile<T>(path)) ?? null] as const;
    } catch {
      // One unreadable file must not abort a reorder of every other project.
      return [path, null] as const;
    }
  });

  return new Map(entries);
}

/** One entry in the dashboard's recent-activity feed. */
export type RecentCommit = {
  sha: string;
  /** First line of the commit message. */
  summary: string;
  /** ISO timestamp of the commit, if GitHub reported one. */
  date?: string;
  author: string;
};

/**
 * Lists recent commits on the content branch.
 *
 * Used by the overview to answer "did my last save actually land?". Callers
 * swallow failures, because a missing activity feed is not a reason to fail the
 * dashboard.
 */
export async function listRecentCommits(limit = 6): Promise<RecentCommit[]> {
  const config = getConfig();
  if (!config) return [];

  const result = await api(
    `/repos/${repoPath()}/commits?sha=${encodeURIComponent(config.branch)}&per_page=${limit}`,
  );

  const commits = result as {
    sha: string;
    commit?: { message?: string; author?: { name?: string; date?: string } };
    author?: { login?: string } | null;
  }[];

  return commits.map((entry) => ({
    sha: entry.sha,
    // A commit message is a subject line followed by a blank line and a body.
    // Only the subject is interesting in a compact feed.
    summary: (entry.commit?.message ?? "").split("\n")[0] ?? "",
    date: entry.commit?.author?.date,
    author: entry.author?.login ?? entry.commit?.author?.name ?? "unknown",
  }));
}

/**
 * Builds a content-addressed filename for an uploaded image.
 *
 * Content hashing means re-uploading the same screenshot produces the same path,
 * so a repeated save does not accumulate duplicates in the repository. The
 * random suffix guards against two different images colliding. `file.name` is
 * never used: it is attacker-controlled and could contain a path.
 */
export function buildImageFilename(bytes: Buffer): string {
  const hash = createHash("sha256").update(bytes).digest("hex").slice(0, 12);
  const suffix = randomBytes(3).toString("hex");
  return `${hash}-${suffix}.webp`;
}