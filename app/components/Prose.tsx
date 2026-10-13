/**
 * Renders extracted handbook text. Each line break starts a new paragraph, and lines beginning with a bullet
 * become list items. Short lines that look like headings (no end punctuation) are shown as sub-headings.
 */
export function Prose({ text, className = "" }: { text: string; className?: string }) {
  // rejoin lines that were wrapped mid-sentence in the source: previous has no end punctuation, next starts lowercase
  const lines: string[] = [];
  for (const raw of text.split(/\n+/)) {
    const line = raw.trim();
    if (!line) continue;
    const prev = lines[lines.length - 1];
    if (prev && !/^[•●▪]/.test(line) && /^[a-z(]/.test(line) && !/[.!?:;"”)’]$/.test(prev) && prev.length > 25) {
      lines[lines.length - 1] = `${prev} ${line}`;
    } else {
      lines.push(line);
    }
  }

  const blocks: React.ReactNode[] = [];
  let bullets: string[] = [];
  const flush = () => {
    if (!bullets.length) return;
    blocks.push(
      <ul key={`ul-${blocks.length}`} className="ml-1 flex list-none flex-col gap-1.5">
        {bullets.map((b, i) => (
          <li key={i} className="flex gap-3">
            <span className="mt-[0.6em] h-1.5 w-1.5 shrink-0 rotate-45 bg-gold" aria-hidden />
            <span>{b.replace(/^[•●▪-]\s*/, "")}</span>
          </li>
        ))}
      </ul>,
    );
    bullets = [];
  };

  lines.forEach((line, i) => {
    if (/^[•●▪]/.test(line)) {
      bullets.push(line);
      return;
    }
    flush();
    const heading = line.length < 40 && !/[.!?:;,]$/.test(line) && line.split(" ").length <= 5 && /^[A-Z]/.test(line) && i < lines.length - 1;
    blocks.push(
      heading ? (
        <h3 key={i} className="mt-2 font-display text-sm uppercase tracking-[0.16em] text-goldBright">
          {line}
        </h3>
      ) : (
        <p key={i}>{line}</p>
      ),
    );
  });
  flush();

  return <div className={`flex flex-col gap-3 text-foreground/90 ${className}`}>{blocks}</div>;
}
