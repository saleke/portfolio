import "server-only";

/**
 * Server-side validation for uploaded images.
 *
 * The browser resizes and re-encodes every upload to WebP before sending it, so
 * in practice only WebP arrives. That is a usability measure, not a security
 * one: the server cannot assume the client behaved, so every file is validated
 * from its actual bytes.
 *
 * Deliberately dependency-free. The alternative, adding `sharp` or `file-type`,
 * buys a signature database at the cost of a native dependency for a check that
 * is a few lines of byte comparison here.
 */

export const MAX_UPLOAD_BYTES = 3 * 1024 * 1024; // 3 MB, comfortably under Vercel's 4.5 MB function limit
export const MAX_IMAGE_DIMENSION = 12000;

/**
 * Accepted formats, detected from magic bytes.
 *
 * SVG is excluded on purpose. An SVG is an XML document that can carry
 * `<script>` and event handlers, so serving one from the site's own origin is
 * stored XSS. `next/image` blocks SVG by default, but images in `public/` are
 * also reachable directly, which bypasses that protection. Rejecting SVG here
 * means it can never be committed.
 *
 * GIF is excluded because animation is pointless for a project screenshot and
 * makes the file large for no benefit.
 */
type DetectedFormat = "image/jpeg" | "image/png" | "image/webp" | "image/avif";

export class ImageValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageValidationError";
  }
}

/**
 * Identifies an image from its leading bytes.
 *
 * The declared `Content-Type` from the browser is never trusted. It is whatever
 * the client chose to send, and `curl -F "file=@evil.html;type=image/png"`
 * defeats it entirely. Only bytes decide.
 */
function detectFormat(bytes: Buffer): DetectedFormat | null {
  if (bytes.length < 12) return null;

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }

  // RIFF container, used by WebP: "RIFF" <4-byte size> "WEBP"
  if (
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }

  // ISO base media (AVIF/HEIF): <4-byte box size> "ftyp" <brand>
  if (bytes.toString("ascii", 4, 8) === "ftyp") {
    const brand = bytes.toString("ascii", 8, 12);
    if (brand === "avif" || brand === "avis") return "image/avif";
  }

  return null;
}

/**
 * Reads the intrinsic dimensions out of a WebP header.
 *
 * Verifies the dimensions the client claims against what the file actually
 * contains. Without this, a client could declare `1x1` for a very large image,
 * and the value would flow into `next/image` as the reserved aspect ratio,
 * producing a badly broken layout.
 *
 * Handles the three WebP bitstream variants: VP8 (lossy), VP8L (lossless) and
 * VP8X (extended, which is what animated/alpha images use).
 */
function readWebpDimensions(bytes: Buffer): { width: number; height: number } | null {
  const chunk = bytes.toString("ascii", 12, 16);

  if (chunk === "VP8 ") {
    // Lossy: 3-byte frame tag, 3-byte sync code, then 14-bit width/height.
    if (bytes.length < 30) return null;
    return {
      width: bytes.readUInt16LE(26) & 0x3fff,
      height: bytes.readUInt16LE(28) & 0x3fff,
    };
  }

  if (chunk === "VP8L") {
    // Lossless: signature byte, then 14 bits width-1 and 14 bits height-1.
    if (bytes.length < 25) return null;
    const bits = bytes.readUInt32LE(21);
    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >> 14) & 0x3fff) + 1,
    };
  }

  if (chunk === "VP8X") {
    // Extended: 24-bit little-endian width-1 and height-1.
    if (bytes.length < 30) return null;
    const read24 = (offset: number) =>
      bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
    return { width: read24(24) + 1, height: read24(27) + 1 };
  }

  return null;
}

export type ValidatedUpload = {
  bytes: Buffer;
  width: number;
  height: number;
  format: DetectedFormat;
};

/**
 * Validates one uploaded file.
 *
 * Checks, in order of cost: size first so an oversized upload is rejected
 * before any parsing; then magic bytes; then declared dimensions against the
 * real ones. Throws `ImageValidationError` with a message safe to show the user.
 */
export async function validateImage(
  file: File,
  declared: { width: number; height: number },
): Promise<ValidatedUpload> {
  if (file.size === 0) {
    throw new ImageValidationError("That file is empty.");
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    const mb = (MAX_UPLOAD_BYTES / (1024 * 1024)).toFixed(0);
    throw new ImageValidationError(`Images must be under ${mb} MB.`);
  }

  const bytes = Buffer.from(await file.arrayBuffer());

  const format = detectFormat(bytes);
  if (!format) {
    throw new ImageValidationError(
      "Unsupported image format. Use a PNG, JPEG, WebP or AVIF file. SVG is not accepted.",
    );
  }

  // Dimensions are only readable for WebP, which is what the uploader sends.
  // Other formats fall back to the declared values, which the schema still
  // bounds, so a hostile value cannot produce an absurd layout.
  let width = declared.width;
  let height = declared.height;

  if (format === "image/webp") {
    const real = readWebpDimensions(bytes);
    if (!real) {
      throw new ImageValidationError("That WebP file could not be read. Try re-exporting it.");
    }
    if (real.width <= 0 || real.height <= 0) {
      throw new ImageValidationError("That image reports zero width or height.");
    }
    if (real.width > MAX_IMAGE_DIMENSION || real.height > MAX_IMAGE_DIMENSION) {
      throw new ImageValidationError(
        `Images must be at most ${MAX_IMAGE_DIMENSION}px on each side.`,
      );
    }
    if (real.width !== declared.width || real.height !== declared.height) {
      throw new ImageValidationError(
        "That image does not match its reported size. Try uploading it again.",
      );
    }
    width = real.width;
    height = real.height;
  }

  return { bytes, width, height, format };
}