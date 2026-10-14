import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        surface: "var(--surface)",
        surface2: "var(--surface-2)",
        border: "var(--border)",
        borderSoft: "var(--border-soft)",
        muted: "var(--muted)",
        gold: "var(--gold)",
        goldBright: "var(--gold-bright)",
        accent: "var(--accent)",
        crimson: "var(--crimson)",
        danger: "var(--danger)",
        ember: "var(--ember)",
        arcane: "var(--arcane)",
        emerald: "var(--emerald)",
        shade: "rgb(var(--shade) / <alpha-value>)",
        onGold: "var(--on-gold)",
      },
      fontFamily: {
        pixel: ["var(--font-pixel)", "ui-monospace", "monospace"],
        display: ["var(--font-display)", "Georgia", "serif"],
        body: ["var(--font-body)", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
