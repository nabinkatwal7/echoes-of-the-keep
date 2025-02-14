import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: "#EAE6DA",
        secondary: "#C3B299",
        textPrimary: "#2E2A24",
        accentColor: "#5D7CA6",
        highlightColor: "#A64242",
        borderColor: "#708D81",
        royalGold: "#D4AF37",
      },
    },
  },
  plugins: [],
} satisfies Config;
