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
    shortcuts: [
      {
        name: "新建灵感",
        short_name: "灵感",
        description: "快速记录一条灵感",
        url: "/inspiration?new=1",
        icons: [{ src: "/icons/nekko-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
    share_target: {
      action: "/inspiration",
      method: "GET",
      enctype: "application/x-www-form-urlencoded",
      params: { title: "title", text: "text", url: "url" },
    },
    icons: [
      { src: "/icons/nekko-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/nekko-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/nekko-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
