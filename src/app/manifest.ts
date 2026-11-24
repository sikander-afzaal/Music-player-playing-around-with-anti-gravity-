import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pulseify — Spotify & YouTube Music Studio",
    short_name: "Pulseify",
    description:
      "High-density Spotify & YouTube Music streaming analytics, global leaderboards, personal vault, and studio player.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#07080c",
    theme_color: "#07080c",
    orientation: "any",
    categories: ["music", "entertainment", "utilities"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
