"use client";

import { useMemo } from "react";
import type { FoodItem, Profile, WeightEntry } from "@/lib/types";
import {
  computeTargets,
  isSameDay,
  itemsOnDate,
  lastNDays,
  startOfDay,
  streakDays,
  sumTotals,
} from "@/lib/nutrition";
import { fmtKcal, fmtWeight } from "@/lib/format";

interface Props {
  profile: Profile;
  log: FoodItem[];
  weights: WeightEntry[];
}

export function AnalyticsScreen({ profile, log, weights }: Props) {
  const targets = useMemo(() => computeTargets(profile), [profile]);

  const last7 = useMemo(() => lastNDays(7), []);
  const last7Totals = useMemo(
    () => last7.map((d) => ({ date: d, totals: sumTotals(itemsOnDate(log, d)) })),
    [last7, log],
  );
  const avg7Cal = useMemo(() => {
    const days = last7Totals.filter((d) => d.totals.calories > 0);
    if (days.length === 0) return 0;
    return Math.round(
      days.reduce((s, d) => s + d.totals.calories, 0) / days.length,
    );
  }, [last7Totals]);

  const totalLogged = log.length;
  const streak = useMemo(() => streakDays(log), [log]);

  const last30 = useMemo(() => lastNDays(30), []);
  const weightsByDay = useMemo(() => {
    const out: { date: Date; kg: number | null }[] = last30.map((d) => ({ date: d, kg: null }));
    for (const entry of weights) {
      const ed = startOfDay(new Date(entry.loggedAt));
      const idx = out.findIndex((p) => isSameDay(p.date, ed));
      if (idx >= 0) out[idx] = { date: ed, kg: entry.kg };
    }
    return out;
  }, [last30, weights]);

  return (
    <div className="flex flex-col gap-5 px-5 pt-[max(env(safe-area-inset-top),1rem)]">
      <header className="flex items-baseline justify-between pt-2">
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <span className="text-xs text-(--color-fg-muted)">Last 7 days</span>
      </header>

      <div className="grid grid-cols-3 gap-3">
        <SummaryCard label="Day streak" value={streak.toString()} />
        <SummaryCard label="Avg kcal" value={avg7Cal ? fmtKcal(avg7Cal) : "—"} />
        <SummaryCard label="Meals" value={totalLogged.toString()} />
      </div>

      <section className="card flex flex-col gap-4 px-4 py-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold">Calories per day</h2>
          <span className="text-xs text-(--color-fg-muted)">
            target {fmtKcal(targets.calories)}
          </span>
        </div>
        <CalorieBars rows={last7Totals} target={targets.calories} />
      </section>

      <section className="card flex flex-col gap-3 px-4 py-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold">Weight</h2>
          <span className="text-xs text-(--color-fg-muted)">
            {weights.length ? `${weights.length} entries · 30 days` : "No entries"}
          </span>
        </div>
        {weights.length === 0 ? (
          <div className="rounded-xl border border-dashed border-(--color-border) px-4 py-6 text-center text-sm text-(--color-fg-muted)">
            Log your weight in <span className="font-medium">Settings</span> to see a trend.
          </div>
        ) : (
          <WeightChart points={weightsByDay} units={profile.units} />
        )}
      </section>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card flex flex-col gap-1 px-3 py-3">
      <span className="text-xs text-(--color-fg-muted)">{label}</span>
      <span className="text-2xl font-semibold tabular-nums">{value}</span>
    </div>
  );
}

function CalorieBars({
  rows,
  target,
}: {
  rows: { date: Date; totals: { calories: number } }[];
  target: number;
}) {
  const max = Math.max(target * 1.2, ...rows.map((r) => r.totals.calories), 1);
  return (
    <div className="flex h-44 items-end gap-2">
      {rows.map((r) => {
        const h = Math.round((r.totals.calories / max) * 100);
        const targetH = Math.round((target / max) * 100);
        const over = r.totals.calories > target;
        const today = isSameDay(r.date, new Date());
        return (
          <div key={r.date.toISOString()} className="flex flex-1 flex-col items-center gap-1">
            <div className="relative flex h-32 w-full items-end overflow-hidden rounded-lg bg-(--color-surface-2)">
              <div
                className={`w-full rounded-lg transition-[height] duration-500 ${
                  over ? "bg-(--color-protein)" : "bg-(--color-fg)"
                }`}
                style={{ height: `${Math.min(100, h)}%` }}
              />
              <span
                className="absolute left-0 right-0 border-t border-dashed border-(--color-fg)/40"
                style={{ bottom: `${targetH}%` }}
              />
            </div>
            <span
              className={`text-[10px] uppercase tracking-wider tabular-nums ${
                today ? "font-semibold text-(--color-fg)" : "text-(--color-fg-muted)"
              }`}
            >
              {r.date.toLocaleDateString(undefined, { weekday: "short" })[0]}
            </span>
            <span className="text-[10px] tabular-nums text-(--color-fg-soft)">
              {r.totals.calories ? fmtKcal(r.totals.calories) : "—"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function WeightChart({
  points,
  units,
}: {
  points: { date: Date; kg: number | null }[];
  units: "metric" | "imperial";
}) {
  const filled = points.filter((p) => p.kg !== null) as { date: Date; kg: number }[];
  const min = Math.min(...filled.map((p) => p.kg)) - 0.5;
  const max = Math.max(...filled.map((p) => p.kg)) + 0.5;
  const range = Math.max(0.5, max - min);

  const W = 320;
  const H = 140;
  const padX = 8;
  const padY = 8;

  const pointsXY = points.map((p, i) => {
    const x = padX + (i / Math.max(1, points.length - 1)) * (W - padX * 2);
    const y =
      p.kg === null
        ? null
        : padY + (1 - (p.kg - min) / range) * (H - padY * 2);
    return { x, y, kg: p.kg };
  });

  const pathSegments: string[] = [];
  let started = false;
  for (const p of pointsXY) {
    if (p.y === null) {
      started = false;
      continue;
    }
    pathSegments.push(`${started ? "L" : "M"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`);
    started = true;
  }

  const latest = filled[filled.length - 1];

  return (
    <div className="flex flex-col gap-2">
      {latest && (
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-semibold tabular-nums">
            {fmtWeight(latest.kg, units)}
          </span>
          <span className="text-xs text-(--color-fg-muted)">latest</span>
        </div>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <path
          d={pathSegments.join(" ")}
          stroke="var(--color-fg)"
          strokeWidth={2}
          fill="none"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {pointsXY.map(
          (p, i) =>
            p.y !== null && (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r={2.5}
                fill="var(--color-fg)"
              />
            ),
        )}
      </svg>
    </div>
  );
}
