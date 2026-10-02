import { getSiteCopy } from "@/lib/content";
import { COPY_TABS, SECTION_KEYS, SECTION_LABELS } from "@/lib/content-schema";
import { StringListInput } from "@/components/admin/inputs";
import {
  saveIdentity,
  saveHero,
  saveAbout,
  saveTerminal,
  saveSections,
} from "@/app/admin/content/actions";
import {
  IdentityEditor,
  HeroEditor,
  AboutEditor,
  TerminalEditor,
  SectionsEditor,
} from "@/app/admin/(dashboard)/content/CopyEditor";

/**
 * The site-copy editor.
 *
 * Split into five tabs because `site.json` covers five unrelated pieces of the
 * page. One long form would be worse in a specific way: every tab saves the same
 * file, so a single form means one action rewriting all five pieces, and a typo
 * fix in the hero could overwrite a paragraph written five minutes earlier.
 *
 * Tabs are links rather than client state. That keeps each one a real URL, so it
 * can be bookmarked, shared, and reached with the back button, and it means the
 * server renders exactly the panel being asked for with no client state to keep
 * in sync.
 */

function TabNav({ active }: { active: string }) {
  return (
    <nav className="admin-tabs" aria-label="Site copy sections">
      {COPY_TABS.map((tab) => (
        <a
          key={tab.key}
          href={`/admin/content?tab=${tab.key}`}
          className={`admin-tab ${tab.key === active ? "is-active" : ""}`}
          aria-current={tab.key === active ? "page" : undefined}
        >
          {tab.label}
        </a>
      ))}
    </nav>
  );
}

export default async function ContentPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ tab }, site] = await Promise.all([searchParams, getSiteCopy()]);

  // An unknown or missing tab falls back to the first one rather than 404ing:
  // this is reached from a nav link, so an unexpected value is a stale bookmark
  // rather than a genuine request for something that does not exist.
  const active = COPY_TABS.some((entry) => entry.key === tab) ? tab! : COPY_TABS[0].key;

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <p className="admin-eyebrow">CONTENT</p>
          <h1>Site copy</h1>
          <p className="admin-subtle">
            Everything outside the project cards. Each tab saves independently, so editing the hero never
            touches the about section.
          </p>
        </div>
      </header>

      <TabNav active={active} />

      {active === "identity" ? (
        <IdentityEditor
          action={saveIdentity}
          values={{
            name: site.name,
            codeName: site.codeName,
            title: site.title,
            seoDescription: site.seoDescription,
          }}
        />
      ) : null}

      {active === "hero" ? (
        <HeroEditor
          action={saveHero}
          values={{
            overline: site.hero.overline,
            availability: site.hero.availability,
            lede: site.hero.lede,
            primaryAction: site.hero.primaryAction,
            secondaryAction: site.hero.secondaryAction,
          }}
          positioningInput={
            <StringListInput
              name="positioning"
              values={site.hero.positioning}
              label="Heading lines"
              singular="line"
              maxItems={3}
              maxLength={80}
              placeholder="e.g. Full Stack Web Development"
              addLabel="Add heading line"
              hint="The lines that follow your job title in the hero heading."
            />
          }
          stackInput={
            <StringListInput
              name="stack"
              values={site.hero.stack}
              label="Technology chips"
              singular="technology"
              maxItems={12}
              maxLength={30}
              placeholder="e.g. Go"
              addLabel="Add technology"
              hint="The single line of chips under the intro paragraph."
            />
          }
        />
      ) : null}

      {active === "about" ? (
        <AboutEditor
          action={saveAbout}
          values={{ lede: site.about.lede }}
          paragraphsInput={
            <StringListInput
              name="paragraphs"
              values={site.about.paragraphs}
              label="Paragraphs"
              singular="paragraph"
              maxItems={8}
              maxLength={600}
              addLabel="Add paragraph"
              hint="Shown to the right of the lede."
            />
          }
        />
      ) : null}

      {active === "terminal" ? (
        <TerminalEditor
          action={saveTerminal}
          values={{
            filename: site.terminal.filename,
            whoamiLabel: site.terminal.whoamiLabel,
            identity: site.terminal.identity,
            focusLabel: site.terminal.focusLabel,
            focus: site.terminal.focus,
            statusLabel: site.terminal.statusLabel,
          }}
        />
      ) : null}

      {active === "sections" ? (
        <SectionsEditor
          action={saveSections}
          sections={SECTION_KEYS.map((key) => ({
            key,
            label: SECTION_LABELS[key],
            index: site.sections[key].index,
            title: site.sections[key].title,
            intro: site.sections[key].intro,
          }))}
        />
      ) : null}
    </div>
  );
}