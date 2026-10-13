import type { Metadata, Viewport } from "next";
import { Cinzel, EB_Garamond } from "next/font/google";
import { SiteFooter } from "./components/layout/SiteFooter";
import { SiteHeader } from "./components/layout/SiteHeader";
import "./globals.css";

const display = Cinzel({ variable: "--font-display", subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });
const body = EB_Garamond({ variable: "--font-body", subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: { default: "Dungeons & Dragons", template: "%s · Dungeons & Dragons" },
  description: "Rules tome, hero forge and live campaigns for D&D 5th Edition.",
};

export const viewport: Viewport = { themeColor: "#0f0b08", colorScheme: "dark" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="flex min-h-screen flex-col antialiased">
        <a href="#main" className="skip-link">Skip to content</a>
        <SiteHeader />
        <div id="main" tabIndex={-1} className="flex-1 outline-none">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
