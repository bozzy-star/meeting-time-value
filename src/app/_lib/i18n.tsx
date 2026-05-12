"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

// ---------- Locales ----------

export type Locale = "ja" | "en-GB" | "en-US" | "fr" | "de";

export const LOCALES: Locale[] = ["ja", "en-GB", "en-US", "fr", "de"];

export const LOCALE_LABEL: Record<Locale, string> = {
  ja: "日本語",
  "en-GB": "English (UK)",
  "en-US": "English (US)",
  fr: "Français",
  de: "Deutsch",
};

// ---------- Currencies ----------

export type CurrencyCode = "JPY" | "USD" | "GBP" | "EUR";
export const CURRENCIES: CurrencyCode[] = ["JPY", "USD", "GBP", "EUR"];

export const CURRENCY_SYMBOL: Record<CurrencyCode, string> = {
  JPY: "¥",
  USD: "$",
  GBP: "£",
  EUR: "€",
};

const CURRENCY_BG_LABEL: Record<CurrencyCode, string> = {
  JPY: "¥",
  USD: "$",
  GBP: "£",
  EUR: "€",
};

const NUMERIC_LOCALE: Record<Locale, string> = {
  ja: "ja-JP",
  "en-GB": "en-GB",
  "en-US": "en-US",
  fr: "fr-FR",
  de: "de-DE",
};

export function formatNumberFor(locale: Locale, n: number): string {
  try {
    return new Intl.NumberFormat(NUMERIC_LOCALE[locale]).format(
      Math.round(n),
    );
  } catch {
    return String(Math.round(n));
  }
}

export function formatMoney(
  locale: Locale,
  currency: CurrencyCode,
  n: number,
): string {
  return `${CURRENCY_SYMBOL[currency]}${formatNumberFor(locale, n)}`;
}

export function bgSymbolFor(currency: CurrencyCode): string {
  return CURRENCY_BG_LABEL[currency];
}

// ---------- hh:mm:ss / duration phrase formatters ----------

export function formatHMS(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}

/** Share-text duration phrase, per locale. */
export function formatDurationPhrase(locale: Locale, seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;

  if (locale === "ja") {
    if (h > 0) return `${h}時間${m}分${s}秒`;
    if (m > 0) return `${m}分${s}秒`;
    return `${s}秒`;
  }

  if (locale === "fr") {
    const parts: string[] = [];
    if (h > 0) parts.push(`${h} h`);
    if (m > 0) parts.push(`${m} min`);
    if (s > 0 || parts.length === 0) parts.push(`${s} s`);
    return parts.join(" ");
  }

  if (locale === "de") {
    const parts: string[] = [];
    if (h > 0) parts.push(`${h} Std.`);
    if (m > 0) parts.push(`${m} Min.`);
    if (s > 0 || parts.length === 0) parts.push(`${s} Sek.`);
    return parts.join(" ");
  }

  // en-GB / en-US
  const parts: string[] = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  if (s > 0 || parts.length === 0) parts.push(`${s}s`);
  return parts.join(" ");
}

// ---------- Dictionary ----------

export type FrequencyKey =
  | "once"
  | "weekly"
  | "weekly2"
  | "biweekly"
  | "monthly"
  | "weekdays"
  | "daily";

type Dict = {
  meta: { title: string; description: string };
  hero: { titlePart1: string; titlePart2: string; sub: string };
  form: {
    headcountLabel: string;
    headcountSuffix: string;
    costLabel: string;
    costSuffix: string;
    note: string;
    currencyLabel: string;
  };
  button: { start: string; end: string; restart: string; share: string };
  running: {
    peopleSuffix: string;
    breakdownCostPrefix: string;
    breakdownCostSuffix: string;
  };
  result: {
    title: string;
    durationLabel: string;
    elapsedPeople: (hms: string, head: number) => string;
    freqIntro: string;
    freqOutro: string;
    monthLabel: string;
    yearLabel: string;
    breakdownHead: string;
    breakdownCost: string;
    breakdownTime: string;
    sharePreviewLabel: string;
  };
  freq: Record<FrequencyKey, string>;
  /** short label shown in share-text "{freq}で続けると…" */
  freqShortInShare: Record<FrequencyKey, string>;
  cta: { title: string; desc: string; comingSoon: string };
  footer: { copy: string };
  /** Build the share text (returns full multiline string). */
  buildShareText: (args: {
    durationPhrase: string;
    amountFormatted: string;
    yearlyFormatted: string;
    frequency: FrequencyKey;
  }) => string;
};

export const TRANSLATIONS: Record<Locale, Dict> = {
  ja: {
    meta: {
      title: "Meeting TimeValue 〜 会議の値段、見えてますか?",
      description:
        "MTGに参加する人数と平均コストを入れるだけ。リアルタイムで会議のコストを可視化するカウンター。Meeting TimeValue Pro のパイロット版です。",
    },
    hero: {
      titlePart1: "会議の値段、",
      titlePart2: "見えてますか?",
      sub: "人数とコストを入れるだけ。3秒で会議の“本当の値段”が見える。",
    },
    form: {
      headcountLabel: "参加人数",
      headcountSuffix: "人",
      costLabel: "平均コスト",
      costSuffix: "/時",
      note: "※ 数字はあくまで目安です。",
      currencyLabel: "通貨",
    },
    button: {
      start: "会議スタート",
      end: "終了",
      restart: "もう一度測る",
      share: "でシェア",
    },
    running: {
      peopleSuffix: "人",
      breakdownCostPrefix: "コスト ",
      breakdownCostSuffix: "円/時",
    },
    result: {
      title: "この会議のコスト",
      durationLabel: "会議の時間と人数",
      elapsedPeople: (hms, head) => `${hms} / ${head}人`,
      freqIntro: "この会議が",
      freqOutro: "だと…",
      monthLabel: "月",
      yearLabel: "年",
      breakdownHead: "人数",
      breakdownCost: "コスト",
      breakdownTime: "時間",
      sharePreviewLabel: "シェア時の文面",
    },
    freq: {
      once: "単発 (1回のみ)",
      weekly: "週1回",
      weekly2: "週2回",
      biweekly: "隔週 (2週に1回)",
      monthly: "月1回",
      weekdays: "営業日毎日 (週5)",
      daily: "毎日 (週7)",
    },
    freqShortInShare: {
      once: "単発",
      weekly: "週1回",
      weekly2: "週2回",
      biweekly: "隔週",
      monthly: "月1回",
      weekdays: "営業日毎日",
      daily: "毎日",
    },
    cta: {
      title: "Meeting TimeValue Pro 開発中",
      desc: "このパイロット版は本格版の試作です。\n正式版では会議の自動測定・集計・改善提案まで全自動化します。",
      comingSoon: "近日リリース予定",
    },
    footer: { copy: "powered by Meeting TimeValue Pro" },
    buildShareText: ({
      durationPhrase,
      amountFormatted,
      yearlyFormatted,
      frequency,
    }) => {
      const head = `この会議、${durationPhrase}で${amountFormatted} 使ってた`;
      const tags = "#会議の値段 #Meeting TimeValue";
      if (frequency === "once") return `${head}\n${tags}`;
      const short = TRANSLATIONS.ja.freqShortInShare[frequency];
      return `${head}\n${short}で続けると 年${yearlyFormatted}\n${tags}`;
    },
  },

  "en-GB": {
    meta: {
      title: "Meeting TimeValue — what does your meeting actually cost?",
      description:
        "Enter headcount and average hourly cost — watch the real cost of your meeting count up live. A pilot of Meeting TimeValue Pro.",
    },
    hero: {
      titlePart1: "What does your meeting",
      titlePart2: "actually cost?",
      sub: "Just headcount and cost. The real price of your meeting in 3 seconds.",
    },
    form: {
      headcountLabel: "Attendees",
      headcountSuffix: "ppl",
      costLabel: "Average cost",
      costSuffix: "/hr",
      note: "* Figures are indicative only.",
      currencyLabel: "Currency",
    },
    button: {
      start: "Start meeting",
      end: "Finish",
      restart: "Measure again",
      share: "Share on",
    },
    running: {
      peopleSuffix: "ppl",
      breakdownCostPrefix: "Cost ",
      breakdownCostSuffix: "/hr",
    },
    result: {
      title: "What this meeting cost",
      durationLabel: "Duration & participants",
      elapsedPeople: (hms, head) => `${hms} / ${head} ppl`,
      freqIntro: "If this meeting happens",
      freqOutro: "…",
      monthLabel: "Month",
      yearLabel: "Year",
      breakdownHead: "Attendees",
      breakdownCost: "Cost",
      breakdownTime: "Duration",
      sharePreviewLabel: "Share preview",
    },
    freq: {
      once: "Just once",
      weekly: "Weekly",
      weekly2: "Twice a week",
      biweekly: "Fortnightly",
      monthly: "Monthly",
      weekdays: "Every weekday",
      daily: "Every day",
    },
    freqShortInShare: {
      once: "just once",
      weekly: "weekly",
      weekly2: "twice a week",
      biweekly: "fortnightly",
      monthly: "monthly",
      weekdays: "every weekday",
      daily: "every day",
    },
    cta: {
      title: "Meeting TimeValue Pro — in development",
      desc: "This pilot is a preview of the full product.\nThe full version will measure, aggregate and improve every meeting automatically.",
      comingSoon: "Coming soon",
    },
    footer: { copy: "powered by Meeting TimeValue Pro" },
    buildShareText: ({
      durationPhrase,
      amountFormatted,
      yearlyFormatted,
      frequency,
    }) => {
      const head = `My meeting just cost ${amountFormatted} in ${durationPhrase}.`;
      const tags = "#MeetingCost #MeetingTimeValue";
      if (frequency === "once") return `${head}\n${tags}`;
      const short =
        TRANSLATIONS["en-GB"].freqShortInShare[frequency];
      return `${head}\nAt ${short}, that's ${yearlyFormatted}/year.\n${tags}`;
    },
  },

  "en-US": {
    meta: {
      title: "Meeting TimeValue — what does your meeting actually cost?",
      description:
        "Enter headcount and average hourly cost — watch the real cost of your meeting count up live. A pilot of Meeting TimeValue Pro.",
    },
    hero: {
      titlePart1: "What does your meeting",
      titlePart2: "actually cost?",
      sub: "Just headcount and cost. The real price of your meeting in 3 seconds.",
    },
    form: {
      headcountLabel: "Attendees",
      headcountSuffix: "ppl",
      costLabel: "Average cost",
      costSuffix: "/hr",
      note: "* Figures are indicative only.",
      currencyLabel: "Currency",
    },
    button: {
      start: "Start meeting",
      end: "Finish",
      restart: "Measure again",
      share: "Share on",
    },
    running: {
      peopleSuffix: "ppl",
      breakdownCostPrefix: "Cost ",
      breakdownCostSuffix: "/hr",
    },
    result: {
      title: "What this meeting cost",
      durationLabel: "Duration & participants",
      elapsedPeople: (hms, head) => `${hms} / ${head} ppl`,
      freqIntro: "If this meeting happens",
      freqOutro: "…",
      monthLabel: "Month",
      yearLabel: "Year",
      breakdownHead: "Attendees",
      breakdownCost: "Cost",
      breakdownTime: "Duration",
      sharePreviewLabel: "Share preview",
    },
    freq: {
      once: "Just once",
      weekly: "Weekly",
      weekly2: "Twice a week",
      biweekly: "Biweekly",
      monthly: "Monthly",
      weekdays: "Every weekday",
      daily: "Every day",
    },
    freqShortInShare: {
      once: "just once",
      weekly: "weekly",
      weekly2: "twice a week",
      biweekly: "biweekly",
      monthly: "monthly",
      weekdays: "every weekday",
      daily: "every day",
    },
    cta: {
      title: "Meeting TimeValue Pro — in development",
      desc: "This pilot is a preview of the full product.\nThe full version will measure, aggregate and improve every meeting automatically.",
      comingSoon: "Coming soon",
    },
    footer: { copy: "powered by Meeting TimeValue Pro" },
    buildShareText: ({
      durationPhrase,
      amountFormatted,
      yearlyFormatted,
      frequency,
    }) => {
      const head = `My meeting just cost ${amountFormatted} in ${durationPhrase}.`;
      const tags = "#MeetingCost #MeetingTimeValue";
      if (frequency === "once") return `${head}\n${tags}`;
      const short =
        TRANSLATIONS["en-US"].freqShortInShare[frequency];
      return `${head}\nAt ${short}, that's ${yearlyFormatted}/year.\n${tags}`;
    },
  },

  fr: {
    meta: {
      title:
        "Meeting TimeValue — quel est le vrai coût de votre réunion ?",
      description:
        "Saisissez le nombre de participants et le coût horaire moyen — voyez en temps réel le coût réel de votre réunion. Pilote de Meeting TimeValue Pro.",
    },
    hero: {
      titlePart1: "Quel est le vrai coût",
      titlePart2: "de votre réunion ?",
      sub: "Participants et coût. Le vrai prix de votre réunion en 3 secondes.",
    },
    form: {
      headcountLabel: "Participants",
      headcountSuffix: "pers.",
      costLabel: "Coût horaire",
      costSuffix: "/h",
      note: "* Chiffres indicatifs uniquement.",
      currencyLabel: "Devise",
    },
    button: {
      start: "Démarrer la réunion",
      end: "Terminer",
      restart: "Recommencer",
      share: "Partager sur",
    },
    running: {
      peopleSuffix: "pers.",
      breakdownCostPrefix: "Coût ",
      breakdownCostSuffix: "/h",
    },
    result: {
      title: "Coût de cette réunion",
      durationLabel: "Durée et participants",
      elapsedPeople: (hms, head) => `${hms} / ${head} pers.`,
      freqIntro: "Si cette réunion a lieu",
      freqOutro: "…",
      monthLabel: "Mois",
      yearLabel: "An",
      breakdownHead: "Participants",
      breakdownCost: "Coût",
      breakdownTime: "Durée",
      sharePreviewLabel: "Aperçu du partage",
    },
    freq: {
      once: "Une seule fois",
      weekly: "1 fois / semaine",
      weekly2: "2 fois / semaine",
      biweekly: "Toutes les 2 sem.",
      monthly: "1 fois / mois",
      weekdays: "Chaque jour ouvré",
      daily: "Tous les jours",
    },
    freqShortInShare: {
      once: "une seule fois",
      weekly: "1 fois par semaine",
      weekly2: "2 fois par semaine",
      biweekly: "toutes les 2 semaines",
      monthly: "1 fois par mois",
      weekdays: "chaque jour ouvré",
      daily: "tous les jours",
    },
    cta: {
      title: "Meeting TimeValue Pro — en développement",
      desc: "Ce pilote est un aperçu de la version complète.\nLa version finale mesurera, agrégera et améliorera chaque réunion automatiquement.",
      comingSoon: "Bientôt disponible",
    },
    footer: { copy: "propulsé par Meeting TimeValue Pro" },
    buildShareText: ({
      durationPhrase,
      amountFormatted,
      yearlyFormatted,
      frequency,
    }) => {
      const head = `Cette réunion m'a coûté ${amountFormatted} en ${durationPhrase}.`;
      const tags = "#CoûtRéunion #MeetingTimeValue";
      if (frequency === "once") return `${head}\n${tags}`;
      const short = TRANSLATIONS.fr.freqShortInShare[frequency];
      return `${head}\nÀ raison de ${short}, cela représente ${yearlyFormatted}/an.\n${tags}`;
    },
  },

  de: {
    meta: {
      title: "Meeting TimeValue — was kostet Ihr Meeting wirklich?",
      description:
        "Teilnehmerzahl und durchschnittliche Stundenkosten eingeben — die echten Meeting-Kosten in Echtzeit. Pilot von Meeting TimeValue Pro.",
    },
    hero: {
      titlePart1: "Was kostet Ihr Meeting",
      titlePart2: "wirklich?",
      sub: "Teilnehmer und Kosten — der echte Preis Ihres Meetings in 3 Sekunden.",
    },
    form: {
      headcountLabel: "Teilnehmer",
      headcountSuffix: "Pers.",
      costLabel: "Ø Kosten",
      costSuffix: "/Std.",
      note: "* Zahlen sind Richtwerte.",
      currencyLabel: "Währung",
    },
    button: {
      start: "Meeting starten",
      end: "Beenden",
      restart: "Erneut messen",
      share: "Teilen auf",
    },
    running: {
      peopleSuffix: "Pers.",
      breakdownCostPrefix: "Kosten ",
      breakdownCostSuffix: "/Std.",
    },
    result: {
      title: "Kosten dieses Meetings",
      durationLabel: "Dauer und Teilnehmer",
      elapsedPeople: (hms, head) => `${hms} / ${head} Pers.`,
      freqIntro: "Wenn dieses Meeting",
      freqOutro: "stattfindet…",
      monthLabel: "Monat",
      yearLabel: "Jahr",
      breakdownHead: "Teilnehmer",
      breakdownCost: "Kosten",
      breakdownTime: "Dauer",
      sharePreviewLabel: "Vorschau",
    },
    freq: {
      once: "Einmalig",
      weekly: "Wöchentlich",
      weekly2: "2× pro Woche",
      biweekly: "Alle 2 Wochen",
      monthly: "Monatlich",
      weekdays: "Werktäglich",
      daily: "Täglich",
    },
    freqShortInShare: {
      once: "einmalig",
      weekly: "wöchentlich",
      weekly2: "zweimal pro Woche",
      biweekly: "alle zwei Wochen",
      monthly: "monatlich",
      weekdays: "werktäglich",
      daily: "täglich",
    },
    cta: {
      title: "Meeting TimeValue Pro — in Entwicklung",
      desc: "Dieser Pilot ist ein Vorgeschmack auf das Vollprodukt.\nDie Vollversion misst, aggregiert und optimiert jedes Meeting automatisch.",
      comingSoon: "Bald verfügbar",
    },
    footer: { copy: "powered by Meeting TimeValue Pro" },
    buildShareText: ({
      durationPhrase,
      amountFormatted,
      yearlyFormatted,
      frequency,
    }) => {
      const head = `Dieses Meeting hat ${amountFormatted} in ${durationPhrase} gekostet.`;
      const tags = "#MeetingKosten #MeetingTimeValue";
      if (frequency === "once") return `${head}\n${tags}`;
      const short = TRANSLATIONS.de.freqShortInShare[frequency];
      return `${head}\nBei ${short} sind das ${yearlyFormatted}/Jahr.\n${tags}`;
    },
  },
};

// ---------- Detection ----------

const STORAGE_KEY = "mtv.locale";
const CURRENCY_STORAGE_KEY = "mtv.currency";

export function isLocale(x: unknown): x is Locale {
  return typeof x === "string" && (LOCALES as string[]).includes(x);
}

export function isCurrency(x: unknown): x is CurrencyCode {
  return typeof x === "string" && (CURRENCIES as string[]).includes(x);
}

/** Best-fit locale from a BCP-47 navigator language tag. */
export function fitNavigatorLocale(nav: string | undefined): Locale {
  if (!nav) return "ja";
  const lower = nav.toLowerCase();
  if (lower.startsWith("ja")) return "ja";
  if (lower === "en-gb" || lower.startsWith("en-gb")) return "en-GB";
  if (lower === "en-us" || lower.startsWith("en-us")) return "en-US";
  if (lower.startsWith("en")) return "en-US";
  if (lower.startsWith("fr")) return "fr";
  if (lower.startsWith("de")) return "de";
  return "ja";
}

// ---------- React context ----------

type LocaleCtx = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
  t: Dict;
  /** locale-aware money formatter */
  money: (n: number) => string;
  /** locale-aware integer formatter */
  num: (n: number) => string;
};

const Ctx = createContext<LocaleCtx | null>(null);

export function LocaleProvider({
  initialLocale,
  initialCurrency,
  children,
}: {
  initialLocale?: Locale;
  initialCurrency?: CurrencyCode;
  children: ReactNode;
}) {
  const [locale, setLocaleRaw] = useState<Locale>(initialLocale ?? "ja");
  const [currency, setCurrencyRaw] = useState<CurrencyCode>(
    initialCurrency ?? "JPY",
  );

  // After mount: resolve preferred locale/currency
  // (URL > localStorage > navigator > default)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const urlParams = new URLSearchParams(window.location.search);
    const urlLang = urlParams.get("lang");
    const urlCcy = urlParams.get("currency");

    const fromUrl = isLocale(urlLang) ? urlLang : null;
    const fromStorage = (() => {
      try {
        const s = window.localStorage.getItem(STORAGE_KEY);
        return isLocale(s) ? s : null;
      } catch {
        return null;
      }
    })();
    const fromNav = fitNavigatorLocale(navigator.language);
    const resolved = fromUrl ?? fromStorage ?? fromNav;
    setLocaleRaw(resolved);

    const ccyFromUrl = isCurrency(urlCcy) ? urlCcy : null;
    const ccyFromStorage = (() => {
      try {
        const s = window.localStorage.getItem(CURRENCY_STORAGE_KEY);
        return isCurrency(s) ? s : null;
      } catch {
        return null;
      }
    })();
    setCurrencyRaw(ccyFromUrl ?? ccyFromStorage ?? "JPY");
  }, []);

  // Reflect locale to <html lang>
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleRaw(l);
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
  }, []);

  const setCurrency = useCallback((c: CurrencyCode) => {
    setCurrencyRaw(c);
    try {
      window.localStorage.setItem(CURRENCY_STORAGE_KEY, c);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<LocaleCtx>(() => {
    const t = TRANSLATIONS[locale];
    return {
      locale,
      setLocale,
      currency,
      setCurrency,
      t,
      money: (n) => formatMoney(locale, currency, n),
      num: (n) => formatNumberFor(locale, n),
    };
  }, [locale, currency, setLocale, setCurrency]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTranslation(): LocaleCtx {
  const v = useContext(Ctx);
  if (!v) {
    throw new Error("useTranslation must be used inside <LocaleProvider>");
  }
  return v;
}
