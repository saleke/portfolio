import Link from "next/link";
import { getTechnologies } from "@/lib/content";
import { TechnologyEditor } from "@/app/admin/(dashboard)/technology/TechnologyEditor";

export default async function TechnologyPage() {
  const technologies = await getTechnologies();
  const itemCount = technologies.groups.reduce((total, group) => total + group.items.length, 0);

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <p className="admin-eyebrow">LIBRARY</p>
          <h1>Technology</h1>
          <p className="admin-subtle">
            {itemCount} tools across {technologies.groups.length} groups.{" "}
            <Link href="/#stack" target="_blank" className="admin-link">
              See it on the site ↗
            </Link>
          </p>
        </div>
      </header>

      <TechnologyEditor groups={technologies.groups} />
    </div>
  );
}