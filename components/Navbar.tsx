"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
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
  const [activeSection, setActiveSection] = useState("");
  const { initial, surname } = splitName(name);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const brandStyle = {
    "--brand-ch": `${surname.length}ch`,
  } as CSSProperties;

  useEffect(() => {
    if (!open) return;

    const toggle = toggleRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const frame = window.requestAnimationFrame(() => {
      navRef.current?.querySelector<HTMLElement>("a")?.focus();
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }

      if (event.key === "Tab") {
        const elements = [
          toggleRef.current,
          ...Array.from(navRef.current?.querySelectorAll<HTMLElement>("a") ?? []),
        ].filter((element): element is HTMLElement => element !== null);
        const first = elements[0];
        const last = elements.at(-1);

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      toggle?.focus();
    };
  }, [open]);

  useEffect(() => {
    const sections = ["about", "projects", "stack", "contact"]
      .map((id) => document.getElementById(id))
      .filter((section): section is HTMLElement => section !== null);
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActiveSection(visible.target.id);
      },
      { rootMargin: "-20% 0px -65%", threshold: [0, 0.15, 0.4] },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

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
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <header className="site-header" id="top">
        <div className="container nav-wrap">
          <Link
            className="brand"
            href="/"
            style={brandStyle}
            onClick={() => setOpen(false)}
            aria-label={`${name} home`}
          >
            <span className="brand-mark">{initial}</span>
            <span className="brand-name-shell" aria-hidden="true">
              <span className="brand-name">{surname.toUpperCase()}</span>
            </span>
          </Link>

          <button
            ref={toggleRef}
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
            ref={navRef}
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
                <Link
                  key={label}
                  href={href}
                  className={href.endsWith(`#${activeSection}`) ? "is-active" : undefined}
                  aria-current={href.endsWith(`#${activeSection}`) ? "location" : undefined}
                  onClick={() => setOpen(false)}
                >
                  {label}
                </Link>
              ),
            )}
          </nav>
        </div>
      </header>
      {open ? (
        <button
          className="site-nav-scrim"
          type="button"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
