"use client";

import { useState } from "react";
import type { AppState, FoodItem, Profile, WeightEntry } from "@/lib/types";
import { vibrate } from "@/lib/format";
import { HomeScreen } from "@/components/home/HomeScreen";
import { AnalyticsScreen } from "@/components/analytics/AnalyticsScreen";
import { SettingsScreen } from "@/components/settings/SettingsScreen";
import { AddSheet } from "@/components/add/AddSheet";

type Tab = "home" | "analytics" | "settings";

interface Props {
  state: AppState & { profile: Profile };
  onAdd: (item: FoodItem) => void;
  onDelete: (id: string) => void;
  onAddWeight: (entry: WeightEntry) => void;
  onDeleteWeight: (id: string) => void;
  onProfileEdit: () => void;
  onReset: () => void;
}

export function AppShell({
  state,
  onAdd,
  onDelete,
  onAddWeight,
  onDeleteWeight,
  onProfileEdit,
  onReset,
}: Props) {
  const [tab, setTab] = useState<Tab>("home");
  const [addOpen, setAddOpen] = useState(false);

  return (
    <div className="mx-auto flex min-h-svh max-w-md flex-col bg-(--color-bg)">
      <main
        className="flex-1"
        style={{
          paddingBottom:
            "calc(env(safe-area-inset-bottom) + 7.5rem)",
        }}
      >
        {tab === "home" && (
          <HomeScreen
            profile={state.profile}
            log={state.log}
            onDelete={onDelete}
          />
        )}
        {tab === "analytics" && (
          <AnalyticsScreen
            profile={state.profile}
            log={state.log}
            weights={state.weights}
          />
        )}
        {tab === "settings" && (
          <SettingsScreen
            profile={state.profile}
            weights={state.weights}
            onProfileEdit={onProfileEdit}
            onAddWeight={onAddWeight}
            onDeleteWeight={onDeleteWeight}
            onReset={onReset}
          />
        )}
      </main>

      <BottomNav tab={tab} setTab={setTab} onAdd={() => setAddOpen(true)} />

      <AddSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSave={(item) => {
          onAdd(item);
          setAddOpen(false);
        }}
      />
    </div>
  );
}

function BottomNav({
  tab,
  setTab,
  onAdd,
}: {
  tab: Tab;
  setTab: (t: Tab) => void;
  onAdd: () => void;
}) {
  return (
    <>
      <nav
        className="fixed bottom-0 left-1/2 z-30 w-full max-w-md -translate-x-1/2 border-t border-(--color-border) bg-(--color-bg)/95 backdrop-blur-md"
        style={{
          paddingBottom: "max(env(safe-area-inset-bottom), 0.5rem)",
        }}
      >
        <div className="grid grid-cols-3 gap-2 px-6 pt-3">
          <NavButton
            label="Home"
            active={tab === "home"}
            onClick={() => {
              vibrate(4);
              setTab("home");
            }}
            icon={
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 11l9-8 9 8v9a2 2 0 0 1-2 2h-4v-7H10v7H6a2 2 0 0 1-2-2v-9z" />
              </svg>
            }
          />
          <NavButton
            label="Analytics"
            active={tab === "analytics"}
            onClick={() => {
              vibrate(4);
              setTab("analytics");
            }}
            icon={
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <line x1="6" y1="20" x2="6" y2="13" />
                <line x1="12" y1="20" x2="12" y2="9" />
                <line x1="18" y1="20" x2="18" y2="6" />
              </svg>
            }
          />
          <NavButton
            label="Settings"
            active={tab === "settings"}
            onClick={() => {
              vibrate(4);
              setTab("settings");
            }}
            icon={
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01A1.65 1.65 0 0 0 9 3.09V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            }
          />
        </div>
      </nav>
      <button
        type="button"
        onClick={() => {
          vibrate(8);
          onAdd();
        }}
        aria-label="Add food"
        className="tap fixed left-1/2 z-40 flex size-16 -translate-x-1/2 items-center justify-center rounded-full bg-(--color-accent) text-3xl font-bold text-(--color-accent-fg)"
        style={{
          bottom: "calc(env(safe-area-inset-bottom) + 4.5rem)",
          boxShadow: "var(--shadow-fab)",
        }}
      >
        +
      </button>
    </>
  );
}

function NavButton({
  label,
  active,
  onClick,
  icon,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`tap flex flex-col items-center gap-0.5 py-1.5 text-[11px] font-medium transition-colors ${
        active ? "text-(--color-fg)" : "text-(--color-fg-soft)"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
