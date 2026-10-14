import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Emberhall",
    short_name: "Emberhall",
    description: "A rules tome, hero forge and shared table for 5th Edition role-playing, with solo play.",
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
