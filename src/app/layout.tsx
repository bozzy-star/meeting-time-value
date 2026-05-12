import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { SiteFooter } from "./_components/SiteFooter";

const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Meeting TimeValue 〜 会議の値段、見えてますか?",
  description:
    "MTGに参加する人数と平均時給を入れるだけ。リアルタイムで会議のコストを可視化するカウンター。Meeting TimeValue Pro のパイロット版です。",
  openGraph: {
    title: "Meeting TimeValue 〜 会議の値段、見えてますか?",
    description:
      "あなたの会議、いま¥いくら使ってますか?人数と時給を入れるだけのリアルタイムカウンター。",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Meeting TimeValue 〜 会議の値段、見えてますか?",
    description:
      "あなたの会議、いま¥いくら使ってますか?人数と時給を入れるだけのリアルタイムカウンター。",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cfToken = process.env.NEXT_PUBLIC_CF_ANALYTICS_TOKEN;
  return (
    <html
      lang="ja"
      className={`${notoSansJP.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#0a0a0a] text-zinc-100">
        {children}
        <SiteFooter />
        <Analytics />
        {cfToken && (
          <Script
            defer
            src="https://static.cloudflareinsights.com/beacon.min.js"
            data-cf-beacon={`{"token": "${cfToken}"}`}
            strategy="afterInteractive"
          />
        )}
      </body>
    </html>
  );
}
