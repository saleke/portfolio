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
}: {
  existing?: ProjectImage[];
  error?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
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

        added.push({
          key: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
          blob,
          url: URL.createObjectURL(blob),
          width,
          height,
          blur,
          // Default alt to the filename stem. Descriptive alt text is the
          // owner's job, but an empty default silently harms accessibility.
          alt: file.name.replace(/\.[^.]+$/, "").slice(0, 140),
        });
      } catch {
        setLocalError(`Could not read "${file.name}". Try a PNG, JPEG or WebP file.`);
      } finally {
        bitmap?.close();
      }
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

  const message = localError ?? error;

  return (
    <div className="admin-uploader">
      <input
        ref={inputRef}
        type="file"
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

              <button
                type="button"
                className="admin-uploader-remove"
                onClick={() => removeExisting(image.src)}
              >
                Remove
                <span className="sr-only"> {image.alt || image.src}</span>
              </button>
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