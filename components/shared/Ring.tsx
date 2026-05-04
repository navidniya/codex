"use client";

interface Props {
  current: number;
  target: number;
  size?: number;
  stroke?: number;
  color?: string;
  trackColor?: string;
  children?: React.ReactNode;
}

export function Ring({
  current,
  target,
  size = 224,
  stroke = 16,
  color = "var(--color-cal)",
  trackColor = "var(--color-surface-2)",
  children,
}: Props) {
  const ratio = target > 0 ? current / target : 0;
  const over = ratio > 1;
  const pct = Math.min(1, Math.max(0, ratio));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct);
  const ringColor = over ? "var(--color-protein)" : color;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={trackColor}
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
          style={{ transition: "stroke-dashoffset 600ms cubic-bezier(0.16,1,0.3,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {children}
      </div>
    </div>
  );
}

interface BarProps {
  current: number;
  target: number;
  color: string;
}

export function MacroBar({ current, target, color }: BarProps) {
  const pct = target > 0 ? Math.min(1, Math.max(0, current / target)) : 0;
  return (
    <div className="h-1.5 w-full rounded-full bg-(--color-surface-2)">
      <div
        className="h-full rounded-full transition-[width] duration-500 ease-out"
        style={{ width: `${pct * 100}%`, backgroundColor: color }}
      />
    </div>
  );
}
