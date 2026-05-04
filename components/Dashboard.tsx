"use client";

import { useMemo, useState } from "react";
import type { FoodItem, Profile } from "@/lib/types";
import { computeTargets, isToday, sumTotals } from "@/lib/nutrition";
import { Ring } from "./Rings";
import { FoodLog } from "./FoodLog";
import { AddFoodModal } from "./AddFoodModal";

interface Props {
  profile: Profile;
  log: FoodItem[];
  onAdd: (item: FoodItem) => void;
  onDelete: (id: string) => void;
  onEditProfile: () => void;
}

export function Dashboard({ profile, log, onAdd, onDelete, onEditProfile }: Props) {
  const [open, setOpen] = useState(false);
  const targets = useMemo(() => computeTargets(profile), [profile]);
  const todays = useMemo(() => log.filter((i) => isToday(i.loggedAt)), [log]);
  const totals = useMemo(() => sumTotals(todays), [todays]);

  const remaining = Math.max(0, targets.calories - totals.calories);

  return (
    <div
      className="mx-auto flex min-h-svh max-w-md flex-col gap-6 p-6"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 8rem)" }}
    >
      <header className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Today</h1>
          <p className="text-xs text-(--color-muted)">
            {new Date().toLocaleDateString(undefined, {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
          </p>
        </div>
        <button
          type="button"
          onClick={onEditProfile}
          className="rounded-full bg-(--color-surface) px-4 py-2.5 text-xs text-(--color-muted)"
        >
          Edit profile
        </button>
      </header>

      <section className="rounded-2xl border bg-(--color-surface) p-5">
        <div className="mb-4 flex items-baseline justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-(--color-muted)">
              Calories left
            </div>
            <div className="text-3xl font-semibold tabular-nums">
              {remaining}
              <span className="ml-1 text-sm font-normal text-(--color-muted)">
                / {targets.calories}
              </span>
            </div>
          </div>
          <div className="text-right text-xs text-(--color-muted)">
            <div className="tabular-nums">{totals.calories} eaten</div>
            <div className="tabular-nums">{todays.length} {todays.length === 1 ? "meal" : "meals"}</div>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          <Ring
            label="Calories"
            unit="kcal"
            current={totals.calories}
            target={targets.calories}
            color="var(--color-cal)"
          />
          <Ring
            label="Protein"
            unit="g"
            current={totals.proteinG}
            target={targets.proteinG}
            color="var(--color-protein)"
          />
          <Ring
            label="Carbs"
            unit="g"
            current={totals.carbsG}
            target={targets.carbsG}
            color="var(--color-carbs)"
          />
          <Ring
            label="Fat"
            unit="g"
            current={totals.fatG}
            target={targets.fatG}
            color="var(--color-fat)"
          />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm uppercase tracking-wider text-(--color-muted)">
          Meals
        </h2>
        <FoodLog items={todays} onDelete={onDelete} />
      </section>

      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Add food"
        className="fixed left-1/2 z-40 flex size-16 -translate-x-1/2 items-center justify-center rounded-full bg-(--color-accent) text-3xl font-bold text-black shadow-2xl shadow-black/40 transition active:scale-95"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 1.5rem)" }}
      >
        +
      </button>

      <AddFoodModal open={open} onClose={() => setOpen(false)} onSave={onAdd} />
    </div>
  );
}
