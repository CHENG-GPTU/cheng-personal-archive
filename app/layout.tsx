import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import ArchiveNavigationProvider from './archive-navigation';
import ArchiveEntry from './archive-entry';

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;
  const title = "陈俊呈｜个人履历、作品与人生档案";
  const description = "一份持续生长的个人档案：记录陈俊呈的真实履历、AI 产品作品、项目判断与人生章节。";
  return {
    title,
    description,
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    openGraph: { title, description, type: "website", url: origin, images: [{ url: `${origin}/og-dossier-silver-v1.png`, width: 1731, height: 909, alt: "灰银色 CHENG ARCHIVE 个人履历、作品与人生档案" }] },
    twitter: { card: "summary_large_image", title, description, images: [`${origin}/og-dossier-silver-v1.png`] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN" data-scroll-behavior="smooth"><body><ArchiveEntry><ArchiveNavigationProvider>{children}</ArchiveNavigationProvider></ArchiveEntry></body></html>;
}
