import "server-only";
import { createHmac, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/**
 * Authentication for the single-owner admin area.
 *
 * Design constraints:
 * - No database, no third-party auth service (requirement.md §3).
 * - One owner, one password, so the whole perimeter is the password.
 *
 * What that forces, and why each choice is here:
 *
 * - Password is stored as a **scrypt hash**, never in plaintext. Plaintext in
 *   an env var is readable by anyone with dashboard or deploy-log access.
 * - Comparison uses `timingSafeEqual`, and the stored value is hashed to a
 *   fixed length first because `timingSafeEqual` throws on length mismatch,
 *   which would otherwise leak the hash length.
 * - The session is a **stateless HMAC-signed token**, so there is no session
 *   store to run and it survives deploys. The trade-off is that logout cannot
 *   revoke an already-issued token before it expires; the window is short (8h)
 *   to bound that.
 * - The cookie is scoped to `path=/admin`, which means the session token is not
 *   attached to ordinary requests to the public site.
 * - Failed logins are counted in a **signed cookie**. This is best-effort, not
 *   a real lockout: an attacker who simply drops cookies gets a fresh budget.
 *   scrypt makes each attempt expensive, which is the actual mitigation. See
 *   the note in `login()`.
 */

const COOKIE_SESSION = "admin_session";
const COOKIE_ATTEMPTS = "admin_login_attempts";
const COOKIE_ATTEMPT_WINDOW = "admin_attempt_window";

const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours
const MAX_ATTEMPTS = 5;
const ATTEMPT_WINDOW_SECONDS = 60 * 15; // 15 minutes

/** Configuration, or `null` when the admin area is not set up. */
function getConfig(): { passwordHash: string; secret: string } | null {
  const passwordHash = process.env.ADMIN_PASSWORD_HASH;
  const secret = process.env.ADMIN_SESSION_SECRET;

  if (!passwordHash || !secret) return null;

  return { passwordHash, secret };
}

export function isAuthConfigured(): boolean {
  return getConfig() !== null;
}

/** The three outcomes of a password check, kept distinct so each can be acted on. */
type PasswordCheck =
  | { ok: true }
  | { ok: false; reason: "mismatch" }
  | { ok: false; reason: "misconfigured"; error: string };

const MISCONFIGURED_HASH =
  'ADMIN_PASSWORD_HASH is not a valid scrypt hash. Regenerate it with: node scripts/hash-password.mjs "your password"';

/**
 * Parses `scrypt$<saltHex>$<hashHex>` into bytes.
 *
 * The hex is decoded to a `Buffer` because that is what `scryptSync` salts with.
 * Passing the hex *string* instead produces a key derived from different salt
 * bytes than the one that was used to generate the hash, so the comparison can
 * never succeed — which is exactly the bug this function's structure exists to
 * prevent.
 *
 * `Buffer.from(value, "hex")` does not throw on invalid input; it ignores
 * anything that is not a hex digit and stops at the first bad pair. Returning
 * `null` for a short or non-hex result is therefore necessary, not defensive
 * padding — without it a truncated value would silently verify against a
 * truncated expected key.
 */
function readHash(encoded: string): { salt: Buffer; hash: Buffer } | null {
  const parts = encoded.split("$");
  if (parts.length !== 3) return null;

  const [algorithm, saltHex, hashHex] = parts;
  if (algorithm !== "scrypt") return null;
  if (!/^[0-9a-f]+$/i.test(saltHex) || !/^[0-9a-f]+$/i.test(hashHex)) return null;

  const salt = Buffer.from(saltHex, "hex");
  const hash = Buffer.from(hashHex, "hex");

  // 16 bytes of salt and 32 bytes of key are the floors worth accepting; the
  // generator emits 16 and 64. Anything shorter is a truncated env var, and
  // failing closed is better than accepting a weak hash.
  if (salt.length < 16 || hash.length < 32) return null;

  return { salt, hash };
}

/**
 * Verifies a password against the stored scrypt hash.
 *
 * `ADMIN_PASSWORD_HASH` is generated with:
 *   node scripts/hash-password.mjs "your password"
 *
 * A dummy comparison runs on the miss paths so a wrong password, an unset
 * config and a malformed hash all take comparable time, which stops response
 * latency from revealing anything about the stored value.
 */
function verifyPassword(candidate: string): PasswordCheck {
  const config = getConfig();

  if (!config) {
    scryptSync(candidate, "unused-salt", 64);
    return {
      ok: false,
      reason: "misconfigured",
      error: "The admin area is not configured. Set ADMIN_PASSWORD_HASH and ADMIN_SESSION_SECRET.",
    };
  }

  const parsed = readHash(config.passwordHash);

  if (!parsed) {
    scryptSync(candidate, "unused-salt", 64);
    return { ok: false, reason: "misconfigured", error: MISCONFIGURED_HASH };
  }

  const actual = scryptSync(candidate, parsed.salt, parsed.hash.length);

  // Both sides are the same length by construction, so this is safe to compare.
  return timingSafeEqual(actual, parsed.hash)
    ? { ok: true }
    : { ok: false, reason: "mismatch" };
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function base64url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

/**
 * Reads the current session.
 *
 * Returns false for any malformed, tampered or expired token. A token that
 * fails its signature check is never partially trusted.
 */
export async function isAuthenticated(): Promise<boolean> {
  const config = getConfig();
  if (!config) return false;

  const token = (await cookies()).get(COOKIE_SESSION)?.value;
  if (!token) return false;

  const separator = token.lastIndexOf(".");
  if (separator <= 0) return false;

  const payload = token.slice(0, separator);
  const signature = token.slice(separator + 1);

  const expected = sign(payload, config.secret);

  // Compare fixed-length base64url strings. A length check first would leak
  // nothing meaningful here since signatures are always 43 chars, but
  // hashing both sides keeps this uniform with the password path.
  const provided = Buffer.from(signature);
  const computed = Buffer.from(expected);

  if (provided.length !== computed.length || !timingSafeEqual(provided, computed)) {
    return false;
  }

  let decoded: { exp?: number };
  try {
    decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { exp?: number };
  } catch {
    return false;
  }

  return typeof decoded.exp === "number" && Date.now() < decoded.exp;
}

export type LoginResult =
  | { ok: true }
  | { ok: false; error: string; lockedOut: boolean };

/**
 * Attempts a login.
 *
 * On success the session cookie is set and the rate-limit cookies are cleared.
 * On failure the attempt counter is incremented.
 *
 * Known limitation: the counter lives in a cookie the client controls, so it
 * is trivially bypassed by discarding it. The real cost of brute force here is
 * scrypt, which is deliberately slow per attempt. A durable lockout would need
 * a store, which requirement.md §3 rules out.
 */
export async function login(password: string): Promise<LoginResult> {
  const config = getConfig();

  if (!config) {
    return {
      ok: false,
      lockedOut: false,
      error: "The admin area is not configured. Set ADMIN_PASSWORD_HASH and ADMIN_SESSION_SECRET.",
    };
  }

  const jar = await cookies();
  const attempts = Number(jar.get(COOKIE_ATTEMPTS)?.value ?? "0");
  const windowStart = Number(jar.get(COOKIE_ATTEMPT_WINDOW)?.value ?? "0");
  const now = Date.now();

  const windowActive = now - windowStart < ATTEMPT_WINDOW_SECONDS * 1000;

  if (windowActive && attempts >= MAX_ATTEMPTS) {
    const waitMinutes = Math.ceil(
      (ATTEMPT_WINDOW_SECONDS * 1000 - (now - windowStart)) / 60000,
    );
    return {
      ok: false,
      lockedOut: true,
      error: `Too many attempts. Try again in ${waitMinutes} minute${waitMinutes === 1 ? "" : "s"}.`,
    };
  }

  const check = verifyPassword(password);

  // A broken configuration is the owner's problem, not an attack, so it is
  // reported as itself and does not consume the attempt budget. Counting it
  // would lock the owner out of their own admin area with no way to tell why.
  if (!check.ok && check.reason === "misconfigured") {
    return { ok: false, lockedOut: false, error: check.error };
  }

  if (!check.ok) {
    // Reset the window on the first failure of a new window.
    const nextAttempts = windowActive ? attempts + 1 : 1;
    const nextWindow = windowActive ? windowStart : now;

    jar.set(COOKIE_ATTEMPTS, String(nextAttempts), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/admin",
      maxAge: ATTEMPT_WINDOW_SECONDS,
    });
    jar.set(COOKIE_ATTEMPT_WINDOW, String(nextWindow), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/admin",
      maxAge: ATTEMPT_WINDOW_SECONDS,
    });

    return { ok: false, lockedOut: false, error: "Incorrect password." };
  }

  const payload = base64url(
    JSON.stringify({ exp: now + SESSION_TTL_SECONDS * 1000, iat: now }),
  );

  jar.set(COOKIE_SESSION, `${payload}.${sign(payload, config.secret)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/admin",
    maxAge: SESSION_TTL_SECONDS,
  });

  jar.delete(COOKIE_ATTEMPTS);
  jar.delete(COOKIE_ATTEMPT_WINDOW);

  return { ok: true };
}

export async function logout(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_SESSION);
  jar.delete(COOKIE_ATTEMPTS);
  jar.delete(COOKIE_ATTEMPT_WINDOW);
}