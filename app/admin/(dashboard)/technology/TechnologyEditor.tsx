"use client";

import { TechnologyGroupsInput } from "@/components/admin/inputs";
import { EditorForm } from "@/app/admin/(dashboard)/content/CopyEditor";
import { saveTechnologies } from "@/app/admin/content/actions";

/**
 * Technology group editor.
 *
 * A live preview is deliberately absent. The site's technology section is a
 * column layout, and previewing it here would mean maintaining a second
 * implementation of it that could drift from the real one. The link to the live
 * section is the honest preview.
 */
export function TechnologyEditor({
  groups,
}: {
  groups: { title: string; items: string[] }[];
}) {
  return (
    <EditorForm action={saveTechnologies} saveLabel="Save technology list">
      {() => (
        <>
          <p className="admin-note">
            Grouped exactly as the site renders them. Each group needs a name; items are
            comma-separated, and a field tidies itself when you leave it.
          </p>
          <TechnologyGroupsInput name="groups" groups={groups} />
        </>
      )}
    </EditorForm>
  );
}