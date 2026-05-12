import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { LocaleProvider } from "./_lib/i18n";
import { SiteFooter } from "./_components/SiteFooter";

const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  display: "swap",
});

// Server-side metadata stays in Japanese (the default brand language).
// Per-locale client switching updates document.title via the provider.
export const metadata: Metadata = {
  title: "Meeting TimeValue 〜 会議の値段、見えてますか?",
  description:
    "MTGに参加する人数と平均コストを入れるだけ。リアルタイムで会議のコストを可視化するカウンター。Meeting TimeValue Pro のパイロット版です。",
  alternates: {
    canonical: "/",
    languages: {
      ja: "/?lang=ja",
      "en-GB": "/?lang=en-GB",
      "en-US": "/?lang=en-US",
      fr: "/?lang=fr",
      de: "/?lang=de",
    },
  },
  openGraph: {
    title: "Meeting TimeValue 〜 会議の値段、見えてますか?",
    description:
      "あなたの会議、いま¥いくら使ってますか?人数とコストを入れるだけのリアルタイムカウンター。",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Meeting TimeValue 〜 会議の値段、見えてますか?",
    description:
      "あなたの会議、いま¥いくら使ってますか?人数とコストを入れるだけのリアルタイムカウンター。",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cfToken = process.env.NEXT_PUBLIC_CF_ANALYTICS_TOKEN;
  return (
    // <html lang> is updated client-side by LocaleProvider once the
    // visitor's preferred locale is resolved. Initial render = ja.
    <html lang="ja" className={`${notoSansJP.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-white text-neutral-900">
        <LocaleProvider>
          {children}
          <SiteFooter />
        </LocaleProvider>
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
