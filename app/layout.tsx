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
  title: { default: "Dungeons & Dragons", template: "%s · Dungeons & Dragons" },
  description: "Rules tome, hero forge and live campaigns for D&D 5th Edition.",
};

export const viewport: Viewport = { themeColor: "#0f0b08", colorScheme: "dark" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${readable.variable}`}>
      <body className="flex min-h-screen flex-col antialiased">
        <script dangerouslySetInnerHTML={{ __html: "try{var r=document.documentElement;var c=localStorage.getItem('dnd-contrast');var f=localStorage.getItem('dnd-font');if(c)r.dataset.contrast=c;if(f)r.dataset.font=f}catch(e){}" }} />
        <a href="#main" className="skip-link">Skip to content</a>
        <RegisterSW />
        <SiteHeader />
        <div id="main" tabIndex={-1} className="flex-1 outline-none">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
