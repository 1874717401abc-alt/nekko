import type { Metadata } from "next";
import AppShell from "@/components/AppShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nekko Studio",
  description: "团队创作工作台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col md:flex-row bg-paper text-ink">
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(localStorage.getItem('theme')!=='dark'){document.documentElement.classList.add('light')}}catch(e){document.documentElement.classList.add('light')}",
          }}
        />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
