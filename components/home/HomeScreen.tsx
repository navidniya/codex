"use client";

import { useMemo, useState } from "react";
import type { FoodItem, Profile } from "@/lib/types";
import {
  computeTargets,
  isSameDay,
  itemsOnDate,
  startOfDay,
  streakDays,
  sumTotals,
} from "@/lib/nutrition";
import { fmtKcal, fmtMacro, timeOfDay, vibrate } from "@/lib/format";
import { Ring, MacroBar } from "@/components/shared/Ring";

interface Props {
  profile: Profile;
  log: FoodItem[];
  onDelete: (id: string) => void;
}

export function HomeScreen({ profile, log, onDelete }: Props) {
  const [selectedDay, setSelectedDay] = useState<Date>(() => startOfDay(new Date()));

  const targets = useMemo(() => computeTargets(profile), [profile]);
  const dayItems = useMemo(() => itemsOnDate(log, selectedDay), [log, selectedDay]);
  const totals = useMemo(() => sumTotals(dayItems), [dayItems]);
  const streak = useMemo(() => streakDays(log), [log]);

  const remaining = Math.max(0, targets.calories - totals.calories);
  const isToday = isSameDay(selectedDay, new Date());

  return (
    <div className="flex flex-col gap-5 px-5 pt-[max(env(safe-area-inset-top),1rem)]">
      <header className="flex items-center justify-between pt-2">
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-wider text-(--color-fg-muted)">
            {isToday ? "Today" : selectedDay.toLocaleDateString(undefined, { weekday: "long" })}
          </span>
          <h1 className="text-2xl font-semibold tracking-tight">
            {selectedDay.toLocaleDateString(undefined, {
              month: "long",
              day: "numeric",
            })}
          </h1>
        </div>
        <StreakBadge days={streak} />
      </header>

      <DayStrip
        selected={selectedDay}
        onSelect={(d) => {
          vibrate(4);
          setSelectedDay(d);
        }}
        log={log}
      />

      <CalorieHero
        eaten={totals.calories}
        target={targets.calories}
        remaining={remaining}
      />

      <div className="grid grid-cols-3 gap-3">
        <MacroCard
          label="Protein"
          current={totals.proteinG}
          target={targets.proteinG}
          color="var(--color-protein)"
        />
        <MacroCard
          label="Carbs"
          current={totals.carbsG}
          target={targets.carbsG}
          color="var(--color-carbs)"
        />
        <MacroCard
          label="Fat"
          current={totals.fatG}
          target={totals.fatG > 0 ? targets.fatG : targets.fatG}
          color="var(--color-fat)"
        />
      </div>

      <section className="flex flex-col gap-3 pb-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-(--color-fg-muted)">
            Recently uploaded
          </h2>
          <span className="text-xs text-(--color-fg-soft)">
            {dayItems.length} {dayItems.length === 1 ? "meal" : "meals"}
          </span>
        </div>
        {dayItems.length === 0 ? (
          <EmptyState isToday={isToday} />
        ) : (
          <ul className="flex flex-col gap-2">
            {dayItems.map((item) => (
              <MealRow key={item.id} item={item} onDelete={() => onDelete(item.id)} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StreakBadge({ days }: { days: number }) {
  return (
    <div className="flex items-center gap-1.5 rounded-full bg-(--color-surface-2) px-3 py-1.5">
      <span className="text-base">🔥</span>
      <span className="text-sm font-semibold tabular-nums">
        {days}
      </span>
      <span className="text-xs text-(--color-fg-muted)">
        {days === 1 ? "day" : "days"}
      </span>
    </div>
  );
}

function DayStrip({
  selected,
  onSelect,
  log,
}: {
  selected: Date;
  onSelect: (d: Date) => void;
  log: FoodItem[];
}) {
  const today = startOfDay(new Date());
  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    return d;
  });
  return (
    <div className="-mx-1 grid grid-cols-7 gap-1">
      {days.map((d) => {
        const isSel = isSameDay(d, selected);
        const isFuture = d.getTime() > today.getTime();
        const hasMeals = log.some((i) => isSameDay(new Date(i.loggedAt), d));
        return (
          <button
            key={d.toISOString()}
            type="button"
            disabled={isFuture}
            onClick={() => onSelect(d)}
            className={`tap flex flex-col items-center gap-1 rounded-2xl py-2 transition-colors ${
              isSel
                ? "bg-(--color-fg) text-(--color-bg)"
                : "bg-transparent text-(--color-fg-muted) disabled:opacity-30"
            }`}
          >
            <span className="text-[10px] uppercase tracking-wider">
              {d.toLocaleDateString(undefined, { weekday: "short" })}
            </span>
            <span className="text-base font-semibold tabular-nums">
              {d.getDate()}
            </span>
            <span
              className={`size-1.5 rounded-full ${
                hasMeals
                  ? isSel
                    ? "bg-(--color-bg)"
                    : "bg-(--color-accent)"
                  : "bg-transparent"
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}

function CalorieHero({
  eaten,
  target,
  remaining,
}: {
  eaten: number;
  target: number;
  remaining: number;
}) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-6">
      <Ring current={eaten} target={target} size={216} stroke={18} color="var(--color-fg)">
        <span className="text-5xl font-semibold leading-none tabular-nums">
          {fmtKcal(remaining)}
        </span>
        <span className="mt-1 text-xs text-(--color-fg-muted)">
          calories left
        </span>
      </Ring>
      <div className="flex items-center gap-4 text-xs text-(--color-fg-muted)">
        <span>
          <span className="font-medium tabular-nums text-(--color-fg)">
            {fmtKcal(eaten)}
          </span>{" "}
          eaten
        </span>
        <span className="size-1 rounded-full bg-(--color-fg-soft)/50" />
        <span>
          <span className="font-medium tabular-nums text-(--color-fg)">
            {fmtKcal(target)}
          </span>{" "}
          target
        </span>
      </div>
    </div>
  );
}

function MacroCard({
  label,
  current,
  target,
  color,
}: {
  label: string;
  current: number;
  target: number;
  color: string;
}) {
  const left = Math.max(0, target - current);
  return (
    <div className="card flex flex-col gap-2 px-3 py-3">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-medium text-(--color-fg-muted)">{label}</span>
        <span
          className="size-1.5 rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-semibold tabular-nums">
          {fmtMacro(left)}
        </span>
        <span className="text-xs text-(--color-fg-muted)">g left</span>
      </div>
      <MacroBar current={current} target={target} color={color} />
      <span className="text-[10px] tabular-nums text-(--color-fg-soft)">
        {fmtMacro(current)} / {fmtMacro(target)} g
      </span>
    </div>
  );
}

function MealRow({ item, onDelete }: { item: FoodItem; onDelete: () => void }) {
  return (
    <li className="card flex items-center gap-3 px-3 py-3">
      {item.imageDataUrl ? (
        <img
          src={item.imageDataUrl}
          alt={item.name}
          className="size-14 shrink-0 rounded-xl object-cover"
        />
      ) : (
        <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-(--color-surface-2) text-2xl">
          {sourceEmoji(item.source)}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-sm font-semibold">{item.name}</span>
          <span className="shrink-0 text-sm font-semibold tabular-nums">
            {fmtKcal(item.calories)}
          </span>
        </div>
        <div className="text-xs text-(--color-fg-muted)">
          {item.servingDescription}
        </div>
        <div className="mt-1 flex items-center justify-between gap-2 text-[10px] text-(--color-fg-soft)">
          <span className="tabular-nums">
            P {fmtMacro(item.proteinG)} · C {fmtMacro(item.carbsG)} · F{" "}
            {fmtMacro(item.fatG)}
          </span>
          <div className="flex items-center gap-2">
            <span>{timeOfDay(item.loggedAt)}</span>
            <button
              type="button"
              onClick={onDelete}
              className="text-(--color-fg-soft) hover:text-(--color-protein)"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}

function sourceEmoji(s: FoodItem["source"]): string {
  return s === "photo" ? "📸" : s === "describe" ? "✍️" : "⌨️";
}

function EmptyState({ isToday }: { isToday: boolean }) {
  return (
    <div className="card flex flex-col items-center gap-2 px-6 py-10 text-center">
      <span className="text-3xl">🍽️</span>
      <span className="text-sm font-medium">
        {isToday ? "No meals logged yet" : "Nothing logged this day"}
      </span>
      <span className="text-xs text-(--color-fg-muted)">
        Tap the orange + to add one.
      </span>
    </div>
  );
}
