"use client";

import { useState, type CSSProperties } from "react";
import Link from "next/link";
import { contact } from "@/data/profile";

/**
 * Splits a full name into the two pieces the brand mark uses.
 *
 * The mark has always been the first initial plus the surname ("S" + "Aleke"),
 * which is a deliberate branding choice rather than a truncation, so it is
 * preserved here instead of showing the first name in full.
 */
function splitName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0] ?? name;
  const last = parts.length > 1 ? parts[parts.length - 1] : first;
  return { initial: first.charAt(0).toUpperCase(), surname: last };
}

export function Navbar({ name }: { name: string }) {
  const [open, setOpen] = useState(false);
  const { initial, surname } = splitName(name);

  // The surname is revealed by a typing animation inside a fixed-width window,
  // so both the window width and the animation's step count have to match the
  // real length. Deriving them here means changing the name in the admin cannot
  // clip the last letter or mis-count the steps.
  const brandStyle = {
    "--brand-ch": `${surname.length}ch`,
    "--brand-steps": surname.length,
  } as CSSProperties;

  // The GitHub entry is included only when a URL is configured, so the nav can
  // never contain a link with an empty href. An unreachable platform entry is
  // worse than a missing one.
  const links = [
    ["About", "/#about"],
    ["Projects", "/#projects"],
    ["Stack", "/#stack"],
    ...(contact.githubUrl ? ([["GitHub", contact.githubUrl]] as const) : []),
    ["Contact", "/#contact"],
  ] as const;

  return (
    <header className="site-header">
      <div className="container nav-wrap">
        <Link
          className="brand"
          href="/"
          style={brandStyle}
          onClick={() => setOpen(false)}
          aria-label={`${name} home`}
        >
          <span className="brand-mark">
            {/* The letter is its own element so only it turns. Rotating the
                wrapper would take the border with it, and a square looks the
                same at 0, 90, 180 and 270 degrees, so the box would appear
                frozen while the letter spun inside it. */}
            <span className="brand-mark-letter">{initial}</span>
          </span>
          <span className="brand-name-shell" aria-hidden="true">
            <span className="brand-name">{surname}</span>
          </span>
        </Link>

        <button
          className="menu-toggle"
          type="button"
          aria-expanded={open}
          aria-controls="site-nav"
          onClick={() => setOpen((value) => !value)}
        >
          <span className="sr-only">{open ? "Close" : "Open"} navigation</span>
          <span aria-hidden="true">{open ? "×" : "☰"}</span>
        </button>

        <nav
          id="site-nav"
          className={`site-nav ${open ? "is-open" : ""}`}
          aria-label="Primary navigation"
        >
          {links.map(([label, href]) =>
            href.startsWith("http") ? (
              <a
                key={label}
                href={href}
                onClick={() => setOpen(false)}
                target="_blank"
                rel="noreferrer"
              >
                {label}
              </a>
            ) : (
              <Link key={label} href={href} onClick={() => setOpen(false)}>
                {label}
              </Link>
            ),
          )}
        </nav>
      </div>
    </header>
  );
}