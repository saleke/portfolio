# Admin Control Plane — TODO

Goal: the owner can add and edit projects (with optional images) and every piece
of public-facing copy from a password-protected `/admin`, without editing code.

**Status: complete and verified.** All phases done; lint, typecheck, content
validation and build are green; 120 end-to-end checks pass against a running
production server.

## Rules this codebase now holds itself to

These were each learned the hard way, and each is a trap that a linter and a
type checker both sit silently through:

- **Every key `collectFields` reads must be rendered by the form that submits
  it.** A key the form never renders is silently dropped from the document on
  every save, or worse, read as `undefined` and rejected forever.
- **A `"use server"` module may only export async functions.** Types and
  constants go in a sibling module — `app/admin/state.ts` exists for exactly
  this reason.
- **One object, one CSS declaration.** When a second rule appears for something
  that already has one, the correct move is to widen the selector, not to write
  the rule again. Three rules for one card, ~150 lines apart, is how a design
  system stops being one.
- **One status treatment.** Forms use `FormStatus`. A form that needs its own
  error markup needs a reason, and it is not "the shared one did not fit".
- **A class that renders must have a rule; a rule nobody renders is cruft.**
  Checkable automatically, and it is how the unstyled sign-in page was found.
- **Environment-derived configuration cannot be read at build time and asserted
  at runtime.** They are two different environments.

## Constraints honoured

From `requirement.md`:
- §2  Stack limited to Next.js / React / TypeScript / Git / GitHub / Vercel
- §3  Content stays in the repo (the original "no database" rule was lifted by
      the owner during this work; the git-based write path still means no
      database, no vendor and no new hosting)
- §3  No separate backend / auth system / CMS — the publishing layer lives inside
      Next.js as Server Actions
- §3  Vercel Hobby only, no Cloudflare
- §27 Do not over-engineer
- §36 Never fabricate; surface work honestly

## Architecture decision

Content stays in the repo; only *granularity* and the *write path* change.

- `data/projects.ts` (one array) → `content/projects/<slug>.json`, one file per
  project, **the filename is the slug**. Zod is the single source of truth, so
  type and schema cannot drift; invalid content fails `next build`.
- Other documents: `content/site.json`, `content/technologies.json`,
  `content/focus.json`.
- Read path: cached loaders return the same shapes, so every presentational
  component kept working.
- Write path: `/admin` form → Server Action → **GitHub Git Data API** atomic
  commit → Vercel auto-redeploys. Vercel is already connected to the repo, so no
  deploy hook and no extra secret.
- Images: resized and re-encoded to WebP **client-side**, committed to
  `public/uploads/` in the same atomic commit as the JSON.

Chose the Git Data API (blobs → tree → commit → ref) over the Contents API
because the Contents API commits one file per request, which would let a project
and its images land in separate commits — and therefore separate deploys.

## Tasks

### Phase 0 — baseline
- [x] Read all source, `requirement.md`, verify build
- [x] Confirm baseline: 8 static routes, 3 SSG project pages, clean build
- [x] Identify existing defects (see "Defects found")

### Phase 1 — content layer
- [x] `lib/schema.ts` — Zod schema is the single source of truth; `Project`
      derived from it, so type and schema cannot drift
- [x] `lib/content-schema.ts` — schemas for the site/technology/focus documents
- [x] `lib/content.ts` — cached loaders that fail the build on invalid content
- [x] `lib/projects.ts` — reads the directory, derives the slug from the
      filename, parses, validates, sorts deterministically, tolerates a missing
      directory
- [x] Migrate the 3 existing projects to `content/projects/*.json`, output
      byte-for-byte equivalent
- [x] Repoint `Projects.tsx`, `app/projects/[slug]/page.tsx`, `app/page.tsx`,
      `sitemap.ts`
- [x] Delete `data/projects.ts` and `data/technologies.ts`
- [x] `scripts/validate-content.mjs` + `npm run content:check` for pre-commit
      validation without a full build

### Phase 2 — publish UI
- [x] `app/admin/login` + stateless session auth (HMAC-signed cookie, no DB)
- [x] `app/admin` dashboard: counts, recent commits, entry points
- [x] Project list with reorder, edit, delete (confirmed by title)
- [x] `/admin/projects/new` and `/admin/projects/[slug]` — one form both ways
- [x] Client-side image resize to WebP + preview + alt text + dimensions
- [x] Site copy editor, tabbed via `?tab=` — identity, hero, about, terminal,
      sections
- [x] Technology groups and focus/direction editors
- [x] Settings page documenting the env vars and the publish flow
- [x] Sidebar app shell with a mobile drawer, 19 hand-drawn inline SVG icons,
      and the full design system in `app/globals.css`
- [x] Route groups so `app/admin/layout.tsx` renders the shell and
      `app/admin/(dashboard)/layout.tsx` holds the auth guard — `/admin/login`
      stays reachable while signed out

### Phase 3 — write path
- [x] `lib/github.ts` — multi-file atomic commit, 409 retry, typed `GitHubError`
- [x] Server Actions: `createProject`, `updateProject`, `deleteProject`,
      `reorderProjects`, plus seven site-copy actions
- [x] Auth enforced **inside every action** (a Server Action is a public HTTP
      endpoint; its id is not a secret)
- [x] Slug/path derived server-side only, never trusted from form input
- [x] **Read-before-write on every mutation**: fetch the current document from
      the branch head, merge only the fields this form owns, write back
- [x] Image validation from magic bytes, size cap, SVG and GIF rejected
- [x] Bounded concurrency (6) on GitHub read calls

### Phase 4 — hardening
- [x] Login rate limiting (cookie-backed; see Known limitations)
- [x] `/admin` `noindex` + `X-Robots-Tag` + `robots.ts` disallow
- [x] Public site unaffected when admin env vars are missing (fail soft, with
      the login page explaining what to set)
- [x] Build fails loudly on malformed JSON — never ship broken content
- [x] `next.config.ts`: `/uploads/:path*` security headers,
      `serverActions.bodySizeLimit` under `experimental`, image qualities
- [x] Audit: lint + typecheck + content check + build + 48 runtime checks

### Phase 5 — defects fixed during analysis and implementation
- [x] Dead `liveUrl`, empty-profile dead links, deprecated `priority`, stray
      975 KB PNG, styling-by-string in `CurrentlyLearning.tsx`
- [x] `eyebrow` numbering auto-derived from position
- [x] `focus.accent` boolean replaces the latent `label === "Technical interests"`
      bug
- [x] `publishedAt` removed as a dead, data-losing field

## Defects found during analysis

1. **`liveUrl` declared but never rendered**, though spec §14 requires a
   live/demo link where available.
2. **Empty profile fields produce dead links** — `mailto:`/`tel:`/GitHub hrefs
   built from empty values.
3. **`priority` is deprecated in Next 16**; the shipped `get-img-props.js`
   throws when both `preload` and `priority` are set.
4. **Stray 975 KB PNG** tracked at the repo root, outside `public/`.
5. `profile.availability` read "Learning and building" against spec §39.

## Defects found during implementation

These were all silent-writer-class bugs: the build was green and the UI looked
right, but the thing being verified did not work.

6. **`collectFields` parsed a non-existent `order` field.** It produced `NaN`,
   Zod rejected every save, and **no project could ever be published**. Position
   is now derived server-side from the repository.
7. **The admin routes were prerendered as static.** `isAuthenticated()`
   short-circuits to `false` without env vars, which Next reads as "constant", so
   the pages were cached and the guard never ran at request time. Fixed with
   `force-dynamic`.
8. **`createBlob` double-base64-encoded image bytes**, so every uploaded image
   was corrupt. It now accepts `string | Buffer`.
9. **`verifyPassword` salted with the hex string instead of the decoded bytes.**
   `scripts/hash-password.mjs` hashes with a 16-byte `Buffer` salt; the verifier
   passed the 32-character hex *string*. scrypt derived a key from different
   salt bytes, so **the admin login could never succeed**. Verified directly:
   decoded salt → match, hex-string salt → no match. `readHash()` now decodes
   and validates the hex, fails closed on a malformed value, and reports a
   misconfigured hash as itself — without consuming an attempt, so a typo in an
   env var cannot lock the owner out of their own admin area.
10. **`TechnologyGroupsInput` parsed on blur.** Pressing Enter instead of
    clicking away lost the edit, and joining a parsed array back to the textarea
    value would have swallowed a trailing comma, making the second technology
    unreachable by keyboard. It now holds the raw text and parses on the way out.
11. **Reordering also sent a `publishedAt` field the form never rendered**, which
    would have stripped the stored value on every save. The field is now gone,
    since nothing rendered it either.
12. **`publishedAt` was dead.** It was collected and stored but never displayed.
    Removed from the schema rather than left as a field the owner could set and
    no visitor could see.
13. **A `"use server"` module may only export async functions.** Re-exporting
    `IDLE_STATE` from `app/admin/actions.ts` broke the whole module and removed
    every export. `ActionState`/`IDLE_STATE` now live in `app/admin/state.ts`.

## Defects found during the final audit

These were invisible to the compiler, the linter and every functional test.
They were found by rendering every admin page and checking the CSS against the
markup, which is the only way a stylesheet hole ever announces itself.

14. **The sign-in page had no layout at all.** It renders
    `.admin-main.admin-main-centered`, and **neither class had a rule**, so the
    panel sat flush to the top-left of the viewport. The first thing the owner
    ever sees was the one page nobody had styled.
15. **Two visual treatments for the same message.** `FormStatus` renders a
    bordered, icon-bearing panel; four forms (project form, uploader, delete
    confirmation, login) hand-rolled `<p className="admin-error">`, which was
    plain red text with no border and no icon. The same failure looked different
    depending on which form raised it. All of them use `FormStatus` now, and
    `.admin-error`/`.admin-success` are deleted so the drift cannot come back.
    The live-region role was also wrong: every status announced politely,
    including errors, which should interrupt.
16. **The same card was styled three times.** `.admin-fieldset`,
    `.admin-section` and `.admin-sectioncard` were three separate rules for one
    object at three different gap and padding values, ~150 lines apart. All
    three are genuinely used, so they are now one declaration with three
    selectors — they cannot drift apart.
17. **The sign-out button rendered in the wrong typeface.** It is a `<button>`
    so it works without JavaScript, and `<button>` does not inherit `font-family`
    from the page. It sat in the same sidebar column as the links above it,
    visibly in a different face. `.admin-nav-button { font: inherit }`.
18. **`X-Robots-Tag` was claimed but never sent.** The admin had `noindex`
    metadata, which only helps a crawler that parses HTML. The header is now
    emitted for `/admin/:path*` as well, so a bot that ignores both the meta tag
    and `robots.txt` still cannot index it.
19. **Two dead rules** (`.admin-form-foot`, `.admin-field-inline`) left over
    from an earlier revision of the project form.

### How these were found, and why it is worth recording

A check that scrapes `className` values out of component source produces false
positives and false negatives — it cannot see template-literal composition, and
it reports literal strings like `"completed"` as if they were classes. Scraping
the **rendered HTML of every admin page** does not. That check found 14, 16, 17
and 19 immediately, and pointed at 15.

The two states a plain `GET` never reaches — a rejected save, and a control
hidden behind a click — need their own checks. Field-level error markup is
applied after hydration, because `useActionState` holds the action's return
value on the client, so the POST response HTML cannot contain `has-error`. What
is asserted instead is that the field errors *reach* the client and that the
classes which render them are wired in the component and defined in the
stylesheet. Claiming more than that would have been dishonest.

One trap worth recording: a probe that scrapes the bound action state out of
React's `value="..."` attribute gets an **HTML-escaped** string. Handing that
to Next unescaped produces a `SyntaxError` and a 500 that looks exactly like an
application bug. It cost an hour. The state is now reconstructed as literal
JSON rather than scraped.

## Known limitations

- **Publishing is not instant.** A save is a commit; the site updates when the
  rebuild finishes, typically one to three minutes. The UI says so on every
  save, and the overview page lists recent commits.
- **Last write wins on a whole document.** Two admins on two tabs can overwrite
  each other. Acceptable for one owner; a durable lockout or field-level merge
  would need a store.
- **Login rate limiting is cookie-backed**, so discarding cookies restores the
  budget. It raises the cost of a casual attempt, not of a determined one. The
  real mitigation is that scrypt makes every attempt deliberately expensive.
- **The session token cannot be revoked** before it expires, because it is
  stateless. The 8-hour TTL bounds that; logging out deletes the cookie only.
- **Logout cannot invalidate an issued token** stolen before logout, for the
  same reason.

## Verification

Runtime checks run against `next start` on a production build with an
intentionally invalid `GITHUB_TOKEN`, so the write path is reached and then fails
at the network call — the furthest it can be taken without real credentials.

| Suite | Checks | Covers |
| --- | ---: | --- |
| auth gate & validation | 19 | auth gate, validation ordering, per-field errors, traversal rejection, that no failure escapes as a 500 |
| lists & images | 12 | the client list editors against the server parser, image magic bytes, a lying `Content-Type`, SVG refusal, size limits |
| login | 17 | wrong/right password, cookie flags, tamper rejection, expiry, the limiter blocking on attempt six |
| route audit | 41 | every guarded route redirects when signed out, every page renders when signed in, `X-Robots-Tag`, `robots.txt`, sitemap, 404s, contact channels, upload security headers |
| UI states | 30 | the sign-in frame, the unified status treatment, field-error wiring, list and uploader classes, click-revealed classes |

**120 checks, all passing.**

```
npm run lint && npx tsc --noEmit && npm run content:check && npm run build
```

### Known gaps in the verification

Stated rather than papered over:

- **The GitHub write is never exercised against the real API.** The token is
  intentionally invalid, so a save is proved all the way to the network call and
  no further. The first real save needs watching.
- **No project has images**, so the uploader's existing-image grid, the reorder
  thumbnail and image rendering on a case study have never been seen rendered.
  Their rules and wiring are asserted; their appearance is not.
- **The visual result was never looked at.** No browser was available, so the
  layout is verified structurally — every rendered class has a rule — not
  visually. Someone should open `/admin` and look at it before shipping.
- **`NEXT_PUBLIC_*` is read at build time**, because the public pages are
  prerendered. On Vercel that is automatic, since saving a variable triggers a
  rebuild. Locally you must re-run `npm run build`. The README says so.
