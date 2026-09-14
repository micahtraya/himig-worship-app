import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HIMIG - KCCC Psalmist",
    short_name: "HIMIG",
    description: "HIMIG Worship Songbook for KCCC Psalmist.",
    start_url: "/",
    display: "standalone",
    background_color: "#090909",
    theme_color: "#090909",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/himig-icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/himig-icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}