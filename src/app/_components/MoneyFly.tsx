export type MoneyFlyCurrency = "JPY" | "USD" | "GBP" | "EUR";

const SYMBOL: Record<MoneyFlyCurrency, string> = {
  JPY: "¥",
  USD: "$",
  GBP: "£",
  EUR: "€",
};

type Props = {
  size?: number;
  className?: string;
  /** Currency to render inside the banknote (center + 4 corners). */
  currency?: MoneyFlyCurrency;
};

/**
 * MoneyFly — flat illustration: a banknote with 3-feather wings and
 * a small dashed motion trail. Colors are hardcoded inside the SVG
 * (filled illustration), so `currentColor` from the parent is unused.
 *
 * Aspect ratio 96:64 (≈3:2). `size` controls the width.
 */
export function MoneyFly({
  size = 60,
  className,
  currency = "JPY",
}: Props) {
  const sym = SYMBOL[currency];
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={(size * 64) / 96}
      viewBox="0 0 96 64"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      {/* Motion trail — short dashed strokes, lower-left to upper-right */}
      <g
        stroke="#fdba74"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeDasharray="2 3"
        opacity="0.9"
      >
        <line x1="6" y1="56" x2="14" y2="48" />
        <line x1="3" y1="48" x2="9" y2="42" />
        <line x1="10" y1="40" x2="15" y2="35" />
      </g>

      {/* LEFT WING — 3 feather drops, large→small */}
      <g>
        <path
          d="M30 24 Q 18 14 8 18 Q 14 26 28 28 Z"
          fill="#ffedd5"
          stroke="#fb923c"
          strokeWidth="1"
          strokeLinejoin="round"
        />
        <path
          d="M30 30 Q 20 26 14 30 Q 20 34 30 33 Z"
          fill="#fed7aa"
          stroke="#fb923c"
          strokeWidth="1"
          strokeLinejoin="round"
        />
        <path
          d="M30 35 Q 22 35 18 38 Q 24 40 30 38 Z"
          fill="#ffedd5"
          stroke="#fb923c"
          strokeWidth="1"
          strokeLinejoin="round"
        />
      </g>

      {/* RIGHT WING — mirror */}
      <g>
        <path
          d="M66 24 Q 78 14 88 18 Q 82 26 68 28 Z"
          fill="#ffedd5"
          stroke="#fb923c"
          strokeWidth="1"
          strokeLinejoin="round"
        />
        <path
          d="M66 30 Q 76 26 82 30 Q 76 34 66 33 Z"
          fill="#fed7aa"
          stroke="#fb923c"
          strokeWidth="1"
          strokeLinejoin="round"
        />
        <path
          d="M66 35 Q 74 35 78 38 Q 72 40 66 38 Z"
          fill="#ffedd5"
          stroke="#fb923c"
          strokeWidth="1"
          strokeLinejoin="round"
        />
      </g>

      {/* BANKNOTE BODY */}
      <rect
        x="30"
        y="20"
        width="36"
        height="24"
        rx="3"
        fill="#fff7ed"
        stroke="#f97316"
        strokeWidth="1.5"
      />
      {/* Inner double frame */}
      <rect
        x="32.5"
        y="22.5"
        width="31"
        height="19"
        rx="2"
        fill="none"
        stroke="#fb923c"
        strokeWidth="0.6"
      />

      {/* Corner currency accents */}
      <g
        fill="#fb923c"
        fontFamily="system-ui, sans-serif"
        fontWeight="700"
        fontSize="4"
      >
        <text x="34" y="27">{sym}</text>
        <text x="59" y="27">{sym}</text>
        <text x="34" y="41">{sym}</text>
        <text x="59" y="41">{sym}</text>
      </g>

      {/* Center ¥ */}
      <text
        x="48"
        y="37"
        fontSize="16"
        fontWeight="900"
        textAnchor="middle"
        fill="#ea580c"
        fontFamily="system-ui, sans-serif"
      >
        {sym}
      </text>
    </svg>
  );
}
