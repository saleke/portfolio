"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ProjectImage } from "@/lib/schema";

/**
 * Image showcase for a case study.
 *
 * Placed directly under the technologies so a reader sees what the project
 * looks like before committing to any of the prose. The first image is given
 * twice the width because a screenshot at full width is legible and one in a
 * narrow column is not.
 *
 * Motion is CSS only. There is no animation library and no scroll listener:
 *
 * - The entrance is a keyframe animation with a per-item delay, which needs no
 *   JavaScript and cannot be skipped by rendering before hydration.
 * - `prefers-reduced-motion` removes both the entrance and the hover zoom.
 * - The lightbox needs JavaScript, and degrades to a plain image grid without
 *   it. Nothing is hidden behind the interaction.
 */

/** Milliseconds between each item's entrance. */
const STAGGER_MS = 80;

const EASE = "cubic-bezier(.16,1,.3,1)";

export function ProjectShowcase({
  images,
  title,
}: {
  images: ProjectImage[];
  title: string;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  /** The thumbnail that opened the lightbox, so focus can be given back to it. */
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => setOpenIndex(null), []);

  const step = useCallback(
    (delta: number) => {
      setOpenIndex((current) => {
        if (current === null) return current;
        // Wraps, so arrow keys never dead-end at the last image.
        return (current + delta + images.length) % images.length;
      });
    },
    [images.length],
  );

  /*
    Escape closes, arrows navigate. Bound to the document rather than the
    dialog because the dialog is unmounted while closed, and a listener on an
    absent element would have nothing to observe.
  */
  useEffect(() => {
    if (openIndex === null) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpenIndex(null);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        step(1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        step(-1);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [openIndex, step]);

  /*
    The page behind the overlay must not scroll on a wheel or a swipe, which a
    `position: fixed` overlay does not prevent on its own. The original inline
    value is restored rather than cleared, so a page that had a scrollbar
    offset for some other reason keeps it.
  */
  useEffect(() => {
    if (openIndex === null) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      triggerRef.current?.focus();
    };
  }, [openIndex]);

  if (images.length === 0) return null;

  const active = openIndex === null ? null : images[openIndex];

  return (
    <section className="showcase" aria-label={`${title} screenshots`}>
      <div className="showcase-head">
        <p className="detail-label">Screenshots</p>
        <p className="showcase-count">
          {String(images.length).padStart(2, "0")} image{images.length === 1 ? "" : "s"}
        </p>
      </div>

      <ul className="showcase-grid">
        {images.map((image, index) => (
          <li
            key={image.src}
            className="showcase-item"
            // Drives the entrance delay. Set as a custom property rather than a
            // class so the index does not need a generated stylesheet.
            style={{ "--showcase-index": index } as React.CSSProperties}
          >
            <button
              type="button"
              className="showcase-trigger"
              onClick={(event) => {
                triggerRef.current = event.currentTarget;
                setOpenIndex(index);
              }}
              aria-label={`Enlarge image ${index + 1} of ${images.length}${
                image.alt ? `: ${image.alt}` : ""
              }`}
            >
              <span className="showcase-frame">
                <Image
                  src={image.src}
                  alt={image.alt || `${title} screenshot ${index + 1}`}
                  width={image.width}
                  height={image.height}
                  sizes="(max-width: 640px) 100vw, (max-width: 900px) 60vw, 560px"
                  placeholder={image.blurDataUrl ? "blur" : "empty"}
                  blurDataURL={image.blurDataUrl}
                  // The showcase is close to the top of the page and its first
                  // image is the largest paint, so it should not wait on the
                  // lazy loader.
                  priority={index === 0}
                />
              </span>

              {image.alt ? <span className="showcase-caption">{image.alt}</span> : null}
            </button>
          </li>
        ))}
      </ul>

      {active ? (
        <div
          className="showcase-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`${title} screenshot ${(openIndex ?? 0) + 1} of ${images.length}`}
          onClick={(event) => {
            // The backdrop is the dialog itself, so a click that lands on the
            // image or the chrome must not close it.
            if (event.target === event.currentTarget) close();
          }}
        >
          <div className="showcase-lightbox-bar">
            <p className="showcase-lightbox-count">
              {String((openIndex ?? 0) + 1).padStart(2, "0")}
              <span aria-hidden="true"> / </span>
              {String(images.length).padStart(2, "0")}
            </p>

            <div className="showcase-lightbox-actions">
              <button type="button" onClick={() => step(-1)} aria-label="Previous image">
                <span aria-hidden="true">←</span>
              </button>
              <button type="button" onClick={() => step(1)} aria-label="Next image">
                <span aria-hidden="true">→</span>
              </button>
              <button ref={closeRef} type="button" onClick={close} aria-label="Close">
                <span aria-hidden="true">✕</span>
              </button>
            </div>
          </div>

          {/*
            Keyed on `src` so moving to another image remounts the figure and
            the entrance animation replays. That is what makes the change read
            as a transition rather than a silent swap.
          */}
          <figure className="showcase-lightbox-figure" key={active.src}>
            <Image
              src={active.src}
              alt={active.alt || `${title} screenshot`}
              width={active.width}
              height={active.height}
              sizes="100vw"
              quality={75}
              placeholder={active.blurDataUrl ? "blur" : "empty"}
              blurDataURL={active.blurDataUrl}
              priority
            />
          </figure>

          {active.alt ? <figcaption className="showcase-lightbox-alt">{active.alt}</figcaption> : null}
        </div>
      ) : null}

      <style>{`
        @keyframes showcase-in {
          from { opacity: 0; transform: translateY(28px) scale(.97); }
          to { opacity: 1; transform: none; }
        }
        @keyframes showcase-zoom-in {
          from { opacity: 0; transform: scale(.94); }
          to { opacity: 1; transform: none; }
        }
        .showcase-item { animation: showcase-in .85s ${EASE} both; animation-delay: calc(var(--showcase-index, 0) * ${STAGGER_MS}ms); }
        .showcase-lightbox { animation: showcase-zoom-in .32s ${EASE} both; }
        .showcase-lightbox-figure img { animation: showcase-zoom-in .45s ${EASE} both; }
        @media (prefers-reduced-motion: reduce) {
          .showcase-item, .showcase-lightbox, .showcase-lightbox-figure img { animation: none; }
        }
      `}</style>
    </section>
  );
}