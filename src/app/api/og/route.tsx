import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

const yenFormatter = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("ja-JP");

const FREQ_LABEL: Record<string, string> = {
  once: "単発",
  weekly: "週1回",
  weekly2: "週2回",
  biweekly: "隔週",
  monthly: "月1回",
  weekdays: "営業日毎日",
  daily: "毎日",
};

function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  if (m === 0) return `${s}秒`;
  return `${m}分${s.toString().padStart(2, "0")}秒`;
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
  const frequencyLabel = FREQ_LABEL[frequencyRaw] ?? "";
  const yearly = Math.max(0, Number(searchParams.get("yearly") ?? 0) || 0);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background:
            "radial-gradient(ellipse at top, #1a0a05 0%, #0a0a0a 60%)",
          color: "#fafafa",
          padding: "50px 80px",
          position: "relative",
        }}
      >
        {/* Top label */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: 26,
            color: "#fb923c",
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            fontWeight: 700,
          }}
        >
          <span>Meeting Cost Counter</span>
        </div>

        {/* Centerpiece */}
        <div
          style={{
            display: "flex",
            flex: 1,
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              fontSize: 30,
              color: "#a1a1aa",
              marginBottom: 8,
              display: "flex",
            }}
          >
            この会議で燃えた金額
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 20,
            }}
          >
            <div style={{ fontSize: 80, display: "flex" }}>🔥</div>
            <div
              style={{
                fontSize: 140,
                fontWeight: 900,
                lineHeight: 1,
                background:
                  "linear-gradient(135deg, #fed7aa 0%, #f97316 45%, #dc2626 100%)",
                backgroundClip: "text",
                color: "transparent",
                letterSpacing: "-0.04em",
                display: "flex",
              }}
            >
              {yenFormatter.format(amount)}
            </div>
          </div>
          <div
            style={{
              marginTop: 18,
              fontSize: 32,
              color: "#d4d4d8",
              display: "flex",
              gap: 20,
              alignItems: "center",
              fontWeight: 600,
            }}
          >
            <span>{formatDuration(duration)}</span>
            <span style={{ color: "#52525b" }}>/</span>
            <span>{numberFormatter.format(headcount)}人</span>
          </div>

          {yearly > 0 && (
            <div
              style={{
                marginTop: 28,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "14px 36px",
                border: "2px solid rgba(249, 115, 22, 0.5)",
                borderRadius: 18,
                background: "rgba(127, 29, 29, 0.25)",
              }}
            >
              <div
                style={{
                  fontSize: 22,
                  color: "#fdba74",
                  letterSpacing: "0.1em",
                  display: "flex",
                }}
              >
                {frequencyLabel
                  ? `${frequencyLabel}で続けると 年`
                  : "年換算"}
              </div>
              <div
                style={{
                  fontSize: 72,
                  fontWeight: 900,
                  lineHeight: 1.1,
                  display: "flex",
                  background:
                    "linear-gradient(135deg, #fde68a 0%, #f97316 100%)",
                  backgroundClip: "text",
                  color: "transparent",
                  letterSpacing: "-0.03em",
                }}
              >
                {yenFormatter.format(yearly)}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 26,
            color: "#71717a",
            borderTop: "1px solid #27272a",
            paddingTop: 20,
          }}
        >
          <div style={{ display: "flex", color: "#fafafa", fontWeight: 700 }}>
            会議の値段
          </div>
          <div style={{ display: "flex" }}>#会議の値段</div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
