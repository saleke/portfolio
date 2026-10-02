import Image from "next/image";
import Link from "next/link";
import { contact } from "@/data/profile";
import { getSiteCopy } from "@/lib/content";
import { TerminalCard } from "@/components/TerminalCard";

export async function Hero() {
  const site = await getSiteCopy();
  const { hero, title } = site;

  // The visible heading is split across lines, but screen readers should hear it
  // as one sentence. The aria-label is assembled from the same content that is
  // rendered, so the two cannot drift apart.
  const spokenTitle = [title, ...hero.positioning].join(" | ");

  return (
    <section className="hero container" aria-labelledby="hero-title">
      <div className="hero-copy">
        <p className="kicker">
          <span className="status-dot" /> {hero.availability}
        </p>

        {hero.overline ? <p className="hero-overline">{hero.overline}</p> : null}

        <h1 id="hero-title" aria-label={spokenTitle}>
          <span className="title-line">{title}</span>
          {hero.positioning.map((line, index) => (
            <span className="title-line hero-title-detail" key={line}>
              <span className="hero-pipe">|</span>{" "}
              {/* The first positioning line is rendered as emphasis, matching
                  the original treatment of the primary language grouping. Keyed
                  on index rather than value so a repeated line still styles
                  correctly. */}
              {index === 0 ? <em>{line}</em> : line}
            </span>
          ))}
        </h1>

        <p className="hero-lede">{hero.lede}</p>

        <div className="stack-line" aria-label="Primary technology stack">
          {hero.stack.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>

        <div className="hero-actions">
          <Link className="button button-primary" href="#projects">
            {hero.primaryAction} <span aria-hidden="true">↗</span>
          </Link>

          {/* Hidden when no GitHub URL is configured, rather than linking to "" */}
          {contact.githubUrl ? (
            <a
              className="button button-secondary"
              href={contact.githubUrl}
              target="_blank"
              rel="noreferrer"
            >
              {hero.secondaryAction} <span aria-hidden="true">↗</span>
            </a>
          ) : null}
        </div>
      </div>

      <div className="hero-aside">
        <div className="portrait-frame">
          {/* `preload` replaced the deprecated `priority` prop in Next 16. This
              is the LCP image, so it must be preloaded rather than lazily
              discovered by the parser. */}
          <Image
            src={site.profileImage}
            alt={`Portrait of ${site.name}`}
            fill
            preload
            sizes="(max-width: 900px) 75vw, 34vw"
          />
        </div>
        <TerminalCard
          filename={site.terminal.filename}
          whoamiLabel={site.terminal.whoamiLabel}
          identity={site.terminal.identity}
          focusLabel={site.terminal.focusLabel}
          focus={site.terminal.focus}
          statusLabel={site.terminal.statusLabel}
        />
      </div>
    </section>
  );
}