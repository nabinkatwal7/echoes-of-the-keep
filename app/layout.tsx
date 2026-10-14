import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible, Cinzel, EB_Garamond } from "next/font/google";
import { RegisterSW } from "./components/RegisterSW";
import { SiteFooter } from "./components/layout/SiteFooter";
import { SiteHeader } from "./components/layout/SiteHeader";
import "./globals.css";

const display = Cinzel({ variable: "--font-display", subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });
const body = EB_Garamond({ variable: "--font-body", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const readable = Atkinson_Hyperlegible({ variable: "--font-readable", subsets: ["latin"], weight: ["400", "700"] });

export const metadata: Metadata = {
  title: { default: "Echoes of the Keep", template: "%s · Echoes of the Keep" },
  description: "Echoes of the Keep is a rules tome, hero forge and shared table for 5th Edition role-playing, with solo play against a computer Dungeon Master.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4ead2" },
    { media: "(prefers-color-scheme: dark)", color: "#0f0b08" },
  ],
  colorScheme: "light dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${display.variable} ${body.variable} ${readable.variable}`}>
      <body className="flex min-h-screen flex-col antialiased">
        <script dangerouslySetInnerHTML={{ __html: "try{var r=document.documentElement;var t=localStorage.getItem('emberhall-theme');r.dataset.theme=(t==='light'||t==='dark')?t:(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark');var c=localStorage.getItem('dnd-contrast');var f=localStorage.getItem('dnd-font');if(c)r.dataset.contrast=c;if(f)r.dataset.font=f}catch(e){}" }} />
        <a href="#main" className="skip-link">Skip to content</a>
        <RegisterSW />
        <SiteHeader />
        <div id="main" tabIndex={-1} className="flex-1 outline-none">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
