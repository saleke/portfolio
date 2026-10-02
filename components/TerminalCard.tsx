import type { SiteCopy } from "@/lib/content-schema";

type TerminalCardProps = Pick<
  SiteCopy["terminal"],
  "filename" | "whoamiLabel" | "identity" | "focusLabel" | "focus" | "statusLabel"
>;

/**
 * Decorative identity card styled as a terminal.
 *
 * Presentational only: every string arrives as a prop from `Hero`, which reads
 * it from content, so this component needs no data access of its own.
 */
export function TerminalCard({
  filename,
  whoamiLabel,
  identity,
  focusLabel,
  focus,
  statusLabel,
}: TerminalCardProps) {
  return (
    <div className="terminal-card" aria-label="Terminal identity card">
      <div className="terminal-bar">
        <span />
        <span />
        <span />
        <small>{filename}</small>
      </div>
      <div className="terminal-body">
        <p>
          <span className="prompt">$</span> {whoamiLabel}
        </p>
        <p className="terminal-value">{identity}</p>
        <p>
          <span className="prompt">$</span> {focusLabel}
        </p>
        <p className="terminal-value">{focus}</p>
        <p>
          <span className="prompt">$</span> {statusLabel}
          <span className="cursor" aria-hidden="true">
            _
          </span>
        </p>
      </div>
    </div>
  );
}