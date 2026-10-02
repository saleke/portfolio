# Solomon Aleke | Developer Portfolio

An accessible, responsive developer portfolio for presenting my projects,
technical direction, and current learning honestly and clearly.

The portfolio provides a concise view of what I build, the technologies I work
with, and the technical direction I am developing and it can all be edited
from a password-protected admin area without touching code.

## Tech Stack

* **Next.js** | React framework
* **React** | UI development
* **TypeScript** | Type-safe application development
* **Tailwind CSS** | Styling
* **Zod** | Runtime validation for every content document
* **Vercel** | Deployment
* **Git & GitHub** | Version control

## Developer Stack

My broader technical stack includes:

* Go
* Python
* TypeScript
* React
* Next.js
* PostgreSQL

## Current Direction

* Full Stack Web Development
* AI Integration
* Cybersecurity
* Artificial Intelligence and Machine Learning
* Networking
* Software Engineering

## Projects

Each substantial project has its own case-study page covering:

* The problem being solved
* The implementation
* Technologies used
* Technical decisions
* Key features
* Source code
* Live demonstrations where available

Projects are added and edited from `/admin`. See **Admin control plane** below.

---

## Admin control plane

Everything on the public site — identity, hero copy, about text, the terminal
card, section headings, technologies, current focus, and every project — is
edited at `/admin` and published as a commit to this repository. Vercel rebuilds
the site from that commit, so there is no separate CMS, no database and no new
hosting to pay for.

### Setup

**1. Add the secrets.** Copy `.env.example` to `.env.local` and fill it in:

```bash
cp .env.example .env.local
```

**2. Generate the admin password hash.** The password itself is never stored:

```bash
node scripts/hash-password.mjs "your password"
# ADMIN_PASSWORD_HASH=scrypt$8f3a...$b21c...
```

**3. Generate a session secret** used to sign the login cookie:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

**4. Create a GitHub token.** A **fine-grained personal access token** with
`Contents: write` on this repository only — no access to anything else. That is
what lets a save become a commit.

**5. Set the publishing variables** in `.env.local`, then run `npm run dev` and
open `/admin`.

On Vercel, add the same variables to the project's environment settings. The
admin settings page inside `/admin` shows which ones are present, so there is no
need to cross-reference this file against the dashboard.

### Required variables

| Variable | Purpose |
| --- | --- |
| `ADMIN_PASSWORD_HASH` | `scrypt$<saltHex>$<hashHex>`. The password for `/admin`. |
| `ADMIN_SESSION_SECRET` | Signs the session cookie. Rotating it signs you out. |
| `GITHUB_TOKEN` | Fine-grained token with `Contents: write` on this repo only. |
| `GITHUB_REPO_OWNER` | `saleke` |
| `GITHUB_REPO_NAME` | `portfolio` |
| `GITHUB_BRANCH` | Branch to commit to. Defaults to `main`. |

### Optional variables

| Variable | Purpose |
| --- | --- |
| `ADMIN_COMMIT_AUTHOR` | Commit author name. Defaults to the token owner. |
| `ADMIN_COMMIT_EMAIL` | Commit author email. |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Shows the email channel on the site. |
| `NEXT_PUBLIC_CONTACT_PHONE` | Shows the phone channel on the site. |
| `NEXT_PUBLIC_CONTACT_GITHUB_URL` | Shows the GitHub channel. |
| `NEXT_PUBLIC_CONTACT_LINKEDIN_URL` | Shows the LinkedIn channel. |
| `NEXT_PUBLIC_SITE_URL` | Only for a custom domain or non-Vercel host. |

Contact details are environment variables rather than admin-editable on
purpose: a phone number and a personal address should not live in a public
repository's history. A channel with no value is **omitted entirely** — the site
derives the list, so a dead `mailto:` or `tel:` link is not constructible.

> The `NEXT_PUBLIC_*` values are read while the site is **built**, because the
> public pages are prerendered. On Vercel that is automatic — saving an
> environment variable triggers a rebuild — but locally you must restart
> `npm run build` for a change to appear.

### How publishing works

1. The form posts to a **Server Action**, which validates every field with Zod.
2. The action fetches the current document from the branch head and merges only
   the fields that form owns.
3. The project JSON **and every new image go into a single commit** via the
   GitHub Git Data API, so a project can never reference an image that was never
   written.
4. Vercel sees the commit on the connected branch and redeploys.

**A save takes one to three minutes to appear.** That is the cost of using the
repository as the database, and the admin UI says so on every save rather than
implying the change is already live. The overview page lists recent commits so
you can see the deploy that followed.

### Rolling back

Because content is versioned like everything else, a revert is a revert:

```bash
git revert <sha>   # then push; Vercel redeploys
```

or revert the commit from the GitHub UI. The admin overview links each recent
commit on GitHub, where this can be done without touching a terminal.

### Security notes

* The session is a stateless HMAC-signed token, `httpOnly`, `Secure`,
  `SameSite=Lax`, scoped to `path=/admin`, expiring after 8 hours. There is no
  session store, so nothing to run and nothing that breaks on redeploy.
* **Every Server Action re-checks the session itself.** A Server Action is a
  public HTTP endpoint whose id is not a secret, so the page guard is
  convenience, not the boundary.
* Failed logins are counted in a signed cookie: five attempts per 15 minutes.
  This is deliberately labelled best-effort — discarding cookies restores the
  budget. The real cost of brute force here is scrypt, which makes each attempt
  deliberately expensive.
* `/admin` is `noindex`, carries an `X-Robots-Tag` header, and is disallowed in
  `robots.txt`.
* Uploads are validated from their **magic bytes**, never the declared
  `Content-Type`. SVG is rejected outright: it is an XML document that can carry
  script, so serving one from the site's own origin is stored XSS.
* Images are resized and re-encoded to WebP in the browser before upload, which
  keeps every request under Vercel's function body limit.

---

## Content model

Content lives in `content/`, validated by Zod at build time. A malformed
document **fails `next build`** rather than shipping.

```text
content/
├── site.json           # identity, hero, about, terminal, section headings
├── technologies.json   # grouped technology lists
├── focus.json          # current direction and what it involves
└── projects/
    ├── ascii-art-web.json
    ├── portfolio.json
    └── school-website.json
```

The **filename is the slug**. `content/projects/portfolio.json` is served at
`/projects/portfolio`; renaming the file renames the URL.

Zod in `lib/content-schema.ts` is the single source of truth. Types are derived
from it, so the schema and the types cannot drift apart.

Check the content without a full build:

```bash
npm run content:check
```

---

## Running Locally

```bash
git clone https://github.com/saleke/portfolio.git
cd portfolio
npm install
npm run dev
```

Open <http://localhost:3000>. The admin is at <http://localhost:3000/admin>.

The public site works with no environment variables at all — the admin simply
reports that it is not configured. Nothing on the public pages depends on the
admin being set up.

## Scripts

| Command | Does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run content:check` | Validate `content/` against the schemas |
| `node scripts/hash-password.mjs "…"` | Generate `ADMIN_PASSWORD_HASH` |

## Production Build

```bash
npm run build
npm run start
```

## Deployment

The project is configured for Vercel. Import the GitHub repository and deploy
with the default Next.js settings. Vercel supplies the production URL used by
the site metadata, so `NEXT_PUBLIC_SITE_URL` is only needed for a custom domain
or another host.

Set the admin and publishing variables from the table above in the project's
environment settings. Vercel redeploys on every push to the connected branch,
which is what makes an admin save go live.

## Project Structure

```text
.
├── app/
│   ├── ..../              # the control plane
│   │   ├── ..../          # outside the auth guard
│   │   └── (dashboard)/    # inside it
│   └── projects/[slug]/    # public case studies
├── components/
│   ├── admin/              # admin-only components
│   └── *.tsx               # public components
├── content/                # all editable content
├── data/                   # env-backed config (contact channels, site URL)
├── lib/                    # schema, loaders, auth, GitHub, images
├── public/uploads/         # images published through the admin
├── scripts/                # hash-password, validate-content
├── .env.example
└── TODO.md                 # design decisions, defects found, limitations
```

## Status

Actively maintained and updated as I build and document new projects.

## Author

**Solomon Aleke (`saleke`)**

Software Developer in Training

GitHub: [@saleke](https://github.com/saleke)

---

Built with Next.js, React, TypeScript, and Tailwind CSS.