import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nekko Studio",
    short_name: "Nekko",
    description: "Nekko Studio 团队创作工作台",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f4f3ef",
    theme_color: "#f4f3ef",
    orientation: "portrait-primary",
    lang: "zh-CN",
    categories: ["productivity", "business"],
    icons: [
      { src: "/icons/nekko-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/nekko-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/nekko-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
