import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],

    // Required from Next 16. Without an explicit allowlist only q=75 is
    // permitted; any other value is silently coerced to the nearest allowed
    // quality in production, and a direct request for an unlisted quality is
    // rejected with a 400. Declared here so the cover and hero qualities used in
    // components are intentional rather than accidental.
    qualities: [50, 75],

    // Uploads are resized in the browser to a 1920px long edge, so an 8 MB
    // screenshot never reaches the optimizer. Capping the response body as well
    // means a pathological file cannot consume an unbounded amount of memory.
    maximumResponseBody: 8 * 1024 * 1024,

    // An upload is served from this origin, never a redirect target. Next 16
    // does not re-validate `remotePatterns` after following a redirect, so
    // disabling redirects closes that gap.
    maximumRedirects: 0,

    // Next 16 default is `attachment`, which would make a direct visit to
    // `/_next/image?...` download the file instead of rendering it. Inline is
    // the intended behaviour for site imagery.
    contentDispositionType: "inline",
  },

  // Uploaded screenshots arrive as WebP from the browser, so the default 1 MB
  // Server Action limit is too small; a handful of screenshots exceeds it.
  // Vercel rejects request bodies above 4.5 MB regardless, so this is set just
  // under that ceiling. Eight resized WebP images typically total well under
  // 2 MB, and the image validator rejects anything larger per file.
  //
  // Nested under `experimental`: that is where Next 16.3.1's config schema
  // defines it, confirmed against
  // node_modules/next/dist/server/config-schema.js. A top-level `serverActions`
  // key is rejected by the config validator.
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },

  async headers() {
    return [
      {
        // Owner-uploaded files. `nosniff` stops a browser from re-interpreting an
        // upload as HTML or script, and the sandbox CSP means even a file that
        // somehow slipped past the magic-byte check could not execute.
        source: "/uploads/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Content-Disposition", value: "inline" },
          {
            key: "Content-Security-Policy",
            value: "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
          },
        ],
      },
      {
        // Belt and braces with the `robots` metadata in `app/admin/layout.tsx`.
        // A crawler that does not parse HTML still honours this header, so the
        // admin area cannot be indexed by a well-behaved bot even if it ignores
        // the `robots.txt` disallow.
        source: "/admin/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
      },
    ];
  },
};

export default nextConfig;