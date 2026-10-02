"use client";

import { FocusAreasInput } from "@/components/admin/inputs";
import { EditorForm } from "@/app/admin/(dashboard)/content/CopyEditor";
import { saveFocusAreas } from "@/app/admin/content/actions";

/**
 * Focus-area editor.
 *
 * The Accent toggle is the point of this screen. The previous implementation
 * decided a card's appearance by testing whether its label read "Technical
 * interests", so retypeing that text silently restyled the card, and adding any
 * other future-oriented area left it looking like a settled one. Presentation
 * is now a field the owner sets directly.
 */
export function DirectionEditor({
  items,
}: {
  items: { label: string; detail: string; accent: boolean }[];
}) {
  return (
    <EditorForm action={saveFocusAreas} saveLabel="Save focus areas">
      {() => (
        <>
          <p className="admin-note">
            The four cards in the direction section. Accent highlights a card as an area you are
            moving towards rather than one you have already settled.
          </p>
          <FocusAreasInput name="items" items={items} />
        </>
      )}
    </EditorForm>
  );
}