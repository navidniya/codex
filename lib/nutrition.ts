import type { ActivityLevel, Goal, Profile, Targets } from "./types";

const ACTIVITY_FACTOR: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

const GOAL_DELTA: Record<Goal, number> = {
  lose: -500,
  maintain: 0,
  gain: 400,
};

// Mifflin-St Jeor BMR
function bmr(profile: Profile): number {
  const base =
    10 * profile.weightKg + 6.25 * profile.heightCm - 5 * profile.age;
  return profile.sex === "male" ? base + 5 : base - 161;
}

export function computeTargets(profile: Profile): Targets {
  const tdee = bmr(profile) * ACTIVITY_FACTOR[profile.activity];
  const calories = Math.max(1200, Math.round(tdee + GOAL_DELTA[profile.goal]));

  // Macro split: 30% protein, 40% carbs, 30% fat (g/cal: 4/4/9)
  const proteinG = Math.round((calories * 0.3) / 4);
  const carbsG = Math.round((calories * 0.4) / 4);
  const fatG = Math.round((calories * 0.3) / 9);

  return { calories, proteinG, carbsG, fatG };
}

export function sumTotals(items: { calories: number; proteinG: number; carbsG: number; fatG: number }[]) {
  return items.reduce(
    (acc, i) => ({
      calories: acc.calories + i.calories,
      proteinG: acc.proteinG + i.proteinG,
      carbsG: acc.carbsG + i.carbsG,
      fatG: acc.fatG + i.fatG,
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  );
}

export function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}
