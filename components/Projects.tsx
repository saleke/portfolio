import Link from "next/link";
import Image from "next/image";
import { getProjects } from "@/lib/projects";
import { getSiteCopy } from "@/lib/content";
import { SectionHeading } from "@/components/SectionHeading";

export async function Projects() {
  // Both reads are cached, so this costs one file read per document per build.
  const [projects, site] = await Promise.all([getProjects(), getSiteCopy()]);

  return (
    <section className="section container" id="projects" aria-labelledby="projects-title">
      <SectionHeading
        id="projects-title"
        index={site.sections.projects.index}
        title={site.sections.projects.title}
        intro={site.sections.projects.intro}
      />

      <div className="project-grid">
        {projects.map((project) => (
          <article className="project-card" key={project.slug}>
            <div className="project-card-top">
              <span className="project-eyebrow">{project.eyebrow}</span>
              {project.status ? (
                <span className="project-status">
                  {project.status === "in-progress" ? "In progress" : "Completed"}
                </span>
              ) : null}
            </div>

            {project.images[0] ? (
              <div className="project-card-cover">
                <Image
                  src={project.images[0].src}
                  alt={project.images[0].alt || `${project.title} screenshot`}
                  width={project.images[0].width}
                  height={project.images[0].height}
                  sizes="(max-width: 640px) 100vw, (max-width: 900px) 50vw, 420px"
                  quality={50}
                  placeholder={project.images[0].blurDataUrl ? "blur" : "empty"}
                  blurDataURL={project.images[0].blurDataUrl}
                />
              </div>
            ) : null}

            <h3>{project.title}</h3>
            <p className="project-description">{project.description}</p>
            <p className="project-context">{project.context}</p>

            <div className="tag-list">
              {project.technologies.map((technology) => (
                <span className="tag" key={technology}>
                  {technology}
                </span>
              ))}
            </div>

            <div className="card-actions">
              <Link href={`/projects/${project.slug}`}>
                View case study <span aria-hidden="true">↗</span>
              </Link>

              {project.githubUrl ? (
                <a href={project.githubUrl} target="_blank" rel="noreferrer">
                  Source <span aria-hidden="true">↗</span>
                </a>
              ) : null}

              {/* Previously `liveUrl` was declared in the project type but never
                  rendered, so a demo link could never appear. */}
              {project.liveUrl ? (
                <a href={project.liveUrl} target="_blank" rel="noreferrer">
                  Live demo <span aria-hidden="true">↗</span>
                </a>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}