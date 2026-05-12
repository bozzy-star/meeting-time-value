"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { track } from "@vercel/analytics";
import { MoneyFly } from "./_components/MoneyFly";
import {
  CURRENCIES,
  CURRENCY_SYMBOL,
  TRANSLATIONS,
  bgSymbolFor,
  formatHMS,
  formatDurationPhrase,
  formatMoney,
  formatNumberFor,
  isCurrency,
  type CurrencyCode,
  type FrequencyKey,
  type Locale,
  useTranslation,
} from "./_lib/i18n";

type View = "form" | "running" | "result";

const FREQUENCIES: { key: FrequencyKey; perYear: number }[] = [
  { key: "once", perYear: 1 },
  { key: "weekly", perYear: 52 },
  { key: "weekly2", perYear: 104 },
  { key: "biweekly", perYear: 26 },
  { key: "monthly", perYear: 12 },
  { key: "weekdays", perYear: 250 },
  { key: "daily", perYear: 365 },
];

// Convert fullwidth digits (０-９) to halfwidth and strip non-digits.
function toHalfDigits(s: string): string {
  return s
    .replace(/[０-９]/g, (c) =>
      String.fromCharCode(c.charCodeAt(0) - 0xfee0),
    )
    .replace(/[^0-9]/g, "");
}

function calcAmount(
  // State name kept as `hourlyRate` for backwards compat with share URLs and
  // analytics props; UI label is the localized "コスト" / "cost" / "coût" / "Kosten".
  hourlyRate: number,
  headcount: number,
  elapsedMs: number,
): number {
  const elapsedSec = elapsedMs / 1000;
  return Math.floor((hourlyRate / 3600) * elapsedSec * headcount);
}

function getFrequency(key: FrequencyKey) {
  return FREQUENCIES.find((f) => f.key === key) ?? FREQUENCIES[1];
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Home />
    </Suspense>
  );
}

function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale, currency, setCurrency } = useTranslation();

  const initialFromUrl = useMemo(() => {
    if (searchParams.get("result") !== "1") return null;
    const amount = Math.max(0, Number(searchParams.get("amount") ?? 0) || 0);
    const duration = Math.max(
      0,
      Number(searchParams.get("duration") ?? 0) || 0,
    );
    const headcount = Math.max(
      1,
      Number(searchParams.get("headcount") ?? 1) || 1,
    );
    const hourly = Math.max(
      0,
      Number(searchParams.get("hourly") ?? 0) || 0,
    );
    const freqRaw = (searchParams.get("frequency") ??
      "weekly") as FrequencyKey;
    const frequency: FrequencyKey =
      FREQUENCIES.some((f) => f.key === freqRaw) ? freqRaw : "weekly";
    return { amount, duration, headcount, hourly, frequency };
  }, [searchParams]);

  // Sync currency from URL on result page so opened share links inherit it.
  useEffect(() => {
    const c = searchParams.get("currency");
    if (isCurrency(c) && c !== currency) {
      setCurrency(c);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const [view, setView] = useState<View>(initialFromUrl ? "result" : "form");
  const [headcount, setHeadcount] = useState(initialFromUrl?.headcount ?? 8);
  const [hourlyRate, setHourlyRate] = useState(
    initialFromUrl?.hourly ?? 5000,
  );

  // Running state
  const [elapsedMs, setElapsedMs] = useState(0);
  const startRef = useRef<number | null>(null);
  const tickRef = useRef<number | null>(null);

  // Result snapshot
  const [finalElapsedMs, setFinalElapsedMs] = useState(
    (initialFromUrl?.duration ?? 0) * 1000,
  );
  const [finalAmount, setFinalAmount] = useState(initialFromUrl?.amount ?? 0);
  const [finalHeadcount, setFinalHeadcount] = useState(
    initialFromUrl?.headcount ?? 0,
  );
  const [finalHourlyRate, setFinalHourlyRate] = useState(
    initialFromUrl?.hourly ?? 0,
  );
  const [frequency, setFrequency] = useState<FrequencyKey>(
    initialFromUrl?.frequency ?? "weekly",
  );

  useEffect(() => {
    if (view !== "running") return;
    startRef.current = performance.now();
    setElapsedMs(0);
    const tick = () => {
      if (startRef.current != null) {
        setElapsedMs(performance.now() - startRef.current);
      }
      tickRef.current = window.setTimeout(tick, 100);
    };
    tickRef.current = window.setTimeout(tick, 100);
    return () => {
      if (tickRef.current != null) {
        window.clearTimeout(tickRef.current);
        tickRef.current = null;
      }
    };
  }, [view]);

  const startMeeting = () => {
    if (headcount < 1 || hourlyRate < 0) return;
    track("meeting_started", {
      headcount,
      hourly_rate: hourlyRate,
      currency,
      locale,
    });
    setView("running");
  };

  const stopMeeting = () => {
    const finishedMs =
      startRef.current != null ? performance.now() - startRef.current : 0;
    const amount = calcAmount(hourlyRate, headcount, finishedMs);
    track("meeting_ended", {
      duration_seconds: Math.floor(finishedMs / 1000),
      headcount,
      hourly_rate: hourlyRate,
      amount,
      currency,
      locale,
    });
    setFinalElapsedMs(finishedMs);
    setFinalAmount(amount);
    setFinalHeadcount(headcount);
    setFinalHourlyRate(hourlyRate);
    setFrequency("weekly");
    setView("result");
  };

  const resetAll = () => {
    setView("form");
    setElapsedMs(0);
    if (searchParams.get("result") === "1") {
      router.replace("/");
    }
  };

  const liveAmount = calcAmount(hourlyRate, headcount, elapsedMs);
  const elapsedSecForDisplay = Math.floor(elapsedMs / 1000);
  const isRunning = view === "running";

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-20 sm:px-10 sm:py-28">
      {view === "form" && (
        <FormView
          headcount={headcount}
          hourlyRate={hourlyRate}
          onChangeHeadcount={setHeadcount}
          onChangeHourlyRate={setHourlyRate}
          onStart={startMeeting}
        />
      )}
      {view === "running" && (
        <RunningView
          amount={liveAmount}
          elapsedSec={elapsedSecForDisplay}
          headcount={headcount}
          hourlyRate={hourlyRate}
          running={isRunning}
          onStop={stopMeeting}
        />
      )}
      {view === "result" && (
        <ResultView
          amount={finalAmount}
          elapsedMs={finalElapsedMs}
          headcount={finalHeadcount}
          hourlyRate={finalHourlyRate}
          frequency={frequency}
          onChangeFrequency={setFrequency}
          onReset={resetAll}
        />
      )}
    </main>
  );
}

// ---------- Hero background pattern (per-currency, inline style) ----------

function heroBgStyle(currency: CurrencyCode): React.CSSProperties {
  const sym = encodeURIComponent(bgSymbolFor(currency));
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='90' height='90'><text x='12' y='42' font-family='system-ui,sans-serif' font-size='34' font-weight='800' fill='%23ea580c' opacity='0.05'>${sym}</text><text x='56' y='80' font-family='system-ui,sans-serif' font-size='22' font-weight='700' fill='%23ea580c' opacity='0.04'>${sym}</text></svg>`;
  return {
    backgroundImage: `url("data:image/svg+xml;utf8,${svg}")`,
    backgroundRepeat: "repeat",
    backgroundSize: "90px 90px",
  };
}

// ---------- Currency tab selector ----------

function CurrencyTabs({
  value,
  onChange,
  label,
}: {
  value: CurrencyCode;
  onChange: (c: CurrencyCode) => void;
  label: string;
}) {
  return (
    <div>
      <div className="mb-2 text-xs font-medium tracking-wide text-neutral-500">
        {label}
      </div>
      <div className="flex gap-2">
        {CURRENCIES.map((c) => {
          const active = c === value;
          return (
            <button
              key={c}
              type="button"
              onClick={() => onChange(c)}
              aria-pressed={active}
              className={`min-h-[44px] flex-1 rounded-xl border px-3 py-2 text-lg font-semibold tabular-nums transition ${
                active
                  ? "border-orange-600 bg-orange-50 text-orange-600"
                  : "border-neutral-200 bg-white text-neutral-500 hover:border-neutral-400 hover:text-neutral-700"
              }`}
            >
              {CURRENCY_SYMBOL[c]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------- FormView ----------

function FormView({
  headcount,
  hourlyRate,
  onChangeHeadcount,
  onChangeHourlyRate,
  onStart,
}: {
  headcount: number;
  hourlyRate: number;
  onChangeHeadcount: (n: number) => void;
  onChangeHourlyRate: (n: number) => void;
  onStart: () => void;
}) {
  const { t, currency, setCurrency } = useTranslation();
  const symbol = CURRENCY_SYMBOL[currency];

  const handleInput =
    (setter: (n: number) => void, min: number) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const half = toHalfDigits(e.target.value);
      const parsed = half === "" ? 0 : Number.parseInt(half, 10);
      setter(Math.max(min, Number.isFinite(parsed) ? parsed : 0));
    };

  return (
    <div className="w-full max-w-xl">
      <header
        className="relative -mx-6 mb-20 px-6 py-12 text-center sm:-mx-10 sm:px-10 sm:py-16"
        style={heroBgStyle(currency)}
      >
        <MoneyFly
          size={48}
          className="animate-float-up mx-auto mb-6 sm:hidden"
        />
        <MoneyFly
          size={60}
          className="animate-float-up mx-auto mb-6 hidden sm:block"
        />
        <h1 className="text-4xl font-semibold leading-[1.25] tracking-tight text-neutral-900 [text-wrap:balance] sm:text-5xl">
          <span className="whitespace-nowrap">
            <HeroTitleColored part={t.hero.titlePart1} />
          </span>{" "}
          <span className="whitespace-nowrap">{t.hero.titlePart2}</span>
        </h1>
        <p className="mt-6 text-sm text-neutral-500 sm:text-base">
          {t.hero.sub}
        </p>
      </header>

      <form
        className="space-y-8"
        onSubmit={(e) => {
          e.preventDefault();
          onStart();
        }}
      >
        <CurrencyTabs
          value={currency}
          onChange={setCurrency}
          label={t.form.currencyLabel}
        />

        <div>
          <label
            htmlFor="headcount"
            className="mb-2 block text-xs font-medium tracking-wide text-neutral-500"
          >
            {t.form.headcountLabel}
          </label>
          <div className="relative">
            <input
              id="headcount"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              value={headcount === 0 ? "" : String(headcount)}
              onChange={handleInput(onChangeHeadcount, 1)}
              className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-4 pr-14 text-base font-semibold tabular-nums text-neutral-900 outline-none transition focus:border-orange-600 sm:text-2xl"
            />
            <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-neutral-400">
              {t.form.headcountSuffix}
            </span>
          </div>
        </div>

        <div>
          <label
            htmlFor="cost"
            className="mb-2 block text-xs font-medium tracking-wide text-neutral-500"
          >
            {t.form.costLabel}
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-lg text-neutral-400">
              {symbol}
            </span>
            <input
              id="cost"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              value={hourlyRate === 0 ? "" : String(hourlyRate)}
              onChange={handleInput(onChangeHourlyRate, 0)}
              className="w-full rounded-xl border border-neutral-200 bg-white py-4 pl-10 pr-14 text-base font-semibold tabular-nums text-neutral-900 outline-none transition focus:border-orange-600 sm:text-2xl"
            />
            <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-neutral-400">
              {t.form.costSuffix}
            </span>
          </div>
        </div>

        <button
          type="submit"
          className="min-h-[44px] w-full rounded-xl bg-orange-600 py-5 text-base font-semibold text-white transition hover:bg-orange-700 active:scale-[0.99]"
        >
          {t.button.start}
        </button>

        <p className="text-center text-xs text-neutral-400">{t.form.note}</p>
      </form>
    </div>
  );
}

/**
 * Renders the localized title fragment with an orange accent applied
 * to a fixed marker substring per locale. Falls back to whole-string
 * orange if no marker found.
 */
function HeroTitleColored({ part }: { part: string }) {
  // Markers chosen so the "money / cost / coût / Kosten" word pops.
  const markers: { needle: string; before?: string; after?: string }[] = [
    { needle: "値段" },
    { needle: "cost" },
    { needle: "coût" },
    { needle: "kostet" },
    { needle: "Kosten" },
    { needle: "Meeting" },
  ];
  for (const { needle } of markers) {
    const idx = part.toLowerCase().indexOf(needle.toLowerCase());
    if (idx >= 0) {
      const before = part.slice(0, idx);
      const hit = part.slice(idx, idx + needle.length);
      const after = part.slice(idx + needle.length);
      return (
        <>
          {before}
          <span className="text-orange-600">{hit}</span>
          {after}
        </>
      );
    }
  }
  return <>{part}</>;
}

// ---------- RunningView (popcorn burst + i18n) ----------

type Pop = {
  id: number;
  x: number;
  midX: number;
  dx: number;
  peakY: number;
  finalY: number;
  rot: number;
  size: number;
};

function RunningView({
  amount,
  elapsedSec,
  headcount,
  hourlyRate,
  running,
  onStop,
}: {
  amount: number;
  elapsedSec: number;
  headcount: number;
  hourlyRate: number;
  running: boolean;
  onStop: () => void;
}) {
  const { t, locale, currency, money, num } = useTranslation();
  const symbol = CURRENCY_SYMBOL[currency];

  // Popcorn-burst ¥/$/£/€ particles
  const [pops, setPops] = useState<Pop[]>([]);
  const seqRef = useRef(0);

  useEffect(() => {
    if (!running) return;
    let cancelled = false;
    let timeoutId: number | null = null;

    const fire = () => {
      if (cancelled) return;
      seqRef.current += 1;
      const id = seqRef.current;
      const dx = Math.random() * 100 - 50;
      const p: Pop = {
        id,
        x: Math.random() * 300 - 150,
        midX: dx * 0.5,
        dx,
        peakY: -80 - Math.random() * 60,
        finalY: -56 - Math.random() * 40,
        rot: Math.random() * 180 - 90,
        size: 1.5 + Math.random() * 0.7,
      };
      setPops((prev) => [...prev.slice(-4), p]);
      window.setTimeout(() => {
        setPops((prev) => prev.filter((x) => x.id !== id));
      }, 1300);
      const next = 100 + Math.random() * 150;
      timeoutId = window.setTimeout(fire, next);
    };

    timeoutId = window.setTimeout(fire, 200);
    return () => {
      cancelled = true;
      if (timeoutId != null) window.clearTimeout(timeoutId);
    };
  }, [running]);

  return (
    <div className="flex w-full max-w-3xl flex-col items-center text-center">
      <div className="relative">
        <div
          className="pointer-events-none absolute inset-x-0 -top-12 h-16 overflow-visible"
          aria-hidden
        >
          {pops.map((p) => (
            <span
              key={p.id}
              className="pop-particle tabular-nums"
              style={
                {
                  fontSize: `${p.size}rem`,
                  ["--start-x" as string]: `${p.x}px`,
                  ["--mid-x" as string]: `${p.midX}px`,
                  ["--dx" as string]: `${p.dx}px`,
                  ["--peak-y" as string]: `${p.peakY}px`,
                  ["--final-y" as string]: `${p.finalY}px`,
                  ["--rot" as string]: `${p.rot}deg`,
                } as React.CSSProperties
              }
            >
              {symbol}
            </span>
          ))}
        </div>

        <p className="text-7xl font-semibold tabular-nums tracking-tight text-orange-600 sm:text-8xl md:text-9xl">
          {money(amount)}
        </p>
      </div>

      <p className="mt-12 text-xl font-medium tabular-nums text-neutral-600 sm:text-2xl">
        {formatHMS(elapsedSec)}
      </p>

      <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-neutral-400">
        <span>
          <span className="tabular-nums text-neutral-600">{headcount}</span>
          {locale === "ja" ? t.running.peopleSuffix : ` ${t.running.peopleSuffix}`}
        </span>
        <span>×</span>
        <span>
          {t.running.breakdownCostPrefix}
          {symbol}
          <span className="tabular-nums text-neutral-600">
            {num(hourlyRate)}
          </span>
          {t.running.breakdownCostSuffix}
        </span>
      </div>

      <button
        type="button"
        onClick={onStop}
        className="mt-24 min-h-[44px] rounded-full border border-neutral-200 bg-white px-10 py-4 text-sm font-semibold text-neutral-700 transition hover:border-neutral-400 hover:text-neutral-900 active:scale-[0.99]"
      >
        {t.button.end}
      </button>
    </div>
  );
}

// ---------- ResultView ----------

function ResultView({
  amount,
  elapsedMs,
  headcount,
  hourlyRate,
  frequency,
  onChangeFrequency,
  onReset,
}: {
  amount: number;
  elapsedMs: number;
  headcount: number;
  hourlyRate: number;
  frequency: FrequencyKey;
  onChangeFrequency: (f: FrequencyKey) => void;
  onReset: () => void;
}) {
  const { t, locale, currency, money } = useTranslation();

  const elapsedSec = Math.max(1, Math.floor(elapsedMs / 1000));
  const hms = formatHMS(elapsedSec);
  const freq = getFrequency(frequency);
  const yearly = amount * freq.perYear;
  const monthly = Math.round(yearly / 12);

  const ogUrl = `/api/og?amount=${amount}&duration=${elapsedSec}&headcount=${headcount}&frequency=${frequency}&yearly=${yearly}&currency=${currency}&lang=${encodeURIComponent(locale)}`;

  const shareText = t.buildShareText({
    durationPhrase: formatDurationPhrase(locale, elapsedSec),
    amountFormatted: money(amount),
    yearlyFormatted: money(yearly),
    frequency,
  });

  const [shareUrl, setShareUrl] = useState("");
  useEffect(() => {
    if (typeof window === "undefined") return;
    const u = new URL(window.location.origin + "/");
    u.searchParams.set("result", "1");
    u.searchParams.set("amount", String(amount));
    u.searchParams.set("duration", String(elapsedSec));
    u.searchParams.set("headcount", String(headcount));
    u.searchParams.set("hourly", String(hourlyRate));
    u.searchParams.set("frequency", frequency);
    u.searchParams.set("currency", currency);
    u.searchParams.set("lang", locale);
    setShareUrl(u.toString());
  }, [
    amount,
    elapsedSec,
    headcount,
    hourlyRate,
    frequency,
    currency,
    locale,
  ]);

  const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    shareText,
  )}${shareUrl ? `&url=${encodeURIComponent(shareUrl)}` : ""}`;

  return (
    <div className="w-full max-w-2xl">
      <header className="mb-14 text-center">
        <p className="flex items-center justify-center gap-3 text-sm text-neutral-500">
          <MoneyFly size={26} />
          <span>{t.result.title}</span>
        </p>
        <div className="py-12 md:py-16">
          <h1 className="mt-6 text-7xl font-semibold leading-none tracking-tight text-orange-600 tabular-nums sm:text-8xl md:text-9xl">
            {money(amount)}
          </h1>
          <p className="mt-12 text-sm tracking-wide text-neutral-500">
            {t.result.durationLabel}
          </p>
          <p className="mt-2 text-base font-medium tabular-nums text-neutral-700">
            {t.result.elapsedPeople(hms, headcount)}
          </p>
        </div>
      </header>

      {/* Frequency projection */}
      <div className="mb-12 rounded-2xl bg-neutral-50 p-6 sm:p-8">
        <div className="mb-6 flex flex-col items-start gap-2 text-sm text-neutral-600 md:flex-row md:items-center md:justify-between md:gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <span>{t.result.freqIntro}</span>
            <select
              value={frequency}
              onChange={(e) =>
                onChangeFrequency(e.target.value as FrequencyKey)
              }
              className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold text-neutral-900 outline-none transition focus:ring-1 focus:ring-orange-600"
            >
              {FREQUENCIES.map((f) => (
                <option key={f.key} value={f.key}>
                  {t.freq[f.key]}
                </option>
              ))}
            </select>
          </div>
          <span className="text-xs text-neutral-500 md:text-sm">
            {t.result.freqOutro}
          </span>
        </div>
        <dl className="grid grid-cols-2 gap-6">
          <div>
            <dt className="text-xs text-neutral-500">{t.result.monthLabel}</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums text-neutral-900 sm:text-3xl">
              {money(monthly)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-orange-600">{t.result.yearLabel}</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums text-orange-600 sm:text-3xl">
              {money(yearly)}
            </dd>
          </div>
        </dl>
      </div>

      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
        <div className="relative aspect-[1200/630] w-full bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ogUrl}
            alt={t.result.title}
            className="h-full w-full object-cover"
          />
        </div>

        <dl className="grid grid-cols-3 border-t border-neutral-200 text-center">
          <div className="px-3 py-4">
            <dt className="text-xs text-neutral-500">
              {t.result.breakdownHead}
            </dt>
            <dd className="mt-1 text-base font-semibold tabular-nums text-neutral-500">
              {headcount}
            </dd>
          </div>
          <div className="px-3 py-4">
            <dt className="text-xs text-neutral-500">
              {t.result.breakdownCost}
            </dt>
            <dd className="mt-1 text-base font-semibold tabular-nums text-neutral-500">
              {money(hourlyRate)}
            </dd>
          </div>
          <div className="px-3 py-4">
            <dt className="text-xs text-neutral-500">
              {t.result.breakdownTime}
            </dt>
            <dd className="mt-1 text-base font-semibold tabular-nums text-neutral-500">
              {hms}
            </dd>
          </div>
        </dl>
      </div>

      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <a
          href={xUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() =>
            track("share_clicked", {
              frequency,
              yearly_amount: yearly,
              currency,
              locale,
            })
          }
          className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-neutral-900 py-4 text-base font-semibold text-white transition hover:bg-neutral-800 active:scale-[0.99]"
        >
          <span className="text-lg font-black">𝕏</span>
          {t.button.share}
        </a>
        <button
          type="button"
          onClick={onReset}
          className="min-h-[44px] flex-1 rounded-xl border border-neutral-200 bg-white py-4 text-base font-semibold text-neutral-700 transition hover:border-neutral-400 hover:text-neutral-900 active:scale-[0.99]"
        >
          {t.button.restart}
        </button>
      </div>

      <SharePreview text={shareText} label={t.result.sharePreviewLabel} />

      <MtvproCTA />
    </div>
  );
}

function SharePreview({ text, label }: { text: string; label: string }) {
  return (
    <details className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-xs text-neutral-600">
      <summary className="flex cursor-pointer select-none items-center gap-2 font-medium text-neutral-500">
        <span aria-hidden>📤</span>
        {label}
      </summary>
      <pre className="mt-3 whitespace-pre-wrap break-words font-sans text-xs leading-relaxed text-neutral-700">
        {text}
      </pre>
    </details>
  );
}

function MtvproCTA() {
  const { t } = useTranslation();
  return (
    <aside className="mt-12 rounded-2xl border border-neutral-200 p-6 text-center sm:p-8">
      <p className="text-base font-semibold text-neutral-900">
        {t.cta.title}
      </p>
      <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-neutral-600">
        {t.cta.desc}
      </p>
      <p className="mt-5 text-xs font-medium tracking-wide text-orange-600">
        {t.cta.comingSoon}
      </p>
    </aside>
  );
}
