import type { ReactNode } from "react";

/**
 * Minimal, safe Markdown renderer for administrator-authored legal pages.
 * Supports "## heading", "> note", "- list item", **bold** and paragraphs.
 * Content is rendered as React text nodes; no HTML is ever injected.
 */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : part,
  );
}

export function Markdown({ source }: { source: string }) {
  const blocks = source.replace(/\r\n/g, "\n").split(/\n{2,}/);
  return (
    <div className="prose-legal">
      {blocks.map((block, i) => {
        const lines = block.split("\n").filter((l) => l.trim() !== "");
        if (!lines.length) return null;
        if (lines[0].startsWith("## ")) {
          return (
            <div key={i}>
              <h2>{inline(lines[0].slice(3))}</h2>
              {lines.length > 1 ? <p>{inline(lines.slice(1).join(" "))}</p> : null}
            </div>
          );
        }
        if (lines.every((l) => l.startsWith("> "))) {
          return <blockquote key={i}>{inline(lines.map((l) => l.slice(2)).join(" "))}</blockquote>;
        }
        if (lines.every((l) => l.startsWith("- "))) {
          return <ul key={i}>{lines.map((l, j) => <li key={j}>{inline(l.slice(2))}</li>)}</ul>;
        }
        return <p key={i}>{inline(lines.join(" "))}</p>;
      })}
    </div>
  );
}
