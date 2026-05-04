"use client";

import { useEffect, useState } from "react";
import type { AppState, FoodItem, Profile } from "@/lib/types";
import { loadState, saveState } from "@/lib/storage";
import { Onboarding } from "@/components/Onboarding";
import { Dashboard } from "@/components/Dashboard";

export default function Home() {
  const [state, setState] = useState<AppState | null>(null);

  useEffect(() => {
    setState(loadState());
  }, []);

  useEffect(() => {
    if (state) saveState(state);
  }, [state]);

  if (!state) {
    return (
      <div className="flex min-h-svh items-center justify-center text-(--color-muted)">
        Loading…
      </div>
    );
  }

  if (!state.profile) {
    return (
      <Onboarding
        onComplete={(profile: Profile) =>
          setState({ profile, log: state.log })
        }
      />
    );
  }

  const addItem = (item: FoodItem) =>
    setState({ ...state, log: [item, ...state.log] });

  const deleteItem = (id: string) =>
    setState({ ...state, log: state.log.filter((i) => i.id !== id) });

  const resetProfile = () => setState({ ...state, profile: null });

  return (
    <Dashboard
      profile={state.profile}
      log={state.log}
      onAdd={addItem}
      onDelete={deleteItem}
      onResetProfile={resetProfile}
    />
  );
}
