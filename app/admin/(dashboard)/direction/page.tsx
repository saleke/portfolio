import Link from "next/link";
import { getFocusAreas } from "@/lib/content";
import { DirectionEditor } from "@/app/admin/(dashboard)/direction/DirectionEditor";

export default async function DirectionPage() {
  const focus = await getFocusAreas();
  const accented = focus.items.filter((item) => item.accent).length;

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <p className="admin-eyebrow">LIBRARY</p>
          <h1>Direction</h1>
          <p className="admin-subtle">
            {focus.items.length} areas, {accented} highlighted.{" "}
            <Link href="/#learning" target="_blank" className="admin-link">
              See it on the site ↗
            </Link>
          </p>
        </div>
      </header>

      <DirectionEditor items={focus.items} />
    </div>
  );
}