"use client";

import { useEffect, useRef, useState } from "react";
import type { AppState, FoodItem, Profile } from "@/lib/types";
import { loadState, saveState } from "@/lib/storage";
import { Onboarding } from "@/components/Onboarding";
import { Dashboard } from "@/components/Dashboard";

type View = "dashboard" | "edit-profile";

export default function Home() {
  const [state, setState] = useState<AppState | null>(null);
  const [view, setView] = useState<View>("dashboard");
  const hydrated = useRef(false);

  useEffect(() => {
    setState(loadState());
  }, []);

  useEffect(() => {
    if (!state) return;
    if (!hydrated.current) {
      hydrated.current = true;
      return; // skip the initial save right after loadState()
    }
    saveState(state);
  }, [state]);

  if (!state) {
    return (
      <div className="flex min-h-svh items-center justify-center text-(--color-muted)">
        Loading…
      </div>
    );
  }

  if (!state.profile || view === "edit-profile") {
    return (
      <Onboarding
        initial={state.profile ?? undefined}
        onCancel={state.profile ? () => setView("dashboard") : undefined}
        onComplete={(profile: Profile) => {
          setState((s) => ({ profile, log: s?.log ?? [] }));
          setView("dashboard");
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

  return (
    <Dashboard
      profile={state.profile}
      log={state.log}
      onAdd={addItem}
      onDelete={deleteItem}
      onEditProfile={() => setView("edit-profile")}
    />
  );
}
