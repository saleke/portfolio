import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { About } from "@/components/About";
import { Projects } from "@/components/Projects";
import { TechStack } from "@/components/TechStack";
import { CurrentlyLearning } from "@/components/CurrentlyLearning";
import { Contact } from "@/components/Contact";
import { Footer } from "@/components/Footer";
import { getSiteCopy } from "@/lib/content";

/**
 * Homepage composition.
 *
 * Reads the owner's name so the navbar brand can be rendered from content. The
 * read is cached, so this adds no extra file access beyond what the sections
 * below already perform.
 */
export default async function Home() {
  const site = await getSiteCopy();

  return (
    <>
      <Navbar name={site.name} />
      <main>
        <Hero />
        <About />
        <Projects />
        <TechStack />
        <CurrentlyLearning />
        <Contact />
      </main>
      <Footer />
    </>
  );
}