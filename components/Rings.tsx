"use client";

interface RingProps {
  label: string;
  current: number;
  target: number;
  unit: string;
  color: string;
  size?: number;
}

export function Ring({ label, current, target, unit, color, size = 96 }: RingProps) {
  const ratio = target > 0 ? current / target : 0;
  const over = ratio > 1;
  const pct = Math.min(1, ratio);
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct);
  const ringColor = over ? "var(--color-protein)" : color;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke="var(--color-surface-2)"
            strokeWidth={stroke}
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={ringColor}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            fill="none"
            style={{ transition: "stroke-dashoffset 400ms ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-lg font-semibold tabular-nums"
            style={over ? { color: "var(--color-protein)" } : undefined}
          >
            {Math.round(current)}
          </span>
          <span className="text-[10px] text-(--color-muted) tabular-nums">
            / {Math.round(target)}
          </span>
        </div>
      </div>
      <span className="text-xs text-(--color-muted)">
        {label} <span className="text-(--color-muted)/60">({unit})</span>
      </span>
    </div>
  );
}
