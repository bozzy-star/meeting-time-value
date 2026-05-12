type Props = {
  size?: number;
  className?: string;
};

/**
 * MoneyFly — minimal line-art icon: a banknote with little wings and
 * a dashed motion trail flying up-right. Inherits color via currentColor.
 */
export function MoneyFly({ size = 32, className }: Props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {/* Motion trail: short dashed strokes leading up-right */}
      <g strokeDasharray="2 3" opacity="0.55">
        <line x1="6" y1="56" x2="14" y2="48" />
        <line x1="3" y1="46" x2="9" y2="40" />
        <line x1="11" y1="38" x2="17" y2="32" />
      </g>

      {/* Left wing — two soft arcs */}
      <path d="M22 30 Q 14 26 10 30" />
      <path d="M22 34 Q 16 32 12 35" />

      {/* Right wing — two soft arcs */}
      <path d="M42 30 Q 50 26 54 30" />
      <path d="M42 34 Q 48 32 52 35" />

      {/* Banknote body: rounded rectangle, aspect ~5:3 */}
      <rect x="22" y="22" width="20" height="20" rx="2.5" />

      {/* ¥ glyph inside the note (path version, robust across Satori-like envs) */}
      <g strokeWidth="1.6">
        {/* Top diagonals of ¥ */}
        <path d="M28 28 L 32 33 L 36 28" />
        {/* Vertical stem */}
        <path d="M32 33 L 32 38" />
        {/* Two horizontal bars */}
        <path d="M28.5 34.5 L 35.5 34.5" />
        <path d="M28.5 36.5 L 35.5 36.5" />
      </g>
    </svg>
  );
}
