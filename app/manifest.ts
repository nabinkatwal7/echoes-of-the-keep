import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Dungeons & Dragons",
    short_name: "D&D",
    description: "Rules tome, hero forge and live campaigns for D&D 5th Edition.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#100c08",
    theme_color: "#100c08",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
