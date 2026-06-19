import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ONRAJ — Persoonlijk portaal",
    short_name: "ONRAJ",
    description: "Persoonlijk portaal: taken, notities, financiën en agenda.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#0d132b",
    theme_color: "#0d132b",
    orientation: "portrait",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
