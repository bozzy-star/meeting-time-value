"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { track } from "@vercel/analytics";

type View = "form" | "running" | "result";

type FrequencyKey =
  | "once"
  | "weekly"
  | "weekly2"
  | "biweekly"
  | "monthly"
  | "weekdays"
  | "daily";

const FREQUENCIES: {
  key: FrequencyKey;
  label: string;
  perYear: number;
}[] = [
  { key: "once", label: "単発 (1回のみ)", perYear: 1 },
  { key: "weekly", label: "週1回", perYear: 52 },
  { key: "weekly2", label: "週2回", perYear: 104 },
  { key: "biweekly", label: "隔週 (2週に1回)", perYear: 26 },
  { key: "monthly", label: "月1回", perYear: 12 },
  { key: "weekdays", label: "営業日毎日 (週5)", perYear: 250 },
  { key: "daily", label: "毎日 (週7)", perYear: 365 },
];

const FREQ_LABEL_SHORT: Record<FrequencyKey, string> = {
  once: "単発",
  weekly: "週1回",
  weekly2: "週2回",
  biweekly: "隔週",
  monthly: "月1回",
  weekdays: "営業日毎日",
  daily: "毎日",
};

// Use ¥ (U+00A5 YEN SIGN) instead of Intl's ￥ (U+FFE5 FULLWIDTH YEN SIGN),
// which is missing from Noto Sans JP "latin" subset and renders as tofu (□).
const numberFormatter = new Intl.NumberFormat("ja-JP");
function formatYen(n: number): string {
  return `¥${numberFormatter.format(Math.round(n))}`;
}

function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  if (m === 0) return `${s}秒`;
  return `${m}分${s.toString().padStart(2, "0")}秒`;
}

function calcAmount(
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

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16 sm:px-10 sm:py-24">
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
  return (
    <div className="w-full max-w-xl">
      <header className="mb-16 text-center">
        <h1 className="text-4xl font-black leading-tight tracking-tight sm:text-5xl">
          会議の<span className="text-orange-500">値段</span>、
          <br className="sm:hidden" />
          見えてますか?
        </h1>
        <p className="mt-5 text-sm text-zinc-500 sm:text-base">
          人数と時給を入れるだけ。リアルタイムで会議のコストが見えます。
        </p>
      </header>

      <form
        className="space-y-7"
        onSubmit={(e) => {
          e.preventDefault();
          onStart();
        }}
      >
        <div>
          <label className="mb-2 block text-xs font-medium tracking-wide text-zinc-500">
            参加人数
          </label>
          <div className="relative">
            <input
              type="number"
              min={1}
              step={1}
              value={headcount}
              onChange={(e) =>
                onChangeHeadcount(Math.max(1, Number(e.target.value) || 0))
              }
              className="w-full rounded-xl border border-zinc-800 bg-transparent px-4 py-4 pr-12 text-2xl font-semibold tabular-nums outline-none transition focus:border-orange-500"
            />
            <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-zinc-600">
              人
            </span>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-medium tracking-wide text-zinc-500">
            平均時給
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-lg text-zinc-600">
              ¥
            </span>
            <input
              type="number"
              min={0}
              step={100}
              value={hourlyRate}
              onChange={(e) =>
                onChangeHourlyRate(Math.max(0, Number(e.target.value) || 0))
              }
              className="w-full rounded-xl border border-zinc-800 bg-transparent py-4 pl-10 pr-12 text-2xl font-semibold tabular-nums outline-none transition focus:border-orange-500"
            />
            <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-zinc-600">
              /時
            </span>
          </div>
        </div>

        <button
          type="submit"
          className="w-full rounded-xl bg-orange-500 py-5 text-base font-bold text-white transition hover:bg-orange-400 active:scale-[0.99]"
        >
          会議スタート
        </button>

        <p className="text-center text-xs text-zinc-600">
          ※ 数字はあくまで目安です。
        </p>
      </form>
    </div>
  );
}

type FloatItem = { id: number; value: number };

function RunningView({
  amount,
  elapsedSec,
  headcount,
  hourlyRate,
  onStop,
}: {
  amount: number;
  elapsedSec: number;
  headcount: number;
  hourlyRate: number;
  onStop: () => void;
}) {
  // Floating "+¥XX" markers — fly upward when amount increases
  const prevRef = useRef(amount);
  const idRef = useRef(0);
  const [floats, setFloats] = useState<FloatItem[]>([]);

  useEffect(() => {
    const delta = amount - prevRef.current;
    prevRef.current = amount;
    if (delta <= 0) return;
    const id = ++idRef.current;
    setFloats((prev) => [...prev, { id, value: delta }]);
    const t = window.setTimeout(() => {
      setFloats((prev) => prev.filter((f) => f.id !== id));
    }, 700);
    return () => window.clearTimeout(t);
  }, [amount]);

  return (
    <div className="flex w-full max-w-3xl flex-col items-center text-center">
      <div className="relative">
        <p className="text-7xl font-black tabular-nums tracking-tight text-orange-500 sm:text-8xl md:text-9xl">
          {formatYen(amount)}
        </p>
        {/* Floating delta markers */}
        <div
          className="pointer-events-none absolute inset-x-0 -top-4 flex justify-center"
          aria-hidden
        >
          {floats.map((f) => (
            <span
              key={f.id}
              className="absolute select-none text-xl font-bold tabular-nums text-orange-300/80 sm:text-2xl"
              style={{ animation: "fly-up 0.7s ease-out forwards" }}
            >
              +{formatYen(f.value)}
            </span>
          ))}
        </div>
      </div>

      <p className="mt-10 text-xl font-medium tabular-nums text-zinc-400 sm:text-2xl">
        {formatDuration(elapsedSec)}
      </p>

      <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-zinc-600">
        <span>
          <span className="tabular-nums text-zinc-400">{headcount}</span>人
        </span>
        <span>×</span>
        <span>
          時給{" "}
          <span className="tabular-nums text-zinc-400">
            {numberFormatter.format(hourlyRate)}
          </span>
          円
        </span>
      </div>

      <button
        type="button"
        onClick={onStop}
        className="mt-20 rounded-full border border-zinc-800 px-10 py-4 text-sm font-semibold text-zinc-300 transition hover:border-zinc-600 hover:text-white active:scale-[0.99]"
      >
        終了
      </button>
    </div>
  );
}

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
  const elapsedSec = Math.max(1, Math.floor(elapsedMs / 1000));
  const minutes = Math.max(1, Math.round(elapsedSec / 60));
  const freq = getFrequency(frequency);
  const yearly = amount * freq.perYear;
  const monthly = Math.round(yearly / 12);

  const ogUrl = `/api/og?amount=${amount}&duration=${elapsedSec}&headcount=${headcount}&frequency=${frequency}&yearly=${yearly}`;

  const shareText = `うちの会議、${formatDuration(elapsedSec)} で ${formatYen(
    amount,
  )} 使ってた💸\n${FREQ_LABEL_SHORT[frequency]} で続けると 年${formatYen(
    yearly,
  )}…\n#会議の値段`;

  // Share URL embeds full result state so opener sees same numbers
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
    setShareUrl(u.toString());
  }, [amount, elapsedSec, headcount, hourlyRate, frequency]);

  const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    shareText,
  )}${shareUrl ? `&url=${encodeURIComponent(shareUrl)}` : ""}`;

  return (
    <div className="w-full max-w-2xl">
      <header className="mb-12 text-center">
        <p className="text-sm text-zinc-500">
          <span className="tabular-nums">{minutes}</span>分の会議で使った金額
        </p>
        <h1 className="mt-3 text-5xl font-black leading-none tracking-tight text-orange-500 tabular-nums sm:text-6xl">
          {formatYen(amount)}
        </h1>
      </header>

      {/* Frequency projection — borderless, soft tint */}
      <div className="mb-10 rounded-2xl bg-zinc-950/50 p-6 sm:p-8">
        <div className="mb-5 flex flex-col items-start gap-2 text-sm text-zinc-400 sm:flex-row sm:items-center sm:gap-3">
          <span>この会議が</span>
          <select
            value={frequency}
            onChange={(e) =>
              onChangeFrequency(e.target.value as FrequencyKey)
            }
            className="rounded-lg bg-black/60 px-3 py-2 text-sm font-semibold text-zinc-200 outline-none transition focus:ring-1 focus:ring-orange-500"
          >
            {FREQUENCIES.map((f) => (
              <option key={f.key} value={f.key}>
                {f.label}
              </option>
            ))}
          </select>
          <span>だと:</span>
        </div>
        <dl className="grid grid-cols-2 gap-6">
          <div>
            <dt className="text-xs text-zinc-500">月</dt>
            <dd className="mt-1 text-2xl font-bold tabular-nums text-zinc-200 sm:text-3xl">
              {formatYen(monthly)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-orange-400">年</dt>
            <dd className="mt-1 text-2xl font-black tabular-nums text-orange-400 sm:text-3xl">
              {formatYen(yearly)}
            </dd>
          </div>
        </dl>
      </div>

      <div className="overflow-hidden rounded-2xl bg-zinc-950/50">
        <div className="relative aspect-[1200/630] w-full bg-black">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ogUrl}
            alt="会議の値段 シェア用カード"
            className="h-full w-full object-cover"
          />
        </div>

        <dl className="grid grid-cols-3 text-center">
          <div className="px-3 py-4">
            <dt className="text-xs text-zinc-500">人数</dt>
            <dd className="mt-1 text-base font-semibold tabular-nums text-zinc-300">
              {headcount}
            </dd>
          </div>
          <div className="px-3 py-4">
            <dt className="text-xs text-zinc-500">時給</dt>
            <dd className="mt-1 text-base font-semibold tabular-nums text-zinc-300">
              {formatYen(hourlyRate)}
            </dd>
          </div>
          <div className="px-3 py-4">
            <dt className="text-xs text-zinc-500">時間</dt>
            <dd className="mt-1 text-base font-semibold tabular-nums text-zinc-300">
              {formatDuration(elapsedSec)}
            </dd>
          </div>
        </dl>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <a
          href={xUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() =>
            track("share_clicked", {
              frequency,
              yearly_amount: yearly,
            })
          }
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white py-4 text-base font-bold text-black transition hover:bg-zinc-200 active:scale-[0.99]"
        >
          <span className="text-lg font-black">𝕏</span>
          でシェア
        </a>
        <button
          type="button"
          onClick={onReset}
          className="flex-1 rounded-xl border border-zinc-800 py-4 text-base font-semibold text-zinc-300 transition hover:border-zinc-600 hover:text-white active:scale-[0.99]"
        >
          もう一度測る
        </button>
      </div>

      <MtvproCTA />
    </div>
  );
}

function MtvproCTA() {
  const url = process.env.NEXT_PUBLIC_MTVPRO_URL || "#";
  const isLive = url !== "#";
  return (
    <aside className="mt-10 rounded-2xl bg-zinc-950/40 p-6">
      <p className="text-xs text-zinc-500">継続して測りたい人は</p>
      <p className="mt-1 text-base font-bold text-zinc-200">
        Meeting TimeValue Pro
      </p>
      <p className="mt-1 text-xs text-zinc-500">
        自動でMTGコストを集計・分析
      </p>
      <a
        href={url}
        {...(isLive ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-orange-400 transition hover:text-orange-300"
      >
        詳しく見る
        <span aria-hidden>→</span>
      </a>
    </aside>
  );
}
