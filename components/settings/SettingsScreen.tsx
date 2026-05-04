"use client";

import { useState } from "react";
import type { Profile, WeightEntry } from "@/lib/types";
import { computeTargets } from "@/lib/nutrition";
import { fmtHeight, fmtKcal, fmtWeight, makeId, vibrate } from "@/lib/format";
import { Sheet } from "@/components/shared/Sheet";

interface Props {
  profile: Profile;
  weights: WeightEntry[];
  onProfileEdit: () => void;
  onAddWeight: (entry: WeightEntry) => void;
  onDeleteWeight: (id: string) => void;
  onReset: () => void;
}

export function SettingsScreen({
  profile,
  weights,
  onProfileEdit,
  onAddWeight,
  onDeleteWeight,
  onReset,
}: Props) {
  const targets = computeTargets(profile);
  const [logOpen, setLogOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <div className="flex flex-col gap-5 px-5 pt-[max(env(safe-area-inset-top),1rem)]">
      <header className="pt-2">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      </header>

      <section className="card flex flex-col">
        <Row label="Daily target" value={`${fmtKcal(targets.calories)} kcal`} />
        <Row label="Protein target" value={`${targets.proteinG} g`} />
        <Row label="Carbs target" value={`${targets.carbsG} g`} />
        <Row label="Fat target" value={`${targets.fatG} g`} last />
      </section>

      <section className="card flex flex-col">
        <Row label="Sex" value={profile.sex} />
        <Row label="Height" value={fmtHeight(profile.heightCm, profile.units)} />
        <Row label="Weight" value={fmtWeight(profile.weightKg, profile.units)} />
        <Row label="Goal" value={profile.goal} />
        {profile.goal !== "maintain" && (
          <Row
            label="Goal weight"
            value={fmtWeight(profile.goalWeightKg, profile.units)}
          />
        )}
        <Row label="Diet" value={profile.diet} />
        <Row label="Workouts / week" value={profile.workoutsPerWeek.toString()} last />
      </section>

      <button
        type="button"
        onClick={() => {
          vibrate(6);
          onProfileEdit();
        }}
        className="tap rounded-2xl bg-(--color-fg) py-3.5 text-sm font-semibold text-(--color-bg)"
      >
        Edit profile
      </button>

      <section className="card flex flex-col">
        <Row
          label="Weight log"
          value={`${weights.length} ${weights.length === 1 ? "entry" : "entries"}`}
          onClick={() => {
            vibrate(4);
            setLogOpen(true);
          }}
          chevron
          last
        />
      </section>

      <section className="card flex flex-col">
        <Row
          label="Reset all data"
          value=""
          onClick={() => {
            vibrate(8);
            setConfirmReset(true);
          }}
          danger
          last
        />
      </section>

      <p className="px-2 pb-6 text-center text-xs text-(--color-fg-soft)">
        Cal AI clone · runs entirely on your device
      </p>

      <WeightLogSheet
        open={logOpen}
        onClose={() => setLogOpen(false)}
        weights={weights}
        units={profile.units}
        onAddWeight={onAddWeight}
        onDeleteWeight={onDeleteWeight}
      />

      <Sheet open={confirmReset} onClose={() => setConfirmReset(false)} title="Reset everything?">
        <p className="text-sm text-(--color-fg-muted)">
          This deletes your profile, meal log, and weight history from this device. Can&rsquo;t be undone.
        </p>
        <div className="flex gap-2 pb-2">
          <button
            type="button"
            onClick={() => setConfirmReset(false)}
            className="tap flex-1 rounded-2xl border-2 border-(--color-border) bg-(--color-surface) py-3 text-sm font-semibold"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              setConfirmReset(false);
              onReset();
            }}
            className="tap flex-1 rounded-2xl bg-(--color-protein) py-3 text-sm font-semibold text-white"
          >
            Reset
          </button>
        </div>
      </Sheet>
    </div>
  );
}

function Row({
  label,
  value,
  last,
  onClick,
  chevron,
  danger,
}: {
  label: string;
  value: string;
  last?: boolean;
  onClick?: () => void;
  chevron?: boolean;
  danger?: boolean;
}) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`tap flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left ${
        last ? "" : "border-b border-(--color-border)"
      }`}
    >
      <span
        className={`text-sm capitalize ${
          danger ? "font-medium text-(--color-protein)" : ""
        }`}
      >
        {label}
      </span>
      <span className="flex items-center gap-2 text-sm tabular-nums text-(--color-fg-muted)">
        {value}
        {chevron && <span className="text-base">›</span>}
      </span>
    </Comp>
  );
}

function WeightLogSheet({
  open,
  onClose,
  weights,
  units,
  onAddWeight,
  onDeleteWeight,
}: {
  open: boolean;
  onClose: () => void;
  weights: WeightEntry[];
  units: "metric" | "imperial";
  onAddWeight: (e: WeightEntry) => void;
  onDeleteWeight: (id: string) => void;
}) {
  const [value, setValue] = useState<string>("");

  const submit = () => {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return;
    const kg = units === "imperial" ? n / 2.20462 : n;
    onAddWeight({
      id: makeId(),
      loggedAt: new Date().toISOString(),
      kg: Math.round(kg * 10) / 10,
    });
    setValue("");
    vibrate(8);
  };

  const sorted = [...weights].sort(
    (a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime(),
  );

  return (
    <Sheet open={open} onClose={onClose} title="Weight log">
      <div className="flex gap-2">
        <input
          type="number"
          inputMode="decimal"
          step="0.1"
          placeholder={units === "imperial" ? "e.g. 165.0" : "e.g. 75.0"}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="flex-1 rounded-2xl border-2 border-(--color-border) bg-(--color-surface) px-4 py-3 outline-none focus:border-(--color-fg)"
        />
        <button
          type="button"
          onClick={submit}
          disabled={!value}
          className="tap rounded-2xl bg-(--color-fg) px-5 text-sm font-semibold text-(--color-bg) disabled:opacity-30"
        >
          Log
        </button>
      </div>
      <span className="text-xs text-(--color-fg-muted)">
        Units: {units === "imperial" ? "lb" : "kg"}
      </span>
      <ul className="flex flex-col gap-1">
        {sorted.length === 0 && (
          <li className="rounded-xl border border-dashed border-(--color-border) px-4 py-6 text-center text-sm text-(--color-fg-muted)">
            No weights logged yet.
          </li>
        )}
        {sorted.map((w) => (
          <li
            key={w.id}
            className="flex items-center justify-between rounded-xl bg-(--color-surface) px-3 py-2"
          >
            <div className="flex flex-col">
              <span className="text-sm font-semibold tabular-nums">
                {fmtWeight(w.kg, units)}
              </span>
              <span className="text-xs text-(--color-fg-muted)">
                {new Date(w.loggedAt).toLocaleDateString()}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onDeleteWeight(w.id)}
              className="text-(--color-fg-soft) hover:text-(--color-protein)"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}
