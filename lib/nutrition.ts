import type { ActivityLevel, FoodItem, Profile, Targets } from "./types";

const ACTIVITY_FACTOR: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

// 1 kg of body fat ~ 7700 kcal.
const KCAL_PER_KG = 7700;

export function ageFromBirthDate(iso: string, now: Date = new Date()): number {
  const dob = new Date(iso);
  if (Number.isNaN(dob.getTime())) return 30;
  let years = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) years -= 1;
  return Math.max(13, Math.min(100, years));
}

function bmr(profile: Profile): number {
  // Mifflin-St Jeor
  const age = ageFromBirthDate(profile.birthDate);
  const base =
    10 * profile.weightKg + 6.25 * profile.heightCm - 5 * age;
  return profile.sex === "male" ? base + 5 : base - 161;
}

export function tdee(profile: Profile): number {
  return bmr(profile) * ACTIVITY_FACTOR[profile.activity];
}

export function computeTargets(profile: Profile): Targets {
  const dailyDelta = (KCAL_PER_KG * profile.paceKgPerWeek) / 7; // negative for lose
  const calories = Math.max(1200, Math.round(tdee(profile) + dailyDelta));

  // Higher protein on cuts; balanced otherwise.
  const proteinPctByGoal = profile.goal === "lose" ? 0.35 : profile.goal === "gain" ? 0.3 : 0.3;
  const fatPctByGoal = 0.3;
  const carbsPct = 1 - proteinPctByGoal - fatPctByGoal;

  const proteinG = Math.round((calories * proteinPctByGoal) / 4);
  const carbsG = Math.round((calories * carbsPct) / 4);
  const fatG = Math.round((calories * fatPctByGoal) / 9);

  return { calories, proteinG, carbsG, fatG };
}

export function sumTotals(
  items: { calories: number; proteinG: number; carbsG: number; fatG: number }[],
) {
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

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function itemsOnDate(items: FoodItem[], date: Date): FoodItem[] {
  return items.filter((i) => isSameDay(new Date(i.loggedAt), date));
}

/**
 * Streak = consecutive days (ending today or yesterday) with at least one
 * meal logged. Returns 0 if no meals today AND no meals yesterday.
 */
export function streakDays(items: FoodItem[], now: Date = new Date()): number {
  if (items.length === 0) return 0;
  const today = startOfDay(now);

  const days = new Set<number>();
  for (const i of items) {
    days.add(startOfDay(new Date(i.loggedAt)).getTime());
  }

  let cursor = new Date(today);
  // If nothing today but something yesterday, still count yesterday's streak.
  if (!days.has(cursor.getTime())) {
    cursor.setDate(cursor.getDate() - 1);
    if (!days.has(cursor.getTime())) return 0;
  }

  let count = 0;
  while (days.has(cursor.getTime())) {
    count += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

export function lastNDays(n: number, now: Date = new Date()): Date[] {
  const out: Date[] = [];
  const today = startOfDay(now);
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    out.push(d);
  }
  return out;
}

export function cmToFeetInches(cm: number): { ft: number; inch: number } {
  const totalInches = cm / 2.54;
  const ft = Math.floor(totalInches / 12);
  const inch = Math.round(totalInches - ft * 12);
  return { ft, inch };
}

export function feetInchesToCm(ft: number, inch: number): number {
  return Math.round((ft * 12 + inch) * 2.54);
}

export function kgToLb(kg: number): number {
  return Math.round(kg * 2.20462 * 10) / 10;
}

export function lbToKg(lb: number): number {
  return Math.round((lb / 2.20462) * 10) / 10;
}
