import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HIMIG — KCCC Psalmist",
    short_name: "HIMIG",
    description:
      "HIMIG Worship Songbook for KCCC Psalmist.",
    start_url: "/",
    display: "standalone",
    background_color: "#090909",
    theme_color: "#090909",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}