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

const yenFormatter = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("ja-JP");

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
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-10 sm:px-10">
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
      <header className="mb-12 text-center">
        <p className="mb-3 text-xs uppercase tracking-[0.3em] text-orange-500">
          Meeting TimeValue
        </p>
        <h1 className="text-4xl font-black leading-tight tracking-tight sm:text-5xl">
          会議の
          <span className="bg-gradient-to-br from-orange-400 to-red-600 bg-clip-text text-transparent">
            値段
          </span>
          、見えてますか?
        </h1>
        <p className="mt-4 text-sm text-zinc-400 sm:text-base">
          人数と時給を入れて、いま会議で燃えているお金を見てみよう。
        </p>
      </header>

      <form
        className="space-y-6 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6 sm:p-8"
        onSubmit={(e) => {
          e.preventDefault();
          onStart();
        }}
      >
        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-300">
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
              className="w-full rounded-xl border border-zinc-700 bg-black/50 px-4 py-4 pr-16 text-2xl font-semibold tabular-nums outline-none transition focus:border-orange-500"
            />
            <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-zinc-500">
              人
            </span>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-300">
            平均時給
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-lg text-zinc-500">
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
              className="w-full rounded-xl border border-zinc-700 bg-black/50 py-4 pl-10 pr-16 text-2xl font-semibold tabular-nums outline-none transition focus:border-orange-500"
            />
            <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-zinc-500">
              /時
            </span>
          </div>
        </div>

        <button
          type="submit"
          className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-br from-orange-500 to-red-600 py-5 text-lg font-bold transition hover:shadow-[0_0_40px_rgba(249,115,22,0.4)] active:scale-[0.99]"
        >
          会議スタート ▶
        </button>

        <p className="text-center text-xs text-zinc-500">
          ※ 数字はあくまで目安。所属組織との関係性は保証しません。
        </p>
      </form>
    </div>
  );
}

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
  return (
    <div className="flex w-full max-w-3xl flex-col items-center text-center">
      <p className="mb-6 text-xs uppercase tracking-[0.3em] text-orange-500">
        Burning...
      </p>
      <div className="relative">
        <div
          className="pointer-events-none absolute inset-0 -z-10 rounded-full bg-orange-600/20 blur-3xl"
          aria-hidden
        />
        <p className="bg-gradient-to-br from-orange-300 via-orange-500 to-red-600 bg-clip-text text-7xl font-black tabular-nums text-transparent sm:text-8xl md:text-9xl">
          {yenFormatter.format(amount)}
        </p>
      </div>

      <p className="mt-8 text-2xl font-semibold tabular-nums text-zinc-300 sm:text-3xl">
        {formatDuration(elapsedSec)}
      </p>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-sm text-zinc-500">
        <span>
          <span className="tabular-nums text-zinc-300">{headcount}</span> 人
        </span>
        <span>×</span>
        <span>
          時給{" "}
          <span className="tabular-nums text-zinc-300">
            {numberFormatter.format(hourlyRate)}
          </span>
          円
        </span>
      </div>

      <button
        type="button"
        onClick={onStop}
        className="mt-16 rounded-full border border-zinc-700 bg-zinc-900/60 px-10 py-4 text-base font-semibold text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-800 active:scale-[0.99]"
      >
        終了 ⏹
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

  const shareText = `うちの会議、${minutes}分 で ${yenFormatter.format(
    amount,
  )} 燃えてた🔥\n${FREQ_LABEL_SHORT[frequency]} で続けると 年${yenFormatter.format(
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
      <header className="mb-8 text-center">
        <p className="mb-3 text-xs uppercase tracking-[0.3em] text-orange-500">
          Result
        </p>
        <h1 className="text-3xl font-black leading-tight sm:text-4xl">
          <span className="tabular-nums">{minutes}</span>分の会議で
          <br />
          <span className="bg-gradient-to-br from-orange-400 to-red-600 bg-clip-text text-transparent tabular-nums">
            {yenFormatter.format(amount)}
          </span>{" "}
          を燃やしました 🔥
        </h1>
      </header>

      {/* Frequency projection */}
      <div className="mb-6 rounded-2xl border border-orange-900/40 bg-gradient-to-br from-orange-950/40 to-red-950/30 p-5 sm:p-6">
        <div className="mb-4 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3">
          <span className="text-sm text-zinc-300">この会議が</span>
          <select
            value={frequency}
            onChange={(e) =>
              onChangeFrequency(e.target.value as FrequencyKey)
            }
            className="rounded-lg border border-orange-800/60 bg-black/60 px-3 py-2 text-sm font-semibold text-orange-200 outline-none transition focus:border-orange-500"
          >
            {FREQUENCIES.map((f) => (
              <option key={f.key} value={f.key}>
                {f.label}
              </option>
            ))}
          </select>
          <span className="text-sm text-zinc-300">だと:</span>
        </div>
        <dl className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-zinc-800 bg-black/30 px-4 py-3">
            <dt className="text-xs text-zinc-500">月</dt>
            <dd className="mt-1 text-xl font-bold tabular-nums text-orange-200 sm:text-2xl">
              {yenFormatter.format(monthly)}
            </dd>
          </div>
          <div className="rounded-xl border border-orange-700/60 bg-black/40 px-4 py-3">
            <dt className="text-xs text-orange-400">年</dt>
            <dd className="mt-1 text-xl font-black tabular-nums sm:text-2xl">
              <span className="bg-gradient-to-br from-orange-300 to-red-500 bg-clip-text text-transparent">
                {yenFormatter.format(yearly)}
              </span>
            </dd>
          </div>
        </dl>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/60">
        <div className="relative aspect-[1200/630] w-full bg-black">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ogUrl}
            alt="会議の値段 シェア用カード"
            className="h-full w-full object-cover"
          />
        </div>

        <dl className="grid grid-cols-3 divide-x divide-zinc-800 border-t border-zinc-800 text-center">
          <div className="px-3 py-4">
            <dt className="text-xs text-zinc-500">人数</dt>
            <dd className="mt-1 text-lg font-bold tabular-nums">
              {headcount}
            </dd>
          </div>
          <div className="px-3 py-4">
            <dt className="text-xs text-zinc-500">時給</dt>
            <dd className="mt-1 text-lg font-bold tabular-nums">
              ¥{numberFormatter.format(hourlyRate)}
            </dd>
          </div>
          <div className="px-3 py-4">
            <dt className="text-xs text-zinc-500">時間</dt>
            <dd className="mt-1 text-lg font-bold tabular-nums">
              {formatDuration(elapsedSec)}
            </dd>
          </div>
        </dl>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
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
          className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900/60 py-4 text-base font-semibold text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-800 active:scale-[0.99]"
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
    <aside className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-5 sm:p-6">
      <p className="text-sm text-zinc-300">
        <span className="mr-2" aria-hidden>
          🔁
        </span>
        継続して測りたい人は
      </p>
      <p className="mt-1 text-lg font-bold text-zinc-100">
        Meeting TimeValue Pro
      </p>
      <p className="mt-1 text-xs text-zinc-500">
        → 自動でMTGコストを集計・分析
      </p>
      <a
        href={url}
        {...(isLive ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        className="mt-4 inline-flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-xs font-semibold text-zinc-200 transition hover:border-orange-500 hover:text-orange-300"
      >
        詳しく見る
        <span aria-hidden>→</span>
      </a>
    </aside>
  );
}
