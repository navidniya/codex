"use client";

import { useEffect, useRef, useState } from "react";
import type { FoodItem, FoodSource, NutritionAnalysis } from "@/lib/types";
import { fmtKcal, makeId, vibrate } from "@/lib/format";
import { Sheet } from "@/components/shared/Sheet";

type Mode = "menu" | "photo-loading" | "describe" | "manual" | "review" | "error";

const MAX_DIM = 1280;
const JPEG_QUALITY = 0.85;

async function fileToCompressedJpeg(
  file: File,
): Promise<{ dataUrl: string; base64: string; mediaType: string }> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error(
      "Couldn't read this image. iPhone HEIC photos aren't supported — try changing your camera format to JPEG, or pick a different photo.",
    );
  }
  const scale = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported on this browser.");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();

  const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  const base64 = dataUrl.split(",")[1] ?? "";
  if (!base64) throw new Error("Image was too large to encode. Try a smaller photo.");
  return { dataUrl, base64, mediaType: "image/jpeg" };
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (item: FoodItem) => void;
}

export function AddSheet({ open, onClose, onSave }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [mode, setMode] = useState<Mode>("menu");
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<NutritionAnalysis | null>(null);
  const [source, setSource] = useState<FoodSource>("photo");
  const [errorMessage, setErrorMessage] = useState("");

  const [describeText, setDescribeText] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualCal, setManualCal] = useState("");
  const [manualP, setManualP] = useState("");
  const [manualC, setManualC] = useState("");
  const [manualF, setManualF] = useState("");

  useEffect(() => {
    if (!open) {
      reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => () => abortRef.current?.abort(), []);

  function reset() {
    abortRef.current?.abort();
    abortRef.current = null;
    setMode("menu");
    setImageDataUrl(null);
    setAnalysis(null);
    setErrorMessage("");
    setDescribeText("");
    setManualName("");
    setManualCal("");
    setManualP("");
    setManualC("");
    setManualF("");
    if (fileRef.current) fileRef.current.value = "";
    if (galleryRef.current) galleryRef.current.value = "";
  }

  async function handleFile(file: File) {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setSource("photo");
    setMode("photo-loading");
    try {
      const { dataUrl, base64, mediaType } = await fileToCompressedJpeg(file);
      if (ctrl.signal.aborted) return;
      setImageDataUrl(dataUrl);

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mediaType }),
        signal: ctrl.signal,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Request failed: ${res.status}`);
      }
      const data = (await res.json()) as NutritionAnalysis;
      if (ctrl.signal.aborted) return;
      setAnalysis(data);
      vibrate([5, 30, 12]);
      setMode("review");
    } catch (err) {
      if (ctrl.signal.aborted) return;
      setErrorMessage(err instanceof Error ? err.message : "Unknown error");
      setMode("error");
    }
  }

  async function handleDescribe() {
    if (!describeText.trim()) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setSource("describe");
    setMode("photo-loading");
    setImageDataUrl(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: describeText.trim() }),
        signal: ctrl.signal,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Request failed: ${res.status}`);
      }
      const data = (await res.json()) as NutritionAnalysis;
      if (ctrl.signal.aborted) return;
      setAnalysis(data);
      vibrate([5, 30, 12]);
      setMode("review");
    } catch (err) {
      if (ctrl.signal.aborted) return;
      setErrorMessage(err instanceof Error ? err.message : "Unknown error");
      setMode("error");
    }
  }

  function saveManual() {
    const cal = Number(manualCal);
    if (!manualName.trim() || !Number.isFinite(cal) || cal <= 0) return;
    const item: FoodItem = {
      id: makeId(),
      loggedAt: new Date().toISOString(),
      name: manualName.trim(),
      servingDescription: "1 serving",
      calories: Math.round(cal),
      proteinG: numOr(manualP),
      carbsG: numOr(manualC),
      fatG: numOr(manualF),
      source: "manual",
    };
    vibrate(10);
    onSave(item);
  }

  function saveAnalysis() {
    if (!analysis) return;
    const item: FoodItem = {
      id: makeId(),
      loggedAt: new Date().toISOString(),
      name: analysis.name,
      servingDescription: analysis.servingDescription,
      calories: Math.round(analysis.calories),
      proteinG: round1(analysis.proteinG),
      carbsG: round1(analysis.carbsG),
      fatG: round1(analysis.fatG),
      imageDataUrl: imageDataUrl ?? undefined,
      source,
      confidence: analysis.confidence,
      notes: analysis.notes,
    };
    vibrate(10);
    onSave(item);
  }

  const title =
    mode === "menu"
      ? "Add a meal"
      : mode === "describe"
        ? "Describe your meal"
        : mode === "manual"
          ? "Quick add"
          : mode === "photo-loading"
            ? "Analyzing…"
            : mode === "review"
              ? "Review"
              : "Something went wrong";

  return (
    <Sheet open={open} onClose={onClose} title={title}>
      {mode === "menu" && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-(--color-fg-muted)">
            Choose how you want to log this meal.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          <input
            ref={galleryRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          <ActionTile
            emoji="📸"
            title="Snap a photo"
            subtitle="Open the camera and let AI estimate it"
            onClick={() => fileRef.current?.click()}
          />
          <ActionTile
            emoji="🖼️"
            title="From gallery"
            subtitle="Pick a photo you've already taken"
            onClick={() => galleryRef.current?.click()}
          />
          <ActionTile
            emoji="✍️"
            title="Describe in words"
            subtitle="“Caesar salad with grilled chicken, large”"
            onClick={() => setMode("describe")}
          />
          <ActionTile
            emoji="⌨️"
            title="Quick add"
            subtitle="Type calories and macros yourself"
            onClick={() => setMode("manual")}
          />
        </div>
      )}

      {mode === "describe" && (
        <div className="flex flex-col gap-3">
          <textarea
            autoFocus
            rows={4}
            placeholder="e.g. medium bowl of pasta carbonara"
            value={describeText}
            onChange={(e) => setDescribeText(e.target.value)}
            className="rounded-2xl border-2 border-(--color-border) bg-(--color-surface) px-4 py-3 outline-none focus:border-(--color-fg)"
          />
          <div className="flex gap-2 pb-2">
            <button
              type="button"
              onClick={() => setMode("menu")}
              className="tap flex-1 rounded-2xl border-2 border-(--color-border) bg-(--color-surface) py-3 text-sm font-semibold"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleDescribe}
              disabled={!describeText.trim()}
              className="tap flex-[2] rounded-2xl bg-(--color-fg) py-3 text-sm font-semibold text-(--color-bg) disabled:opacity-30"
            >
              Estimate
            </button>
          </div>
        </div>
      )}

      {mode === "manual" && (
        <div className="flex flex-col gap-3">
          <input
            autoFocus
            placeholder="Name (e.g. Granola)"
            value={manualName}
            onChange={(e) => setManualName(e.target.value)}
            className="rounded-2xl border-2 border-(--color-border) bg-(--color-surface) px-4 py-3 outline-none focus:border-(--color-fg)"
          />
          <div className="grid grid-cols-2 gap-2">
            <ManualField label="kcal" value={manualCal} setValue={setManualCal} />
            <ManualField label="Protein (g)" value={manualP} setValue={setManualP} />
            <ManualField label="Carbs (g)" value={manualC} setValue={setManualC} />
            <ManualField label="Fat (g)" value={manualF} setValue={setManualF} />
          </div>
          <div className="flex gap-2 pb-2">
            <button
              type="button"
              onClick={() => setMode("menu")}
              className="tap flex-1 rounded-2xl border-2 border-(--color-border) bg-(--color-surface) py-3 text-sm font-semibold"
            >
              Back
            </button>
            <button
              type="button"
              onClick={saveManual}
              disabled={!manualName.trim() || !Number(manualCal)}
              className="tap flex-[2] rounded-2xl bg-(--color-fg) py-3 text-sm font-semibold text-(--color-bg) disabled:opacity-30"
            >
              Save
            </button>
          </div>
        </div>
      )}

      {mode === "photo-loading" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 py-10">
          {imageDataUrl ? (
            <img
              src={imageDataUrl}
              alt="meal"
              className="size-40 rounded-2xl object-cover"
            />
          ) : (
            <div className="flex size-40 items-center justify-center rounded-2xl bg-(--color-surface-2) text-5xl">
              ✍️
            </div>
          )}
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="anim-pulse-dot block size-2.5 rounded-full bg-(--color-accent)"
                style={{ animationDelay: `${i * 160}ms` }}
              />
            ))}
          </div>
          <span className="text-sm text-(--color-fg-muted)">
            Claude is reading the {imageDataUrl ? "plate" : "description"}…
          </span>
        </div>
      )}

      {mode === "review" && analysis && (
        <div className="flex flex-col gap-3">
          {imageDataUrl && (
            <img
              src={imageDataUrl}
              alt={analysis.name}
              className="h-48 w-full rounded-2xl object-cover"
            />
          )}
          <input
            value={analysis.name}
            onChange={(e) => setAnalysis({ ...analysis, name: e.target.value })}
            className="rounded-xl border-2 border-(--color-border) bg-(--color-surface) px-3 py-2 font-semibold"
          />
          <input
            value={analysis.servingDescription}
            onChange={(e) => setAnalysis({ ...analysis, servingDescription: e.target.value })}
            className="rounded-xl border-2 border-(--color-border) bg-(--color-surface) px-3 py-2 text-sm text-(--color-fg-muted)"
          />
          <div className="grid grid-cols-4 gap-2">
            <MacroEditor label="kcal" value={analysis.calories} onChange={(v) => setAnalysis({ ...analysis, calories: v })} />
            <MacroEditor label="P" value={analysis.proteinG} onChange={(v) => setAnalysis({ ...analysis, proteinG: v })} />
            <MacroEditor label="C" value={analysis.carbsG} onChange={(v) => setAnalysis({ ...analysis, carbsG: v })} />
            <MacroEditor label="F" value={analysis.fatG} onChange={(v) => setAnalysis({ ...analysis, fatG: v })} />
          </div>
          <div className="flex items-center justify-between text-xs text-(--color-fg-muted)">
            <span>
              Confidence:{" "}
              <span
                className={
                  analysis.confidence === "high"
                    ? "font-semibold text-(--color-fg)"
                    : analysis.confidence === "medium"
                      ? "text-(--color-carbs)"
                      : "text-(--color-protein)"
                }
              >
                {analysis.confidence}
              </span>
            </span>
            <span className="tabular-nums">{fmtKcal(analysis.calories)} kcal</span>
          </div>
          {analysis.notes && (
            <p className="rounded-xl bg-(--color-surface-2) px-3 py-2 text-xs text-(--color-fg-muted)">
              {analysis.notes}
            </p>
          )}
          <div className="flex gap-2 pb-2">
            <button
              type="button"
              onClick={reset}
              className="tap flex-1 rounded-2xl border-2 border-(--color-border) bg-(--color-surface) py-3 text-sm font-semibold"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={saveAnalysis}
              className="tap flex-[2] rounded-2xl bg-(--color-fg) py-3 text-sm font-semibold text-(--color-bg)"
            >
              Save to log
            </button>
          </div>
        </div>
      )}

      {mode === "error" && (
        <div className="flex flex-col gap-3 pb-2">
          <p className="text-sm text-(--color-protein)">{errorMessage}</p>
          <button
            type="button"
            onClick={reset}
            className="tap rounded-2xl bg-(--color-fg) py-3 text-sm font-semibold text-(--color-bg)"
          >
            Try again
          </button>
        </div>
      )}
    </Sheet>
  );
}

function ActionTile({
  emoji,
  title,
  subtitle,
  onClick,
}: {
  emoji: string;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        vibrate(6);
        onClick();
      }}
      className="tap flex items-center gap-3 rounded-2xl bg-(--color-surface) px-4 py-4 text-left"
    >
      <span className="flex size-12 items-center justify-center rounded-2xl bg-(--color-surface-2) text-2xl">
        {emoji}
      </span>
      <div className="flex-1">
        <div className="font-semibold">{title}</div>
        <div className="text-xs text-(--color-fg-muted)">{subtitle}</div>
      </div>
      <span className="text-(--color-fg-soft)">›</span>
    </button>
  );
}

function ManualField({
  label,
  value,
  setValue,
}: {
  label: string;
  value: string;
  setValue: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 rounded-2xl border-2 border-(--color-border) bg-(--color-surface) px-3 py-2">
      <span className="text-[10px] uppercase tracking-wider text-(--color-fg-muted)">
        {label}
      </span>
      <input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="bg-transparent text-lg font-semibold tabular-nums outline-none"
      />
    </label>
  );
}

function MacroEditor({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl bg-(--color-surface-2) p-2">
      <input
        type="number"
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) onChange(n);
        }}
        className="w-full bg-transparent text-center font-semibold tabular-nums outline-none"
      />
      <span className="text-[10px] uppercase tracking-wider text-(--color-fg-muted)">
        {label}
      </span>
    </div>
  );
}

function numOr(s: string): number {
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 10) / 10 : 0;
}
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
