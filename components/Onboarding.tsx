"use client";

import { useMemo, useState } from "react";
import type { ActivityLevel, Goal, Profile, Sex } from "@/lib/types";
import { computeTargets } from "@/lib/nutrition";

interface Props {
  initial?: Profile;
  onComplete: (profile: Profile) => void;
  onCancel?: () => void;
}

const DEFAULTS = {
  sex: "male" as Sex,
  age: 30,
  heightCm: 175,
  weightKg: 75,
  activity: "moderate" as ActivityLevel,
  goal: "maintain" as Goal,
};

const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string; hint: string }[] = [
  { value: "sedentary", label: "Sedentary", hint: "Desk job, little exercise" },
  { value: "light", label: "Light", hint: "1–3 workouts / week" },
  { value: "moderate", label: "Moderate", hint: "3–5 workouts / week" },
  { value: "active", label: "Active", hint: "6–7 workouts / week" },
  { value: "very_active", label: "Very active", hint: "Physical job + training" },
];

const GOAL_OPTIONS: { value: Goal; label: string; hint: string }[] = [
  { value: "lose", label: "Lose weight", hint: "−500 kcal / day" },
  { value: "maintain", label: "Maintain", hint: "Match your TDEE" },
  { value: "gain", label: "Gain muscle", hint: "+400 kcal / day" },
];

export function Onboarding({ initial, onComplete, onCancel }: Props) {
  const [sex, setSex] = useState<Sex>(initial?.sex ?? DEFAULTS.sex);
  const [age, setAge] = useState(initial?.age ?? DEFAULTS.age);
  const [heightCm, setHeightCm] = useState(initial?.heightCm ?? DEFAULTS.heightCm);
  const [weightKg, setWeightKg] = useState(initial?.weightKg ?? DEFAULTS.weightKg);
  const [activity, setActivity] = useState<ActivityLevel>(
    initial?.activity ?? DEFAULTS.activity,
  );
  const [goal, setGoal] = useState<Goal>(initial?.goal ?? DEFAULTS.goal);

  const targets = useMemo(
    () => computeTargets({ sex, age, heightCm, weightKg, activity, goal }),
    [sex, age, heightCm, weightKg, activity, goal],
  );

  const submit = () => {
    onComplete({ sex, age, heightCm, weightKg, activity, goal });
  };

  return (
    <div className="mx-auto flex min-h-svh max-w-md flex-col gap-6 p-6">
      <header className="flex items-start justify-between gap-3 pt-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            {initial ? "Edit profile" : "Cal AI"}
          </h1>
          <p className="text-(--color-muted)">
            {initial
              ? "Update your stats to recompute targets."
              : "Snap your food. We’ll handle the math."}
          </p>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full bg-(--color-surface) px-3 py-2 text-xs text-(--color-muted)"
          >
            Cancel
          </button>
        )}
      </header>

      <section className="flex flex-col gap-4">
        <div className="flex gap-2">
          {(["male", "female"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSex(s)}
              className={`flex-1 rounded-xl border px-4 py-3 text-sm capitalize transition ${
                sex === s
                  ? "border-(--color-accent) bg-(--color-accent)/10 text-(--color-accent)"
                  : "bg-(--color-surface) text-(--color-fg)"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <NumberRow label="Age" unit="years" value={age} setValue={setAge} min={14} max={100} />
        <NumberRow
          label="Height"
          unit="cm"
          value={heightCm}
          setValue={setHeightCm}
          min={120}
          max={230}
        />
        <NumberRow
          label="Weight"
          unit="kg"
          value={weightKg}
          setValue={setWeightKg}
          min={30}
          max={250}
        />

        <div className="flex flex-col gap-2">
          <label className="text-xs uppercase tracking-wider text-(--color-muted)">
            Activity
          </label>
          <div className="flex flex-col gap-2">
            {ACTIVITY_OPTIONS.map((opt) => (
              <OptionRow
                key={opt.value}
                selected={activity === opt.value}
                onClick={() => setActivity(opt.value)}
                label={opt.label}
                hint={opt.hint}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs uppercase tracking-wider text-(--color-muted)">
            Goal
          </label>
          <div className="flex flex-col gap-2">
            {GOAL_OPTIONS.map((opt) => (
              <OptionRow
                key={opt.value}
                selected={goal === opt.value}
                onClick={() => setGoal(opt.value)}
                label={opt.label}
                hint={opt.hint}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-xl border bg-(--color-surface) p-4">
        <div className="mb-2 text-xs uppercase tracking-wider text-(--color-muted)">
          Your daily targets
        </div>
        <div className="grid grid-cols-4 gap-3 text-center">
          <Stat value={targets.calories} label="kcal" />
          <Stat value={targets.proteinG} label="protein" />
          <Stat value={targets.carbsG} label="carbs" />
          <Stat value={targets.fatG} label="fat" />
        </div>
      </section>

      <button
        type="button"
        onClick={submit}
        className="mt-auto rounded-xl bg-(--color-accent) py-4 text-base font-semibold text-black transition hover:opacity-90"
      >
        {initial ? "Save changes" : "Start tracking"}
      </button>
    </div>
  );
}

function NumberRow({
  label,
  unit,
  value,
  setValue,
  min,
  max,
}: {
  label: string;
  unit: string;
  value: number;
  setValue: (v: number) => void;
  min: number;
  max: number;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border bg-(--color-surface) px-4 py-3">
      <div className="flex flex-col">
        <span className="text-sm">{label}</span>
        <span className="text-xs text-(--color-muted)">{unit}</span>
      </div>
      <input
        type="number"
        inputMode="numeric"
        value={value}
        min={min}
        max={max}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "") return; // ignore transient empty state; commit on blur
          const n = Number(raw);
          if (Number.isFinite(n)) setValue(n);
        }}
        onBlur={(e) => {
          const n = Number(e.target.value);
          if (!Number.isFinite(n) || e.target.value === "") {
            setValue(min);
            return;
          }
          setValue(Math.min(max, Math.max(min, Math.round(n))));
        }}
        className="w-20 rounded-lg bg-(--color-surface-2) px-3 py-2 text-right tabular-nums outline-none focus:ring-2 focus:ring-(--color-accent)/40"
      />
    </div>
  );
}

function OptionRow({
  selected,
  onClick,
  label,
  hint,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
        selected
          ? "border-(--color-accent) bg-(--color-accent)/10"
          : "bg-(--color-surface)"
      }`}
    >
      <div className="flex flex-col">
        <span className="text-sm">{label}</span>
        <span className="text-xs text-(--color-muted)">{hint}</span>
      </div>
      <span
        className={`size-4 rounded-full border ${
          selected
            ? "border-(--color-accent) bg-(--color-accent)"
            : "border-(--color-border)"
        }`}
      />
    </button>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-lg font-semibold tabular-nums">{value}</span>
      <span className="text-[10px] uppercase tracking-wider text-(--color-muted)">
        {label}
      </span>
    </div>
  );
}
