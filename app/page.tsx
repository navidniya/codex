"use client";

import { useEffect, useRef, useState } from "react";
import type { AppState, FoodItem, Profile, WeightEntry } from "@/lib/types";
import { clearState, loadState, saveState } from "@/lib/storage";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { AppShell } from "@/components/shell/AppShell";

type View = "main" | "edit-profile";

export default function Home() {
  const [state, setState] = useState<AppState | null>(null);
  const [view, setView] = useState<View>("main");
  const hydrated = useRef(false);

  useEffect(() => {
    setState(loadState());
  }, []);

  useEffect(() => {
    if (!state) return;
    if (!hydrated.current) {
      hydrated.current = true;
      return;
    }
    saveState(state);
  }, [state]);

  if (!state) {
    return (
      <div className="flex min-h-svh items-center justify-center text-(--color-fg-muted)">
        <span className="anim-fade text-sm">Loading…</span>
      </div>
    );
  }

  // First-time onboarding
  if (!state.profile) {
    return (
      <OnboardingFlow
        onComplete={(profile: Profile) =>
          setState((s) =>
            s ? { ...s, profile } : { profile, log: [], weights: [] },
          )
        }
      />
    );
  }

  // Edit-profile flow re-uses onboarding with the existing profile prefilled
  if (view === "edit-profile") {
    return (
      <OnboardingFlow
        initial={state.profile}
        onCancel={() => setView("main")}
        onComplete={(profile: Profile) => {
          setState((s) => (s ? { ...s, profile } : s));
          setView("main");
        }}
      />
    );
  }

  const addItem = (item: FoodItem) =>
    setState((s) => (s ? { ...s, log: [item, ...s.log] } : s));

  const deleteItem = (id: string) =>
    setState((s) =>
      s ? { ...s, log: s.log.filter((i) => i.id !== id) } : s,
    );

  const addWeight = (entry: WeightEntry) =>
    setState((s) => (s ? { ...s, weights: [entry, ...s.weights] } : s));

  const deleteWeight = (id: string) =>
    setState((s) =>
      s ? { ...s, weights: s.weights.filter((w) => w.id !== id) } : s,
    );

  const reset = () => {
    clearState();
    setState({ profile: null, log: [], weights: [] });
    setView("main");
  };

  return (
    <AppShell
      state={{ ...state, profile: state.profile }}
      onAdd={addItem}
      onDelete={deleteItem}
      onAddWeight={addWeight}
      onDeleteWeight={deleteWeight}
      onProfileEdit={() => setView("edit-profile")}
      onReset={reset}
    />
  );
}
