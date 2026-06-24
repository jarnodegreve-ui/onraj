import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "onraj",
    short_name: "onraj",
    description: "Persoonlijk portaal: taken, notities, financiën en agenda.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#08090a",
    theme_color: "#08090a",
    orientation: "portrait",
    share_target: {
      action: "/api/share",
      method: "GET",
      params: { title: "title", text: "text", url: "url" },
    },
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
