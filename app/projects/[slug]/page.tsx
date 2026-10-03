import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { getProject, getProjectSlugs } from "@/lib/projects";
import { getSiteCopy } from "@/lib/content";
import { Prose } from "@/components/Prose";
import { ProjectShowcase } from "@/components/ProjectShowcase";

/**
 * Case-study page.
 *
 * Every known slug is prerendered at build time, so a published project is a
 * static file served from the CDN. `dynamicParams` is left at its default of
 * `true`, which means a slug added between builds is still rendered on first
 * request rather than returning a 404 until the next deploy.
 */
export async function generateStaticParams() {
  const slugs = await getProjectSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  // Read the owner name from content so the title suffix tracks the admin.
  const [project, site] = await Promise.all([getProject(slug), getSiteCopy()]);

  if (!project) {
    return { title: `Project not found | ${site.name}`, robots: { index: false } };
  }

  return {
    title: `${project.title} | ${site.name}`,
    description: project.description,
    openGraph: {
      title: `${project.title} | Solomon Aleke`,
      description: project.description,
      type: "article",
      images: project.images[0]
        ? [
            {
              url: project.images[0].src,
              width: project.images[0].width,
              height: project.images[0].height,
              alt: project.images[0].alt || `${project.title} screenshot`,
            },
          ]
        : undefined,
    },
  };
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // Both reads are independent and cached, so they resolve in one pass.
  const [project, site] = await Promise.all([getProject(slug), getSiteCopy()]);

  if (!project) notFound();

  return (
    <>
      <Navbar name={site.name} />
      <main className="project-detail container">
        <Link className="back-link" href="/#projects">
          ← Back to portfolio
        </Link>

        <header className="detail-header">
          <p className="project-eyebrow">{project.eyebrow}</p>
          <h1>{project.title}</h1>
          <p>{project.description}</p>
          <div className="tag-list">
            {project.technologies.map((technology) => (
              <span className="tag" key={technology}>
                {technology}
              </span>
            ))}
          </div>
        </header>

        {/*
          Screenshots sit between the header and the prose, rather than at the
          top and bottom of it. A visitor deciding whether to read should see the
          work first, and a screenshot inside the article competes with the
          paragraph it was placed next to. The component renders nothing when the
          project has no images, so this needs no guard.
        */}
        <ProjectShowcase images={project.images} title={project.title} />

        <div className="detail-layout">
          <article className="detail-content">
            {/*
              Each narrative section is a card rather than a full-bleed block of
              text divided by rules. The measure is capped well below the column
              so a long paragraph breaks at a readable width instead of running
              the full 720px, which is the other half of why prose this long felt
              like something to skim past.
            */}
            <section className="detail-card">
              <p className="detail-label">01 / OVERVIEW</p>
              <Prose text={project.overview} className="detail-prose" />
            </section>

            <section className="detail-card">
              <p className="detail-label">02 / PROBLEM</p>
              <Prose text={project.problem} className="detail-prose" />
            </section>

            <section className="detail-card">
              <p className="detail-label">03 / SOLUTION</p>
              <Prose text={project.solution} className="detail-prose" />
            </section>

            <section className="detail-card">
              <p className="detail-label">04 / ARCHITECTURE</p>
              <Prose text={project.architecture} className="detail-prose" />
            </section>

            {project.decisions.length > 0 ? (
              <section className="detail-card">
                <p className="detail-label">05 / TECHNICAL DECISIONS</p>
                <ul>
                  {project.decisions.map((decision) => (
                    <li key={decision}>{decision}</li>
                  ))}
                </ul>
              </section>
            ) : null}

            {project.features.length > 0 ? (
              <section className="detail-card">
                <p className="detail-label">06 / FEATURES</p>
                <ul>
                  {project.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
              </section>
            ) : null}
          </article>

          <aside className="detail-aside">
            <div className="aside-rule" />
            <p>STATUS</p>
            <strong>{project.status === "in-progress" ? "In progress" : "Completed"}</strong>

            <div className="detail-aside-links">
              {project.githubUrl ? (
                <a
                  className="button button-primary"
                  href={project.githubUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Source code <span aria-hidden="true">↗</span>
                </a>
              ) : null}

              {project.liveUrl ? (
                <a className="button button-secondary" href={project.liveUrl} target="_blank" rel="noreferrer">
                  Live demo <span aria-hidden="true">↗</span>
                </a>
              ) : null}
            </div>
          </aside>
        </div>
      </main>
      <Footer />
    </>
  );
}