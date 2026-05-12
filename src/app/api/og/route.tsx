import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

// ---------- Locales / currencies (duplicated minimally for edge runtime) ----------

type OgLocale = "ja" | "en-GB" | "en-US" | "fr" | "de";
type OgCurrency = "JPY" | "USD" | "GBP" | "EUR";

const NUMERIC_LOCALE: Record<OgLocale, string> = {
  ja: "ja-JP",
  "en-GB": "en-GB",
  "en-US": "en-US",
  fr: "fr-FR",
  de: "de-DE",
};

const CURRENCY_SYMBOL: Record<OgCurrency, string> = {
  JPY: "¥",
  USD: "$",
  GBP: "£",
  EUR: "€",
};

const TITLE: Record<OgLocale, string> = {
  ja: "この会議のコスト",
  "en-GB": "What this meeting cost",
  "en-US": "What this meeting cost",
  fr: "Coût de cette réunion",
  de: "Kosten dieses Meetings",
};

const FREQ_LABEL: Record<OgLocale, Record<string, string>> = {
  ja: {
    once: "単発",
    weekly: "週1回",
    weekly2: "週2回",
    biweekly: "隔週",
    monthly: "月1回",
    weekdays: "営業日毎日",
    daily: "毎日",
  },
  "en-GB": {
    once: "Just once",
    weekly: "Weekly",
    weekly2: "Twice a week",
    biweekly: "Fortnightly",
    monthly: "Monthly",
    weekdays: "Every weekday",
    daily: "Every day",
  },
  "en-US": {
    once: "Just once",
    weekly: "Weekly",
    weekly2: "Twice a week",
    biweekly: "Biweekly",
    monthly: "Monthly",
    weekdays: "Every weekday",
    daily: "Every day",
  },
  fr: {
    once: "Une seule fois",
    weekly: "1 fois/sem.",
    weekly2: "2 fois/sem.",
    biweekly: "Toutes les 2 sem.",
    monthly: "1 fois/mois",
    weekdays: "Chaque jour ouvré",
    daily: "Tous les jours",
  },
  de: {
    once: "Einmalig",
    weekly: "Wöchentlich",
    weekly2: "2× / Woche",
    biweekly: "Alle 2 Wochen",
    monthly: "Monatlich",
    weekdays: "Werktäglich",
    daily: "Täglich",
  },
};

const YEAR_LABEL: Record<OgLocale, (freqLabel: string) => string> = {
  ja: (f) => (f ? `${f}で続けると 年` : "年換算"),
  "en-GB": (f) => (f ? `${f} — per year` : "Per year"),
  "en-US": (f) => (f ? `${f} — per year` : "Per year"),
  fr: (f) => (f ? `À raison de ${f} — par an` : "Par an"),
  de: (f) => (f ? `Bei ${f} — pro Jahr` : "Pro Jahr"),
};

const HASHTAG: Record<OgLocale, string> = {
  ja: "#会議の値段",
  "en-GB": "#MeetingCost",
  "en-US": "#MeetingCost",
  fr: "#CoûtRéunion",
  de: "#MeetingKosten",
};

const PEOPLE_SUFFIX: Record<OgLocale, (n: number) => string> = {
  ja: (n) => `${n}人`,
  "en-GB": (n) => `${n} ppl`,
  "en-US": (n) => `${n} ppl`,
  fr: (n) => `${n} pers.`,
  de: (n) => `${n} Pers.`,
};

function pickLocale(raw: string | null): OgLocale {
  if (!raw) return "ja";
  if (raw === "ja" || raw === "fr" || raw === "de") return raw;
  if (raw === "en-GB" || raw === "en-US") return raw;
  return "ja";
}

function pickCurrency(raw: string | null): OgCurrency {
  if (raw === "USD" || raw === "GBP" || raw === "EUR" || raw === "JPY")
    return raw;
  return "JPY";
}

function formatMoney(
  locale: OgLocale,
  currency: OgCurrency,
  n: number,
): string {
  return `${CURRENCY_SYMBOL[currency]}${new Intl.NumberFormat(
    NUMERIC_LOCALE[locale],
  ).format(Math.round(n))}`;
}

function formatHMS(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}

// ---------- Font loading (Noto Sans JP covers JP + Latin + ¥) ----------

async function loadFont(text: string): Promise<ArrayBuffer | null> {
  try {
    const cssUrl = `https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@600;700&text=${encodeURIComponent(
      text,
    )}`;
    const cssRes = await fetch(cssUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_6_8) AppleWebKit/534.30 (KHTML, like Gecko) Version/5.1 Safari/534.30",
      },
    });
    if (!cssRes.ok) return null;
    const css = await cssRes.text();
    const match = css.match(
      /src:\s*url\((https:[^)]+)\)\s*format\(['"]?truetype['"]?\)/,
    );
    if (!match) return null;
    const fontRes = await fetch(match[1]);
    if (!fontRes.ok) return null;
    return await fontRes.arrayBuffer();
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const amount = Math.max(0, Number(searchParams.get("amount") ?? 0) || 0);
  const duration = Math.max(0, Number(searchParams.get("duration") ?? 0) || 0);
  const headcount = Math.max(
    1,
    Number(searchParams.get("headcount") ?? 1) || 1,
  );
  const frequencyRaw = searchParams.get("frequency") ?? "";
  const yearly = Math.max(0, Number(searchParams.get("yearly") ?? 0) || 0);
  const locale = pickLocale(searchParams.get("lang"));
  const currency = pickCurrency(searchParams.get("currency"));

  const frequencyLabel = FREQ_LABEL[locale][frequencyRaw] ?? "";
  const showYearly = yearly > 0 && frequencyRaw !== "once";

  const titleText = TITLE[locale];
  const yearLabelText = YEAR_LABEL[locale](frequencyLabel);
  const hashtag = HASHTAG[locale];
  const amountText = formatMoney(locale, currency, amount);
  const yearlyText = formatMoney(locale, currency, yearly);
  const hmsText = formatHMS(duration);
  const peopleText = PEOPLE_SUFFIX[locale](headcount);

  // All characters we need in the rendered image (used to scope the
  // Google Fonts subset request to keep the bundle small).
  const textForFont = [
    titleText,
    yearLabelText,
    hashtag,
    amountText,
    yearlyText,
    hmsText,
    peopleText,
    "MeetingTimeValue",
    " /-,.:0123456789",
  ].join("");

  const fontData = await loadFont(textForFont);
  const fonts = fontData
    ? [
        {
          name: "Noto Sans JP",
          data: fontData,
          weight: 600 as const,
          style: "normal" as const,
        },
      ]
    : undefined;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#ffffff",
          color: "#171717",
          padding: "70px 90px",
          boxShadow: "inset 0 0 0 1px #e5e5e5",
          fontFamily: "Noto Sans JP, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flex: 1,
            flexDirection: "column",
            alignItems: "flex-start",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              fontSize: 32,
              color: "#737373",
              marginBottom: 20,
              display: "flex",
            }}
          >
            {titleText}
          </div>
          <div
            style={{
              fontSize: 200,
              fontWeight: 600,
              lineHeight: 1,
              color: "#171717",
              letterSpacing: "-0.04em",
              display: "flex",
            }}
          >
            {amountText}
          </div>
          <div
            style={{
              marginTop: 28,
              fontSize: 36,
              color: "#737373",
              display: "flex",
              gap: 20,
              alignItems: "center",
              fontWeight: 600,
            }}
          >
            <span>{hmsText}</span>
            <span style={{ color: "#d4d4d4" }}>/</span>
            <span>{peopleText}</span>
          </div>

          {showYearly && (
            <div
              style={{
                marginTop: 36,
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
              }}
            >
              <div
                style={{
                  fontSize: 26,
                  color: "#737373",
                  display: "flex",
                  marginBottom: 6,
                }}
              >
                {yearLabelText}
              </div>
              <div
                style={{
                  fontSize: 84,
                  fontWeight: 600,
                  lineHeight: 1,
                  color: "#ea580c",
                  letterSpacing: "-0.03em",
                  display: "flex",
                }}
              >
                {yearlyText}
              </div>
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 28,
            color: "#a3a3a3",
            paddingTop: 24,
            borderTop: "1px solid #e5e5e5",
          }}
        >
          <div style={{ display: "flex", color: "#ea580c", fontWeight: 700 }}>
            Meeting TimeValue
          </div>
          <div style={{ display: "flex" }}>{hashtag}</div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      ...(fonts ? { fonts } : {}),
    },
  );
}
