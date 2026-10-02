import { contact } from "@/data/profile";
import { getSiteCopy } from "@/lib/content";

export async function Footer() {
  const site = await getSiteCopy();

  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <span>
          {/* Rendered via `new Date()` on the server, so the year updates on the
              next deploy rather than per request. */}
          © {new Date().getFullYear()} {site.name}
        </span>
        <span>{site.title}</span>
        {/* Shown only when configured, so the footer can never display a bare
            `mailto:` with no address. */}
        {contact.email ? <a href={`mailto:${contact.email}`}>{contact.email}</a> : null}
      </div>
    </footer>
  );
}