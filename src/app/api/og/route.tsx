import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

const numberFormatter = new Intl.NumberFormat("ja-JP");
function formatYen(n: number): string {
  // Use ¥ (U+00A5), not Intl's ￥ (U+FFE5) which is missing from
  // many web fonts (renders as tofu).
  return `¥${numberFormatter.format(Math.round(n))}`;
}

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

// Fetch Noto Sans JP from Google Fonts so Satori has a font that covers
// Japanese glyphs. Cached at the edge after first request.
async function loadFont(text: string): Promise<ArrayBuffer | null> {
  try {
    // Ask Google Fonts for a stylesheet covering exactly the chars we need.
    const cssUrl = `https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@700;900&text=${encodeURIComponent(
      text,
    )}`;
    const cssRes = await fetch(cssUrl, {
      headers: {
        // googleapis returns woff2 if a modern UA is set; ttf for older UAs.
        // Satori needs ttf/otf/woff. Force a UA that yields ttf.
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_6_8) AppleWebKit/534.30 (KHTML, like Gecko) Version/5.1 Safari/534.30",
      },
    });
    if (!cssRes.ok) return null;
    const css = await cssRes.text();
    const match = css.match(/src:\s*url\((https:[^)]+)\)\s*format\(['"]?truetype['"]?\)/);
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
  const frequencyLabel = FREQ_LABEL[frequencyRaw] ?? "";
  const yearly = Math.max(0, Number(searchParams.get("yearly") ?? 0) || 0);

  // All Japanese text and the ¥ glyph used in this image.
  const textForFont =
    "この会議で使った金額MeetingTimeValue人分秒円週月年隔営業日毎単回続けると換算#値段見えますか0123456789¥,";

  const fontData = await loadFont(textForFont);
  const fonts = fontData
    ? [
        {
          name: "Noto Sans JP",
          data: fontData,
          weight: 900 as const,
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
          background: "#0a0a0a",
          color: "#fafafa",
          padding: "70px 90px",
          fontFamily: "Noto Sans JP, sans-serif",
        }}
      >
        {/* Centerpiece */}
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
              color: "#71717a",
              marginBottom: 20,
              display: "flex",
            }}
          >
            この会議で使った金額
          </div>
          <div
            style={{
              fontSize: 200,
              fontWeight: 900,
              lineHeight: 1,
              color: "#f97316",
              letterSpacing: "-0.04em",
              display: "flex",
            }}
          >
            {formatYen(amount)}
          </div>
          <div
            style={{
              marginTop: 28,
              fontSize: 36,
              color: "#a1a1aa",
              display: "flex",
              gap: 20,
              alignItems: "center",
              fontWeight: 700,
            }}
          >
            <span>{formatDuration(duration)}</span>
            <span style={{ color: "#3f3f46" }}>/</span>
            <span>{numberFormatter.format(headcount)}人</span>
          </div>

          {yearly > 0 && (
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
                  color: "#71717a",
                  display: "flex",
                  marginBottom: 6,
                }}
              >
                {frequencyLabel
                  ? `${frequencyLabel}で続けると 年`
                  : "年換算"}
              </div>
              <div
                style={{
                  fontSize: 84,
                  fontWeight: 900,
                  lineHeight: 1,
                  color: "#fb923c",
                  letterSpacing: "-0.03em",
                  display: "flex",
                }}
              >
                {formatYen(yearly)}
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
            fontSize: 28,
            color: "#52525b",
            paddingTop: 24,
          }}
        >
          <div style={{ display: "flex", color: "#fafafa", fontWeight: 700 }}>
            Meeting TimeValue
          </div>
          <div style={{ display: "flex" }}>#会議の値段</div>
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
