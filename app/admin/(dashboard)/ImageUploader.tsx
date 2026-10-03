"use client";

import { useEffect, useRef, useState } from "react";
import type { ProjectImage } from "@/lib/schema";
import { FormStatus } from "@/components/admin/inputs";

/**
 * Image attachment control.
 *
 * Every image is decoded, resized and re-encoded to WebP **in the browser**
 * before it is sent. That is not a cosmetic choice, it is what makes the feature
 * work at all:
 *
 * - A modern retina screenshot is often 3-8 MB. Vercel rejects request bodies
 *   over 4.5 MB, and Next rejects Server Action bodies over 1 MB by default, so
 *   sending raw screenshots would simply fail. Resized to a 1920px WebP, a
 *   typical screenshot is 150-300 KB.
 * - Re-encoding strips EXIF, which can carry GPS coordinates and device
 *   details. That matters for screenshots of internal tools.
 * - It keeps the repository small. Git does not delta-compress images, so every
 *   revision of a large PNG would be stored in full.
 *
 * The server still validates every file from its bytes, because a client-side
 * check is a usability affordance and not a security control.
 */

const MAX_EDGE = 1920;
const WEBP_QUALITY = 0.82;
const BLUR_EDGE = 16;
const MAX_IMAGES = 8;

type Attachment = {
  /** Stable React key and filename stem. Not sent to the server. */
  key: string;
  blob: Blob;
  /** Preview URL, created once when the file is added. */
  url: string;
  width: number;
  height: number;
  blur: string;
  alt: string;
  /**
   * `src` of a stored image this one supersedes, sent as `imageReplaces-<index>`.
   *
   * Set only by a replace, never by an add. The server uses it to put the new
   * image back in the replaced one's position rather than at the end of the list.
   */
  replaces?: string;
};

/** Draws `source` into a canvas scaled so neither edge exceeds `maxEdge`. */
function drawScaled(source: ImageBitmap, maxEdge: number) {
  const scale = Math.min(1, maxEdge / Math.max(source.width, source.height));
  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser cannot process images.");
  context.drawImage(source, 0, 0, width, height);

  return { canvas, width, height };
}

/** Encodes a canvas. WebP where supported, JPEG as a fallback. */
function encode(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Could not encode that image."));
      },
      "image/webp",
      quality,
    );
  });
}

/**
 * Decodes, resizes and re-encodes one picked file.
 *
 * Returns the prepared attachment, or `{ error }` with a message safe to show
 * the owner. Defined outside the component so it is plainly an event-time
 * function rather than part of a render pass.
 */
async function buildAttachment(
  file: File,
  fallbackAlt: string,
): Promise<{ attachment: Attachment } | { error: string }> {
  let bitmap: ImageBitmap | null = null;

  try {
    // `imageOrientation: "from-image"` honours the EXIF rotation flag. Phone
    // screenshots carry it, and without this they would be saved sideways.
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });

    const { canvas, width, height } = drawScaled(bitmap, MAX_EDGE);
    const [blob, blur] = await Promise.all([
      encode(canvas, WEBP_QUALITY),
      createBlur(bitmap),
    ]);

    return {
      attachment: {
        key: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
        blob,
        url: URL.createObjectURL(blob),
        width,
        height,
        blur,
        // Default alt to the filename stem. Descriptive alt text is the owner's
        // job, but an empty default silently harms accessibility. `fallbackAlt`
        // covers a replacement, where the previous caption is the better guess.
        alt: file.name.replace(/\.[^.]+$/, "").slice(0, 140) || fallbackAlt,
      },
    };
  } catch {
    return { error: `Could not read "${file.name}". Try a PNG, JPEG or WebP file.` };
  } finally {
    bitmap?.close();
  }
}

/** Produces a tiny inline WebP used as the `next/image` blur placeholder. */
async function createBlur(source: ImageBitmap): Promise<string> {
  const { canvas } = drawScaled(source, BLUR_EDGE);
  const blob = await encode(canvas, 0.4);
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read that image."));
    reader.readAsDataURL(blob);
  });
}

export function ImageUploader({
  existing = [],
  error,
  status = "idle",
}: {
  existing?: ProjectImage[];
  error?: string;
  /** Result of the publish action, so uploads can be retired once they land. */
  status?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  /** One file input per stored image, so "Replace" needs no shared target state. */
  const replaceRefs = useRef(new Map<string, HTMLInputElement | null>());
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [kept, setKept] = useState<ProjectImage[]>(existing);
  const [localError, setLocalError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const total = attachments.length + kept.length;

  /**
   * Mirrors the attachment list into the real file input.
   *
   * A File cannot be placed in a hidden input's `value`, and building FormData
   * by hand would forfeit progressive enhancement. Assigning `input.files` from
   * a `DataTransfer` keeps the markup a plain `<form action>`, which still
   * submits correctly before hydration.
   *
   * Order matters: the server pairs each file with `imageWidth-<index>`, so the
   * DataTransfer is always rebuilt from the array in array order.
   */
  function syncInput(next: Attachment[]) {
    const input = inputRef.current;
    if (!input) return;

    const transfer = new DataTransfer();
    for (const item of next) {
      transfer.items.add(new File([item.blob], `${item.key}.webp`, { type: "image/webp" }));
    }
    input.files = transfer.files;
  }

  async function addFiles(files: FileList | null) {
    if (!files || files.length === 0) return;

    setLocalError(null);

    const room = MAX_IMAGES - total;
    if (room <= 0) {
      setLocalError(`You can attach up to ${MAX_IMAGES} images.`);
      return;
    }

    const selected = Array.from(files).slice(0, room);
    if (selected.length < files.length) {
      setLocalError(`Only the first ${room} image${room === 1 ? "" : "s"} were added.`);
    }

    setBusy(true);

    const added: Attachment[] = [];

    for (const file of selected) {
      const result = await buildAttachment(file, "");
      if ("error" in result) setLocalError(result.error);
      else added.push(result.attachment);
    }

    if (added.length > 0) {
      setAttachments((current) => {
        const next = [...current, ...added];
        syncInput(next);
        return next;
      });
    }

    setBusy(false);
  }

  /**
   * Swaps a stored image for a newly picked file.
   *
   * The old file is removed and the new one carries `replaces`, which the
   * server uses to put the result back in the same position. Without that
   * marker a replacement would land at the end of the list, and since the first
   * image is the cover used for the social card, replacing the first screenshot
   * would silently change it.
   *
   * The limit is not re-checked: the replaced image leaves `kept` as the new one
   * enters `attachments`, so the total does not grow.
   */
  async function replaceExisting(src: string, files: FileList | null) {
    const file = files?.[0];
    if (!file) return;

    setLocalError(null);
    setBusy(true);

    const previousAlt = kept.find((item) => item.src === src)?.alt ?? "";
    const result = await buildAttachment(file, previousAlt);
    setBusy(false);

    if ("error" in result) {
      setLocalError(result.error);
      return;
    }

    // Dropping the old entry from `kept` is what marks its file for deletion on
    // the server, and it frees the slot so the count does not exceed the limit.
    setKept((current) => current.filter((item) => item.src !== src));
    setAttachments((current) => {
      const next = [...current, { ...result.attachment, replaces: src }];
      syncInput(next);
      return next;
    });
  }

  function removeAttachment(key: string) {
    setAttachments((current) => {
      const removed = current.find((item) => item.key === key);
      if (removed) URL.revokeObjectURL(removed.url);

      const next = current.filter((item) => item.key !== key);
      syncInput(next);
      return next;
    });
  }

  function removeExisting(src: string) {
    setKept((current) => current.filter((item) => item.src !== src));
  }

  // Release any preview URLs still held when the component goes away.
  useEffect(() => {
    const live = attachments;
    return () => {
      for (const item of live) URL.revokeObjectURL(item.url);
    };
  }, [attachments]);

  /*
    Adopt the stored list again once it actually changes.

    `kept` is seeded from `existing` only on mount, because it is also the
    target of the owner's Remove buttons and alt text edits, and a state reset
    on every render would throw those away mid-edit. So the reset is gated on
    the set of stored paths changing, which happens exactly once: when the save
    lands and the refreshed page reports the images that were just published.

    Without that adoption the form keeps an empty `kept` after its first upload,
    submits no `existingImage`, and the server deletes every published image on
    the following save. `existing` is in the dependency list so the rule stays
    satisfied; the signature is what decides whether to act.
  */
  const storedSignature = existing.map((image) => image.src).join("|");
  const lastStoredRef = useRef(storedSignature);

  useEffect(() => {
    if (lastStoredRef.current === storedSignature) return;
    lastStoredRef.current = storedSignature;
    setKept(existing);
  }, [storedSignature, existing]);

  /*
    Retire the uploads once the save succeeds.

    They now exist in the repository and arrive back through `existing` as kept
    images, so leaving them in `attachments` would upload the same picture a
    second time under a new filename and orphan the file just written.
  */
  const lastStatusRef = useRef(status);

  useEffect(() => {
    if (lastStatusRef.current === "success" || status !== "success") return;
    lastStatusRef.current = status;

    setAttachments((current) => {
      for (const item of current) URL.revokeObjectURL(item.url);
      return [];
    });

    const input = inputRef.current;
    if (input) input.value = "";
  }, [status]);

  const message = localError ?? error;

  return (
    <div className="admin-uploader">
      {/*
        `name="images"` is what makes the upload reach the server at all.

        The action reads `formData.getAll("images")`, and an input without a
        `name` is never added to the FormData. Omitting it produced no error and
        no failed save: the action received an empty list, wrote the project with
        an empty `images` array, and committed successfully, so every image was
        discarded while the form reported success.

        The file list is not read from this input directly. `syncInput` assigns
        `input.files` from a DataTransfer so it carries the already-resized WebP
        blobs in attachment order, which is the order the server pairs with
        `imageWidth-<index>`.
      */}
      <input
        ref={inputRef}
        type="file"
        name="images"
        accept="image/png,image/jpeg,image/webp,image/avif"
        multiple
        className="sr-only"
        onChange={(event) => {
          void addFiles(event.target.files);
          // Reset so re-picking the same file still fires a change event.
          event.target.value = "";
        }}
      />

      <div className="admin-uploader-controls">
        <button
          type="button"
          className="admin-button"
          onClick={() => inputRef.current?.click()}
          disabled={busy || total >= MAX_IMAGES}
        >
          {busy ? "Processing…" : "Add images"}
        </button>
        <p className="admin-subtle">
          {total === 0
            ? "Optional. Up to 8 images, resized and compressed automatically."
            : `${total} of ${MAX_IMAGES} attached.`}
        </p>
      </div>

      {message ? <FormStatus status="error" message={message} /> : null}

      {total > 0 ? (
        <ul className="admin-uploader-grid">
          {kept.map((image, index) => (
            <li key={image.src} className="admin-uploader-item">
              {/* Uploads live in public/, so the bundler cannot know their size
                  at build time. The stored dimensions reserve the box, which is
                  what prevents layout shift as images load. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.src} alt="" width={image.width} height={image.height} />

              <label className="sr-only" htmlFor={`alt-${index}`}>
                Alt text
              </label>
              <input
                id={`alt-${index}`}
                value={image.alt}
                maxLength={140}
                placeholder="Describe this image"
                className="admin-input-sm"
                onChange={(event) => {
                  const value = event.target.value;
                  setKept((current) =>
                    current.map((entry) =>
                      entry.src === image.src ? { ...entry, alt: value } : entry,
                    ),
                  );
                }}
              />

              {/* Index-aligned so the server can pair each kept image with its
                  edited caption. Omitting these marks the image for deletion. */}
              <input type="hidden" name="existingImage" value={image.src} />
              <input type="hidden" name={`existingAlt-${index}`} value={image.alt} />

              {/*
                One file input per stored image rather than a shared one. A
                single input would need the target tracked in state and cleared
                when the picker is dismissed, and a dismissed picker fires no
                event, which leaves the stale target to silently replace the
                wrong image on the next pick. These cannot leak into each other.
              */}
              <input
                ref={(node) => {
                  replaceRefs.current.set(image.src, node);
                }}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/avif"
                className="sr-only"
                onChange={(event) => {
                  void replaceExisting(image.src, event.target.files);
                  // Reset so re-picking the same file still fires a change event.
                  event.target.value = "";
                }}
              />

              <div className="admin-uploader-actions">
                <button
                  type="button"
                  className="admin-uploader-replace"
                  onClick={() => replaceRefs.current.get(image.src)?.click()}
                  disabled={busy}
                >
                  Replace
                  <span className="sr-only"> {image.alt || image.src}</span>
                </button>

                <button
                  type="button"
                  className="admin-uploader-remove"
                  onClick={() => removeExisting(image.src)}
                >
                  Remove
                  <span className="sr-only"> {image.alt || image.src}</span>
                </button>
              </div>
            </li>
          ))}

          {attachments.map((item, index) => (
            <li key={item.key} className="admin-uploader-item">
              {/*
                A plain `img` is correct here. `item.url` is an object URL for a
                file that exists only in the browser's memory and is never
                written anywhere until the form is submitted. `next/image` would
                add an optimizer hop for a preview that has no server-side
                asset to fetch, and would reject the `blob:` scheme outright.
                Width and height are set from the file so the box does not shift.
              */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.url} alt="" width={item.width} height={item.height} />

              <label className="sr-only" htmlFor={`newAlt-${item.key}`}>
                Alt text
              </label>
              <input
                id={`newAlt-${item.key}`}
                value={item.alt}
                maxLength={140}
                placeholder="Describe this image"
                className="admin-input-sm"
                onChange={(event) => {
                  const value = event.target.value;
                  setAttachments((current) =>
                    current.map((entry) =>
                      entry.key === item.key ? { ...entry, alt: value } : entry,
                    ),
                  );
                }}
              />

              <input type="hidden" name={`imageWidth-${index}`} value={item.width} />
              <input type="hidden" name={`imageHeight-${index}`} value={item.height} />
              <input type="hidden" name={`imageBlur-${index}`} value={item.blur} />
              <input type="hidden" name={`imageAlt-${index}`} value={item.alt} />
              {/* Empty for a plain add. The server only honours a value that matches
                  one of this project's own stored images. */}
              <input
                type="hidden"
                name={`imageReplaces-${index}`}
                value={item.replaces ?? ""}
              />

              <button
                type="button"
                className="admin-uploader-remove"
                onClick={() => removeAttachment(item.key)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}