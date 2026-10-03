/**
 * Renders owner-written prose as real paragraphs.
 *
 * Why this exists: rendering a string directly, as `<p>{text}</p>`, throws away
 * every blank line the owner typed. HTML collapses runs of whitespace, so a
 * deliberate paragraph break arrives in the browser as a single space. The owner
 * types structure, the browser discards it, and a long piece of prose becomes
 * one undifferentiated wall of text — which is exactly what discourages reading.
 *
 * Two levels of break are honoured, matching what someone typing into a textarea
 * actually means:
 *
 * - A blank line starts a new paragraph.
 * - A single newline is kept as a line break, because inside a code sample, a
 *   terminal transcript or an address list a line break is meaningful content
 *   rather than a soft wrap.
 *
 * This is deliberately not a Markdown renderer. Nothing in the schema needs
 * inline formatting, and adding a parser would mean a dependency and an escaping
 * surface to maintain for no gain. Splitting on blank lines is all the problem
 * actually requires.
 */

/** A blank line, tolerating trailing spaces and Windows line endings. */
const PARAGRAPH_BREAK = /\n\s*\n/;

/** Any newline, once paragraph splits are done. */
const LINE_BREAK = /\n/;

export function Prose({ text, className }: { text: string; className?: string }) {
  // Nothing to lay out for an empty field, so the callers can pass an optional
  // string without each one guarding.
  if (!text.trim()) return null;

  const paragraphs = text
    .trim()
    .split(PARAGRAPH_BREAK)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <div className={className}>
      {paragraphs.map((paragraph, index) => {
        // Single newlines become <br>. The key includes the index because two
        // paragraphs of identical text are legitimately duplicate keys.
        const lines = paragraph.split(LINE_BREAK).map((line) => line.trimEnd());

        return (
          <p key={index}>
            {lines.map((line, lineIndex) => (
              <span key={lineIndex}>
                {lineIndex > 0 ? <br /> : null}
                {line}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}