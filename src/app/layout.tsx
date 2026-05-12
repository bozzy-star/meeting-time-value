import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";

const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "会議の値段 — リアルタイムでお金が燃えていくMTGコストカウンター",
  description:
    "MTGに参加する人数と平均時給を入れるだけ。リアルタイムで¥が増えていく、会議のコストを可視化するカウンターです。",
  openGraph: {
    title: "会議の値段",
    description:
      "あなたの会議、いま¥いくら燃えてますか?人数と時給を入れるだけのリアルタイムカウンター。",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "会議の値段",
    description:
      "あなたの会議、いま¥いくら燃えてますか?人数と時給を入れるだけのリアルタイムカウンター。",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${notoSansJP.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#0a0a0a] text-zinc-100">
        {children}
      </body>
    </html>
  );
}
