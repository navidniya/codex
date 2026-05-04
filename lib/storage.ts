import type { AppState } from "./types";

const KEY = "cal-ai-clone:state:v1";

const empty: AppState = { profile: null, log: [] };

export function loadState(): AppState {
  if (typeof window === "undefined") return empty;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as AppState;
    return { profile: parsed.profile ?? null, log: parsed.log ?? [] };
  } catch {
    return empty;
  }
}

export function saveState(state: AppState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(state));
}

export function clearState(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}
