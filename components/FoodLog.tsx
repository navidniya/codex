"use client";

import type { FoodItem } from "@/lib/types";

interface Props {
  items: FoodItem[];
  onDelete: (id: string) => void;
}

export function FoodLog({ items, onDelete }: Props) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-(--color-surface) p-8 text-center text-sm text-(--color-muted)">
        No meals logged yet today. Tap &ldquo;+&rdquo; to snap your first one.
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li
          key={item.id}
          className="flex items-center gap-3 rounded-xl border bg-(--color-surface) p-3"
        >
          {item.imageDataUrl ? (
            <img
              src={item.imageDataUrl}
              alt={item.name}
              className="size-14 shrink-0 rounded-lg object-cover"
            />
          ) : (
            <div className="size-14 shrink-0 rounded-lg bg-(--color-surface-2)" />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-sm font-medium">{item.name}</span>
              <span className="shrink-0 text-sm font-semibold tabular-nums">
                {item.calories} kcal
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-(--color-muted)">
              <span className="truncate">{item.servingDescription}</span>
              <span className="shrink-0 tabular-nums">
                P {item.proteinG} · C {item.carbsG} · F {item.fatG}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[10px] text-(--color-muted)/70">
              <span>{new Date(item.loggedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
              <button
                type="button"
                onClick={() => onDelete(item.id)}
                className="text-(--color-muted) hover:text-(--color-protein)"
              >
                Remove
              </button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
