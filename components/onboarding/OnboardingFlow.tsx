"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  ActivityLevel,
  Diet,
  Goal,
  Profile,
  Sex,
  Unit,
} from "@/lib/types";
import { computeTargets } from "@/lib/nutrition";
import { fmtKcal } from "@/lib/format";
import { vibrate } from "@/lib/format";

type Draft = {
  sex?: Sex;
  birthDate?: string;
  heightCm?: number;
  weightKg?: number;
  goal?: Goal;
  goalWeightKg?: number;
  paceKgPerWeek?: number;
  workoutsPerWeek?: number;
  diet?: Diet;
  units: Unit;
};

interface Props {
  initial?: Profile;
  onComplete: (profile: Profile) => void;
  onCancel?: () => void;
}

const STEPS = [
  "sex",
  "birth",
  "body",
  "workouts",
  "goal",
  "pace",
  "diet",
  "generating",
  "reveal",
] as const;
type Step = (typeof STEPS)[number];

export function OnboardingFlow({ initial, onComplete, onCancel }: Props) {
  const [stepIndex, setStepIndex] = useState(0);
  const [draft, setDraft] = useState<Draft>(() =>
    initial
      ? {
          sex: initial.sex,
          birthDate: initial.birthDate,
          heightCm: initial.heightCm,
          weightKg: initial.weightKg,
          goal: initial.goal,
          goalWeightKg: initial.goalWeightKg,
          paceKgPerWeek: initial.paceKgPerWeek,
          workoutsPerWeek: initial.workoutsPerWeek,
          diet: initial.diet,
          units: initial.units,
        }
      : { units: "metric" },
  );

  const step = STEPS[stepIndex];
  const progress = (stepIndex + 1) / STEPS.length;

  const next = () => {
    vibrate(6);
    setStepIndex((i) => Math.min(STEPS.length - 1, i + 1));
  };
  const back = () => {
    vibrate(6);
    setStepIndex((i) => Math.max(0, i - 1));
  };

  const canContinue = useMemo(() => {
    switch (step) {
      case "sex":
        return !!draft.sex;
      case "birth":
        return !!draft.birthDate;
      case "body":
        return (
          (draft.heightCm ?? 0) > 50 && (draft.weightKg ?? 0) > 25
        );
      case "workouts":
        return draft.workoutsPerWeek !== undefined;
      case "goal":
        return !!draft.goal;
      case "pace":
        return draft.goal === "maintain" || (draft.paceKgPerWeek !== undefined && (draft.goalWeightKg ?? 0) > 25);
      case "diet":
        return !!draft.diet;
      default:
        return true;
    }
  }, [step, draft]);

  // After "generating", auto-advance to reveal.
  useEffect(() => {
    if (step !== "generating") return;
    const t = setTimeout(() => setStepIndex((i) => i + 1), 2200);
    return () => clearTimeout(t);
  }, [step]);

  const finalize = () => {
    if (!draft.sex || !draft.birthDate || !draft.heightCm || !draft.weightKg || !draft.goal || !draft.diet || draft.workoutsPerWeek === undefined) return;
    const activity = activityFromWorkouts(draft.workoutsPerWeek);
    const profile: Profile = {
      sex: draft.sex,
      birthDate: draft.birthDate,
      heightCm: draft.heightCm,
      weightKg: draft.weightKg,
      goal: draft.goal,
      goalWeightKg: draft.goalWeightKg ?? draft.weightKg,
      paceKgPerWeek:
        draft.goal === "maintain" ? 0 : draft.paceKgPerWeek ?? (draft.goal === "lose" ? -0.5 : 0.3),
      workoutsPerWeek: draft.workoutsPerWeek,
      diet: draft.diet,
      activity,
      units: draft.units,
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    };
    vibrate([6, 30, 18]);
    onComplete(profile);
  };

  return (
    <div className="mx-auto flex min-h-svh max-w-md flex-col bg-(--color-bg)">
      <div className="flex items-center justify-between gap-3 px-5 pt-[max(env(safe-area-inset-top),1rem)] pb-3">
        <button
          type="button"
          onClick={stepIndex === 0 ? onCancel ?? (() => undefined) : back}
          className="tap rounded-full px-3 py-2 text-sm text-(--color-fg-muted)"
        >
          {stepIndex === 0 ? (onCancel ? "Cancel" : "") : "← Back"}
        </button>
        <ProgressDots count={STEPS.length} active={stepIndex} />
        <span className="w-12" />
      </div>

      <main key={step} className="anim-fade-up flex flex-1 flex-col px-5 pb-4">
        {step === "sex" && <SexStep draft={draft} setDraft={setDraft} />}
        {step === "birth" && <BirthStep draft={draft} setDraft={setDraft} />}
        {step === "body" && <BodyStep draft={draft} setDraft={setDraft} />}
        {step === "workouts" && <WorkoutsStep draft={draft} setDraft={setDraft} />}
        {step === "goal" && <GoalStep draft={draft} setDraft={setDraft} />}
        {step === "pace" && <PaceStep draft={draft} setDraft={setDraft} />}
        {step === "diet" && <DietStep draft={draft} setDraft={setDraft} />}
        {step === "generating" && <GeneratingStep />}
        {step === "reveal" && (
          <RevealStep draft={draft} onFinish={finalize} editing={!!initial} />
        )}
      </main>

      {step !== "generating" && step !== "reveal" && (
        <div className="px-5 pb-[max(env(safe-area-inset-bottom),1.25rem)] pt-2">
          <button
            type="button"
            disabled={!canContinue}
            onClick={next}
            className="tap w-full rounded-2xl bg-(--color-fg) py-4 text-base font-semibold text-(--color-bg) disabled:opacity-30"
          >
            Continue
          </button>
        </div>
      )}
    </div>
  );
}

function activityFromWorkouts(n: number): ActivityLevel {
  if (n <= 0) return "sedentary";
  if (n <= 2) return "light";
  if (n <= 4) return "moderate";
  if (n <= 6) return "active";
  return "very_active";
}

function ProgressDots({ count, active }: { count: number; active: number }) {
  return (
    <div className="flex flex-1 items-center justify-center gap-1.5">
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className={`h-1.5 rounded-full transition-all ${
            i === active
              ? "w-6 bg-(--color-fg)"
              : i < active
                ? "w-1.5 bg-(--color-fg)/50"
                : "w-1.5 bg-(--color-fg)/15"
          }`}
        />
      ))}
    </div>
  );
}

function StepHeading({ kicker, title, subtitle }: { kicker?: string; title: string; subtitle?: string }) {
  return (
    <header className="mb-8 mt-2 flex flex-col gap-2">
      {kicker && (
        <span className="text-sm font-medium text-(--color-accent)">{kicker}</span>
      )}
      <h1 className="text-3xl font-semibold leading-tight tracking-tight">
        {title}
      </h1>
      {subtitle && (
        <p className="text-base text-(--color-fg-muted)">{subtitle}</p>
      )}
    </header>
  );
}

function ChoiceCard({
  selected,
  onClick,
  emoji,
  title,
  subtitle,
}: {
  selected: boolean;
  onClick: () => void;
  emoji?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        vibrate(4);
        onClick();
      }}
      className={`tap flex items-center gap-3 rounded-2xl border-2 px-4 py-4 text-left transition-colors ${
        selected
          ? "border-(--color-fg) bg-(--color-fg)/[0.04]"
          : "border-(--color-border) bg-(--color-surface)"
      }`}
    >
      {emoji && <span className="text-2xl leading-none">{emoji}</span>}
      <div className="flex-1">
        <div className="font-medium">{title}</div>
        {subtitle && (
          <div className="text-sm text-(--color-fg-muted)">{subtitle}</div>
        )}
      </div>
      <span
        className={`size-5 rounded-full border-2 ${
          selected
            ? "border-(--color-fg) bg-(--color-fg)"
            : "border-(--color-border)"
        }`}
      />
    </button>
  );
}

// ---------- step components ----------

function SexStep({ draft, setDraft }: { draft: Draft; setDraft: (d: Draft) => void }) {
  return (
    <>
      <StepHeading
        title="Choose your sex"
        subtitle="This is used to estimate your metabolic rate."
      />
      <div className="flex flex-col gap-3">
        <ChoiceCard
          selected={draft.sex === "male"}
          onClick={() => setDraft({ ...draft, sex: "male" })}
          emoji="♂"
          title="Male"
        />
        <ChoiceCard
          selected={draft.sex === "female"}
          onClick={() => setDraft({ ...draft, sex: "female" })}
          emoji="♀"
          title="Female"
        />
      </div>
    </>
  );
}

function BirthStep({ draft, setDraft }: { draft: Draft; setDraft: (d: Draft) => void }) {
  // Default: 30 years ago
  const today = new Date();
  const defaultDate = `${today.getFullYear() - 30}-01-01`;
  return (
    <>
      <StepHeading
        title="When were you born?"
        subtitle="Your age is part of the calorie formula."
      />
      <input
        type="date"
        value={draft.birthDate ?? ""}
        max={`${today.getFullYear() - 13}-12-31`}
        onChange={(e) => setDraft({ ...draft, birthDate: e.target.value })}
        className="rounded-2xl border-2 border-(--color-border) bg-(--color-surface) px-4 py-4 text-lg"
        placeholder={defaultDate}
      />
    </>
  );
}

function BodyStep({ draft, setDraft }: { draft: Draft; setDraft: (d: Draft) => void }) {
  return (
    <>
      <StepHeading
        title="Height & weight"
        subtitle="We'll estimate your daily energy use from these."
      />
      <div className="mb-4 flex rounded-full bg-(--color-surface-2) p-1 text-sm">
        {(["metric", "imperial"] as const).map((u) => (
          <button
            key={u}
            type="button"
            onClick={() => setDraft({ ...draft, units: u })}
            className={`flex-1 rounded-full py-2 capitalize transition-colors ${
              draft.units === u ? "bg-(--color-bg) shadow-sm" : "text-(--color-fg-muted)"
            }`}
          >
            {u}
          </button>
        ))}
      </div>

      <NumberRow
        label="Height"
        value={draft.heightCm ?? 175}
        setValue={(v) => setDraft({ ...draft, heightCm: v })}
        unit={draft.units === "metric" ? "cm" : "in"}
        min={100}
        max={230}
        toDisplay={(cm) => (draft.units === "imperial" ? Math.round(cm / 2.54) : cm)}
        fromDisplay={(v) => (draft.units === "imperial" ? Math.round(v * 2.54) : v)}
      />
      <NumberRow
        label="Weight"
        value={draft.weightKg ?? 75}
        setValue={(v) => setDraft({ ...draft, weightKg: v })}
        unit={draft.units === "metric" ? "kg" : "lb"}
        min={30}
        max={300}
        toDisplay={(kg) => (draft.units === "imperial" ? Math.round(kg * 2.20462) : kg)}
        fromDisplay={(v) => (draft.units === "imperial" ? Math.round((v / 2.20462) * 10) / 10 : v)}
      />
    </>
  );
}

function NumberRow({
  label,
  value,
  setValue,
  unit,
  min,
  max,
  toDisplay,
  fromDisplay,
}: {
  label: string;
  value: number;
  setValue: (v: number) => void;
  unit: string;
  min: number;
  max: number;
  toDisplay?: (v: number) => number;
  fromDisplay?: (v: number) => number;
}) {
  const display = toDisplay ? toDisplay(value) : value;
  return (
    <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl border-2 border-(--color-border) bg-(--color-surface) px-4 py-4">
      <span className="font-medium">{label}</span>
      <div className="flex items-baseline gap-2">
        <input
          type="number"
          inputMode="numeric"
          value={display}
          min={min}
          max={max}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === "") return;
            const n = Number(raw);
            if (!Number.isFinite(n)) return;
            const cm = fromDisplay ? fromDisplay(n) : n;
            setValue(cm);
          }}
          onBlur={(e) => {
            const raw = e.target.value;
            const n = Number(raw);
            if (!Number.isFinite(n) || raw === "") {
              setValue(min);
              return;
            }
            const cm = fromDisplay ? fromDisplay(n) : n;
            setValue(Math.min(max, Math.max(min, cm)));
          }}
          className="w-20 rounded-lg bg-transparent text-right text-xl font-semibold tabular-nums outline-none"
        />
        <span className="text-(--color-fg-muted)">{unit}</span>
      </div>
    </div>
  );
}

function WorkoutsStep({ draft, setDraft }: { draft: Draft; setDraft: (d: Draft) => void }) {
  const opts = [
    { v: 0, label: "0 — couch life", emoji: "🛋️" },
    { v: 2, label: "1–2 — light", emoji: "🚶" },
    { v: 4, label: "3–4 — regular", emoji: "🏋️" },
    { v: 6, label: "5–6 — frequent", emoji: "🏃" },
    { v: 7, label: "Daily — athlete", emoji: "🥇" },
  ];
  return (
    <>
      <StepHeading
        title="How often do you train?"
        subtitle="Workouts per week, on average."
      />
      <div className="flex flex-col gap-3">
        {opts.map((o) => (
          <ChoiceCard
            key={o.v}
            selected={draft.workoutsPerWeek === o.v}
            onClick={() => setDraft({ ...draft, workoutsPerWeek: o.v })}
            emoji={o.emoji}
            title={o.label}
          />
        ))}
      </div>
    </>
  );
}

function GoalStep({ draft, setDraft }: { draft: Draft; setDraft: (d: Draft) => void }) {
  return (
    <>
      <StepHeading
        title="What's your goal?"
        subtitle="We'll set your daily target accordingly."
      />
      <div className="flex flex-col gap-3">
        <ChoiceCard
          selected={draft.goal === "lose"}
          onClick={() => setDraft({ ...draft, goal: "lose" })}
          emoji="📉"
          title="Lose weight"
          subtitle="Eat in a deficit"
        />
        <ChoiceCard
          selected={draft.goal === "maintain"}
          onClick={() => setDraft({ ...draft, goal: "maintain" })}
          emoji="⚖️"
          title="Maintain"
          subtitle="Match your energy use"
        />
        <ChoiceCard
          selected={draft.goal === "gain"}
          onClick={() => setDraft({ ...draft, goal: "gain" })}
          emoji="💪"
          title="Build muscle"
          subtitle="Eat in a surplus"
        />
      </div>
    </>
  );
}

function PaceStep({ draft, setDraft }: { draft: Draft; setDraft: (d: Draft) => void }) {
  if (draft.goal === "maintain") {
    return (
      <>
        <StepHeading
          title="You're set to maintain"
          subtitle="No deficit or surplus needed. Onwards!"
        />
      </>
    );
  }

  const isLose = draft.goal === "lose";
  const sign = isLose ? -1 : 1;
  const absPace = Math.abs(draft.paceKgPerWeek ?? (isLose ? 0.5 : 0.3));

  const setAbsPace = (v: number) => setDraft({ ...draft, paceKgPerWeek: sign * v });

  return (
    <>
      <StepHeading
        title={isLose ? "How fast to lose?" : "How fast to gain?"}
        subtitle="A moderate pace is sustainable."
      />
      <NumberRow
        label="Goal weight"
        value={draft.goalWeightKg ?? draft.weightKg ?? 75}
        setValue={(v) => setDraft({ ...draft, goalWeightKg: v })}
        unit={draft.units === "metric" ? "kg" : "lb"}
        min={30}
        max={300}
        toDisplay={(kg) => (draft.units === "imperial" ? Math.round(kg * 2.20462) : kg)}
        fromDisplay={(v) => (draft.units === "imperial" ? Math.round((v / 2.20462) * 10) / 10 : v)}
      />
      <div className="mt-4 rounded-2xl border-2 border-(--color-border) bg-(--color-surface) p-4">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="font-medium">Pace</span>
          <span className="text-2xl font-semibold tabular-nums">
            {absPace.toFixed(1)}{" "}
            <span className="text-base font-normal text-(--color-fg-muted)">
              {draft.units === "imperial" ? "lb" : "kg"} / week
            </span>
          </span>
        </div>
        <input
          type="range"
          min={0.1}
          max={1.0}
          step={0.1}
          value={absPace}
          onChange={(e) => setAbsPace(Number(e.target.value))}
          className="w-full accent-(--color-accent)"
        />
        <div className="mt-1 flex justify-between text-xs text-(--color-fg-muted)">
          <span>steady</span>
          <span>aggressive</span>
        </div>
      </div>
    </>
  );
}

function DietStep({ draft, setDraft }: { draft: Draft; setDraft: (d: Draft) => void }) {
  const opts = [
    { v: "classic" as Diet, label: "No restrictions", emoji: "🍽️" },
    { v: "pescatarian" as Diet, label: "Pescatarian", emoji: "🐟" },
    { v: "vegetarian" as Diet, label: "Vegetarian", emoji: "🥗" },
    { v: "vegan" as Diet, label: "Vegan", emoji: "🌱" },
  ];
  return (
    <>
      <StepHeading title="Diet preference?" subtitle="We'll keep it in mind." />
      <div className="flex flex-col gap-3">
        {opts.map((o) => (
          <ChoiceCard
            key={o.v}
            selected={draft.diet === o.v}
            onClick={() => setDraft({ ...draft, diet: o.v })}
            emoji={o.emoji}
            title={o.label}
          />
        ))}
      </div>
    </>
  );
}

function GeneratingStep() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="anim-pulse-dot block size-3 rounded-full bg-(--color-accent)"
            style={{ animationDelay: `${i * 160}ms` }}
          />
        ))}
      </div>
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-semibold tracking-tight">
          Building your custom plan
        </h2>
        <p className="text-(--color-fg-muted)">
          Crunching the numbers based on your stats.
        </p>
      </div>
    </div>
  );
}

function RevealStep({
  draft,
  onFinish,
  editing,
}: {
  draft: Draft;
  onFinish: () => void;
  editing: boolean;
}) {
  const targets = useMemo(() => {
    if (
      !draft.sex ||
      !draft.birthDate ||
      !draft.heightCm ||
      !draft.weightKg ||
      !draft.goal ||
      draft.workoutsPerWeek === undefined
    )
      return null;
    const activity = activityFromWorkouts(draft.workoutsPerWeek);
    return computeTargets({
      sex: draft.sex,
      birthDate: draft.birthDate,
      heightCm: draft.heightCm,
      weightKg: draft.weightKg,
      goal: draft.goal,
      goalWeightKg: draft.goalWeightKg ?? draft.weightKg,
      paceKgPerWeek:
        draft.goal === "maintain" ? 0 : draft.paceKgPerWeek ?? (draft.goal === "lose" ? -0.5 : 0.3),
      activity,
      diet: draft.diet ?? "classic",
      workoutsPerWeek: draft.workoutsPerWeek,
      units: draft.units,
      createdAt: new Date().toISOString(),
    });
  }, [draft]);

  if (!targets) return null;

  return (
    <div className="flex flex-1 flex-col">
      <header className="mb-6 mt-2 flex flex-col gap-2">
        <span className="text-sm font-medium text-(--color-accent)">
          Plan ready ✨
        </span>
        <h1 className="text-3xl font-semibold leading-tight tracking-tight">
          Eat this much each day
        </h1>
      </header>

      <div className="card mb-4 flex flex-col items-center gap-3 px-6 py-8">
        <span className="text-xs uppercase tracking-wider text-(--color-fg-muted)">
          Daily calorie target
        </span>
        <span className="text-6xl font-semibold tabular-nums">
          {fmtKcal(targets.calories)}
        </span>
        <span className="text-sm text-(--color-fg-muted)">kcal</span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <MacroBadge label="Protein" value={targets.proteinG} unit="g" color="var(--color-protein)" />
        <MacroBadge label="Carbs" value={targets.carbsG} unit="g" color="var(--color-carbs)" />
        <MacroBadge label="Fat" value={targets.fatG} unit="g" color="var(--color-fat)" />
      </div>

      <div className="flex-1" />

      <button
        type="button"
        onClick={onFinish}
        className="tap mt-6 w-full rounded-2xl bg-(--color-fg) py-4 text-base font-semibold text-(--color-bg) mb-[max(env(safe-area-inset-bottom),1.25rem)]"
      >
        {editing ? "Save plan" : "Let's get tracking"}
      </button>
    </div>
  );
}

function MacroBadge({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  return (
    <div className="card flex flex-col items-center gap-1 px-3 py-4">
      <span
        className="block size-2.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="text-2xl font-semibold tabular-nums">{value}</span>
      <span className="text-xs text-(--color-fg-muted)">{label}</span>
      <span className="text-[10px] text-(--color-fg-soft)">({unit})</span>
    </div>
  );
}
