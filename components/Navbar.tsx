"use client";

import { useState } from "react";
import Link from "next/link";
import { profile } from "@/data/profile";

const links = [
  ["About", "/#about"],
  ["Projects", "/#projects"],
  ["Stack", "/#stack"],
  ["GitHub", profile.githubUrl],
  ["LinkedIn", profile.linkedinUrl],
  ["Contact", "/#contact"],
] as const;

export function Navbar() {
  const [open, setOpen] = useState(false);
  return (
    <header className="site-header">
      <div className="container nav-wrap">
        <Link className="brand" href="/" onClick={() => setOpen(false)} aria-label="Solomon Aleke home">
          <span className="brand-mark">S</span>
          <span className="brand-name-shell" aria-hidden="true"><span className="brand-name">Aleke</span></span>
        </Link>
        <button className="menu-toggle" type="button" aria-expanded={open} aria-controls="site-nav" onClick={() => setOpen((value) => !value)}>
          <span className="sr-only">{open ? "Close" : "Open"} navigation</span>
          <span aria-hidden="true">{open ? "×" : "☰"}</span>
        </button>
        <nav id="site-nav" className={`site-nav ${open ? "is-open" : ""}`} aria-label="Primary navigation">
          {links.map(([label, href]) => href.startsWith("http") ? (
            <a key={label} href={href} onClick={() => setOpen(false)} target="_blank" rel="noreferrer">{label}</a>
          ) : (
            <Link key={label} href={href} onClick={() => setOpen(false)}>{label}</Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
