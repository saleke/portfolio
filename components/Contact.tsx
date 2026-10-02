import { buildContactLinks } from "@/data/profile";
import { SectionHeading } from "@/components/SectionHeading";
import { getSiteCopy } from "@/lib/content";

export async function Contact() {
  const site = await getSiteCopy();
  const links = buildContactLinks(site.codeName);

  return (
    <section
      className="section contact-section container"
      id="contact"
      aria-labelledby="contact-title"
    >
      <SectionHeading
        id="contact-title"
        index={site.sections.contact.index}
        title={site.sections.contact.title}
        intro={site.sections.contact.intro}
      />

      {/* Rows are derived from the channels that are actually configured, so a
          missing value can never render a dead `mailto:` or `tel:` link. */}
      <div className="contact-links">
        {links.length > 0 ? (
          links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              {...(link.external ? { target: "_blank", rel: "noreferrer" } : {})}
            >
              <span>{link.label}</span>
              <strong>{link.display}</strong>
              <span aria-hidden="true">↗</span>
            </a>
          ))
        ) : (
          <p className="contact-empty">
            Contact details are not configured yet. Set the contact environment variables to display
            them here.
          </p>
        )}
      </div>
    </section>
  );
}