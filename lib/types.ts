export type Sex = "male" | "female";

export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "very_active";

export type Goal = "lose" | "maintain" | "gain";

export type Diet = "classic" | "pescatarian" | "vegetarian" | "vegan";

export type Unit = "metric" | "imperial";

export interface Profile {
  sex: Sex;
  birthDate: string; // ISO date (yyyy-mm-dd)
  heightCm: number;
  weightKg: number;
  goalWeightKg: number;
  activity: ActivityLevel;
  goal: Goal;
  paceKgPerWeek: number; // signed: -1..-0.1 to lose, 0 to maintain, 0.1..1 to gain
  diet: Diet;
  workoutsPerWeek: number;
  units: Unit;
  createdAt: string; // ISO timestamp
}

export interface Targets {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export type FoodSource = "photo" | "describe" | "manual";

export interface FoodItem {
  id: string;
  loggedAt: string; // ISO timestamp
  name: string;
  servingDescription: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  imageDataUrl?: string;
  source: FoodSource;
  confidence?: "low" | "medium" | "high";
  notes?: string;
}

export interface WeightEntry {
  id: string;
  loggedAt: string; // ISO timestamp
  kg: number;
}

export interface AppState {
  profile: Profile | null;
  log: FoodItem[];
  weights: WeightEntry[];
}

export interface NutritionAnalysis {
  name: string;
  servingDescription: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  confidence: "low" | "medium" | "high";
  notes?: string;
}
