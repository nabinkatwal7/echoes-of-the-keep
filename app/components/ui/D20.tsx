/** A twenty-sided die, drawn as a gold outline. Used as the logo mark and as a decorative glyph. */
export function D20({ className = "h-8 w-8", label }: { className?: string; label?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinejoin="round"
      strokeLinecap="round"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <polygon points="32,3 57,17.5 57,46.5 32,61 7,46.5 7,17.5" />
      <polygon points="32,18 47,43 17,43" />
      <path d="M32 3v15M7 17.5 32 18M57 17.5 32 18M7 17.5 17 43M57 17.5 47 43M7 46.5 17 43M57 46.5 47 43M32 61 17 43M32 61 47 43" strokeWidth="1.8" />
    </svg>
  );
}
