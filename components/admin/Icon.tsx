/**
 * Icon set for the admin control plane.
 *
 * Hand-written rather than pulled from a library. The alternative is a
 * dependency plus a bundler config, or inline SVG copy-pasted at each call
 * site. There are fifteen icons, they are pure geometry with no licensing
 * question, and a single map here keeps the stroke width and cap style
 * consistent across the whole interface.
 *
 * All paths are drawn on a 24x24 grid with `currentColor` and no fill, so an
 * icon inherits `color` from its container and scales with `size`.
 */

export type IconName =
  | "grid"
  | "layers"
  | "document"
  | "chip"
  | "target"
  | "sliders"
  | "external"
  | "plus"
  | "trash"
  | "up"
  | "down"
  | "check"
  | "alert"
  | "menu"
  | "close"
  | "signout"
  | "image"
  | "eye"
  | "arrow-left";

const paths: Record<IconName, string> = {
  grid: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
  layers: "M12 3 3 7.5l9 4.5 9-4.5zM3 12.5l9 4.5 9-4.5M3 17l9 4.5 9-4.5",
  document: "M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6",
  chip: "M7 7h10v10H7zM9.5 3v3M14.5 3v3M9.5 18v3M14.5 18v3M3 9.5h3M3 14.5h3M18 9.5h3M18 14.5h3",
  target: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2",
  sliders: "M4 7h10M18 7h2M4 12h4M12 12h8M4 17h10M18 17h2M16 7a2 2 0 1 0-4 0 2 2 0 0 0 4 0M10 12a2 2 0 1 0-4 0 2 2 0 0 0 4 0M16 17a2 2 0 1 0-4 0 2 2 0 0 0 4 0",
  external: "M14 4h6v6M20 4l-8 8M18 14v6H4V6h6",
  plus: "M12 5v14M5 12h14",
  trash: "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6",
  up: "m6 15 6-6 6 6",
  down: "m6 9 6 6 6-6",
  check: "m4 12 5 5L20 6",
  alert: "M12 3 1.5 21h21zM12 9v5M12 17.5v.5",
  menu: "M4 7h16M4 12h16M4 17h16",
  close: "M5 5l14 14M19 5 5 19",
  signout: "M15 12H4M8 8l-4 4 4 4M14 4h6v16h-6",
  image: "M4 5h16v14H4zM8.5 11a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3M4 16l5-5 5 5 3-3 3 3",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6",
  "arrow-left": "M20 12H4M10 6l-6 6 6 6",
};

export function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  return (
    <svg
      // Icons are decorative: every icon in the control plane sits beside a text
      // label or inside a labelled button, so announcing them would be noise.
      aria-hidden="true"
      focusable="false"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      shapeRendering="geometricPrecision"
    >
      <path d={paths[name]} />
    </svg>
  );
}