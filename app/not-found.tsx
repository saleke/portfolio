import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { getSiteCopy } from "@/lib/content";

export default async function NotFound() {
  const site = await getSiteCopy();

  return (
    <>
      <Navbar name={site.name} />
      <main className="system-page container" id="main-content">
        <p className="system-code">404</p>
        <p className="system-eyebrow">PAGE NOT FOUND</p>
        <h1>This route leads nowhere.</h1>
        <p>The page may have moved, or the address may be incomplete.</p>
        <div className="system-actions">
          <Link className="button button-primary" href="/">Return home</Link>
          <Link className="button button-secondary" href="/#projects">Explore projects</Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
