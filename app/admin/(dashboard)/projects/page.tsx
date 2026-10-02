import Link from "next/link";
import Image from "next/image";
import { getProjects } from "@/lib/projects";
import { isGitConfigured } from "@/lib/github";
import { MoveProjectButton, DeleteProjectButton } from "@/app/admin/(dashboard)/ProjectListControls";

/**
 * The project list.
 *
 * Reads from the local build, which is always exactly what is live. The reorder
 * and delete actions read from GitHub instead, so a project added but not yet
 * deployed still appears in the branch and can be reordered.
 */
export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string; published?: string }>;
}) {
  const [{ deleted }, projects] = await Promise.all([searchParams, getProjects()]);

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <p className="admin-eyebrow">CONTENT</p>
          <h1>Projects</h1>
          <p className="admin-subtle">
            {projects.length === 0
              ? "Nothing published yet."
              : `${projects.length} published, newest first.`}
          </p>
        </div>
        <div className="admin-head-actions">
          <Link href="/admin/projects/new" className="admin-button admin-button-primary">
            New project
          </Link>
        </div>
      </header>

      {/* Success and failure notices for actions that redirect back here. */}
      {deleted ? (
        <p className="admin-callout is-success" role="status">
          Project deleted. The commit is live on the branch; the site updates after the build.
        </p>
      ) : null}

      {!isGitConfigured() ? (
        <p className="admin-callout is-warning" role="status">
          Publishing is not configured, so changes cannot be saved. Set the GitHub environment
          variables on the <Link href="/admin/settings">settings page</Link>.
        </p>
      ) : null}

      {projects.length === 0 ? (
        <div className="admin-empty">
          <h2>No projects yet</h2>
          <p>
            A project is one JSON file and any images you attach, written to the repository and
            published by the next build.
          </p>
          <Link href="/admin/projects/new" className="admin-button admin-button-primary">
            Add the first project
          </Link>
        </div>
      ) : (
        <ul className="admin-projectlist">
          {projects.map((project, index) => {
            const [cover] = project.images;

            return (
              <li className="admin-projectrow" key={project.slug}>
                <div className="admin-projectrow-order">
                  <MoveProjectButton
                    slug={project.slug}
                    title={project.title}
                    direction="up"
                    disabled={index === 0}
                  />
                  <MoveProjectButton
                    slug={project.slug}
                    title={project.title}
                    direction="down"
                    disabled={index === projects.length - 1}
                  />
                </div>

                <div className="admin-projectrow-thumb">
                  {cover ? (
                    <Image
                      src={cover.src}
                      alt=""
                      width={120}
                      height={80}
                      sizes="120px"
                      // The placeholder carries the real blur data when one was
                      // stored at upload; without it the box is blank until the
                      // image decodes.
                      placeholder={cover.blurDataUrl ? "blur" : "empty"}
                      blurDataURL={cover.blurDataUrl}
                    />
                  ) : (
                    <span className="admin-projectrow-thumb-empty" aria-hidden="true">
                      —
                    </span>
                  )}
                </div>

                <div className="admin-projectrow-body">
                  <div className="admin-projectrow-title">
                    <Link href={`/admin/projects/${project.slug}`}>{project.title}</Link>
                    {project.featured ? <span className="admin-tag">Featured</span> : null}
                    <span
                      className={`admin-tag ${project.status === "completed" ? "is-done" : ""}`}
                    >
                      {project.status === "completed" ? "Completed" : "In progress"}
                    </span>
                  </div>
                  <p className="admin-projectrow-slug">
                    /projects/{project.slug}
                    {project.images.length > 0 ? ` · ${project.images.length} images` : ""}
                  </p>
                  <p className="admin-projectrow-desc">{project.description}</p>
                </div>

                <div className="admin-projectrow-actions">
                  <Link
                    href={`/projects/${project.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="admin-button admin-button-quiet"
                  >
                    View
                  </Link>
                  <Link
                    href={`/admin/projects/${project.slug}`}
                    className="admin-button"
                  >
                    Edit
                  </Link>
                  <DeleteProjectButton slug={project.slug} title={project.title} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}