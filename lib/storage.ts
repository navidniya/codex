import type { AppState } from "./types";

const KEY = "cal-ai-clone:state:v2";
const LEGACY_KEY = "cal-ai-clone:state:v1";

const empty: AppState = { profile: null, log: [], weights: [] };

export function loadState(): AppState {
  if (typeof window === "undefined") return empty;
  try {
    const raw =
      window.localStorage.getItem(KEY) ?? window.localStorage.getItem(LEGACY_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Partial<AppState>;
    return {
      profile: parsed.profile ?? null,
      log: parsed.log ?? [],
      weights: parsed.weights ?? [],
    };
  } catch {
    return empty;
  }
}

export function saveState(state: AppState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Quota exceeded — drop image data and retry once.
    try {
      const stripped: AppState = {
        profile: state.profile,
        weights: state.weights,
        log: state.log.map(({ imageDataUrl: _, ...rest }) => rest),
      };
      window.localStorage.setItem(KEY, JSON.stringify(stripped));
    } catch {
      /* give up silently */
    }
  }
}

export function clearState(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
  window.localStorage.removeItem(LEGACY_KEY);
}
