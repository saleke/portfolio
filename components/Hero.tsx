import Image from "next/image";
import Link from "next/link";
import { profile } from "@/data/profile";
import { TerminalCard } from "@/components/TerminalCard";

export function Hero() {
  return (
    <section className="hero container" aria-labelledby="hero-title">
      <div className="hero-copy">
        <p className="kicker"><span className="status-dot" /> {profile.availability}</p>
        <p className="hero-overline">FULL STACK WEB DEVELOPMENT</p>
        <h1 id="hero-title" aria-label="Software Developer in Training | Go • Python • TypeScript | Full Stack Web Development"><span className="title-line">Software Developer in Training</span><span className="title-line hero-title-detail"><span className="hero-pipe">|</span> <em>Go • Python • TypeScript</em></span><span className="title-line hero-title-detail"><span className="hero-pipe">|</span> Full Stack Web Development</span></h1>
        <p className="hero-lede">I build full stack web applications while developing deeper expertise in software engineering and networking, with growing interests in cybersecurity and artificial intelligence.</p>
        <div className="stack-line" aria-label="Primary technology stack">{profile.stack.map((item) => <span key={item}>{item}</span>)}</div>
        <div className="hero-actions"><Link className="button button-primary" href="#projects">View Projects <span aria-hidden="true">↗</span></Link><a className="button button-secondary" href={profile.githubUrl} target="_blank" rel="noreferrer">GitHub <span aria-hidden="true">↗</span></a></div>
      </div>
      <div className="hero-aside">
        <div className="portrait-frame"><Image src="/images/solomon-aleke.png" alt="Portrait of Solomon Aleke" fill priority sizes="(max-width: 900px) 75vw, 34vw" /></div>
        <TerminalCard />
      </div>
    </section>
  );
}
