"use client";

import { useEffect, useRef, useState } from "react";
import type { FoodItem, NutritionAnalysis } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (item: FoodItem) => void;
}

type Step = "capture" | "analyzing" | "review" | "error";

const MAX_DIM = 1280;
const JPEG_QUALITY = 0.85;

async function fileToCompressedJpeg(
  file: File,
): Promise<{ dataUrl: string; base64: string; mediaType: string }> {
  // Pass imageOrientation so iPhone portrait JPEGs are rotated based on EXIF.
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error(
      "Couldn't read this image. iPhone HEIC photos aren't supported — switch your camera to JPEG (Settings → Camera → Formats → Most Compatible) or pick a different photo.",
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

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function AddFoodModal({ open, onClose, onSave }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [step, setStep] = useState<Step>("capture");
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [analysis, setAnalysis] = useState<NutritionAnalysis | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Lock background scroll while the modal is open (iOS rubber-banding).
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (open) {
      document.documentElement.dataset.modalOpen = "1";
    } else {
      delete document.documentElement.dataset.modalOpen;
    }
    return () => {
      delete document.documentElement.dataset.modalOpen;
    };
  }, [open]);

  // Cancel any in-flight analyze when the modal unmounts.
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  if (!open) return null;

  const reset = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStep("capture");
    setImageDataUrl(null);
    setNote("");
    setAnalysis(null);
    setErrorMessage("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const close = () => {
    reset();
    onClose();
  };

  const handleFile = async (file: File) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      setStep("analyzing");
      const { dataUrl, base64, mediaType } = await fileToCompressedJpeg(file);
      if (ctrl.signal.aborted) return;
      setImageDataUrl(dataUrl);

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mediaType, note }),
        signal: ctrl.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Request failed: ${res.status}`);
      }

      const data = (await res.json()) as NutritionAnalysis;
      if (ctrl.signal.aborted) return;
      setAnalysis(data);
      setStep("review");
    } catch (err) {
      if (ctrl.signal.aborted) return;
      setErrorMessage(err instanceof Error ? err.message : "Unknown error");
      setStep("error");
    }
  };

  const save = () => {
    if (!analysis) return;
    const item: FoodItem = {
      id: makeId(),
      loggedAt: new Date().toISOString(),
      name: analysis.name,
      servingDescription: analysis.servingDescription,
      calories: Math.round(analysis.calories),
      proteinG: Math.round(analysis.proteinG * 10) / 10,
      carbsG: Math.round(analysis.carbsG * 10) / 10,
      fatG: Math.round(analysis.fatG * 10) / 10,
      imageDataUrl: imageDataUrl ?? undefined,
    };
    onSave(item);
    close();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center"
      onClick={close}
    >
      <div
        className="flex max-h-[92svh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-t-2xl border-t bg-(--color-surface) p-6 sm:rounded-2xl sm:border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {step === "capture" && "Add a meal"}
            {step === "analyzing" && "Analyzing…"}
            {step === "review" && "Review"}
            {step === "error" && "Something went wrong"}
          </h2>
          <button
            type="button"
            onClick={close}
            className="rounded-full bg-(--color-surface-2) px-3 py-1 text-sm text-(--color-muted)"
          >
            Close
          </button>
        </div>

        {step === "capture" && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-(--color-muted)">
              Take a clear photo of your plate. Add a note for anything the
              camera can&rsquo;t see (e.g. &ldquo;cooked in butter&rdquo;).
            </p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Optional context"
              className="rounded-xl bg-(--color-surface-2) p-3 text-sm outline-none focus:ring-2 focus:ring-(--color-accent)/40"
            />
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
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="rounded-xl bg-(--color-accent) py-4 font-semibold text-black"
            >
              Take / choose photo
            </button>
          </div>
        )}

        {step === "analyzing" && (
          <div className="flex flex-col items-center gap-4 py-12">
            {imageDataUrl && (
              <img
                src={imageDataUrl}
                alt="Meal"
                className="size-40 rounded-xl object-cover"
              />
            )}
            <div className="flex items-center gap-2 text-sm text-(--color-muted)">
              <span className="size-2 animate-pulse rounded-full bg-(--color-accent)" />
              Claude is reading the plate…
            </div>
          </div>
        )}

        {step === "review" && analysis && (
          <div className="flex flex-col gap-4">
            {imageDataUrl && (
              <img
                src={imageDataUrl}
                alt={analysis.name}
                className="h-48 w-full rounded-xl object-cover"
              />
            )}
            <div className="flex flex-col gap-1">
              <input
                value={analysis.name}
                onChange={(e) =>
                  setAnalysis({ ...analysis, name: e.target.value })
                }
                className="rounded-lg bg-(--color-surface-2) px-3 py-2 text-base font-medium outline-none focus:ring-2 focus:ring-(--color-accent)/40"
              />
              <input
                value={analysis.servingDescription}
                onChange={(e) =>
                  setAnalysis({
                    ...analysis,
                    servingDescription: e.target.value,
                  })
                }
                className="rounded-lg bg-(--color-surface-2) px-3 py-2 text-sm text-(--color-muted) outline-none focus:ring-2 focus:ring-(--color-accent)/40"
              />
            </div>
            <div className="grid grid-cols-4 gap-2">
              <MacroEdit
                label="kcal"
                value={analysis.calories}
                onChange={(v) => setAnalysis({ ...analysis, calories: v })}
              />
              <MacroEdit
                label="P"
                value={analysis.proteinG}
                onChange={(v) => setAnalysis({ ...analysis, proteinG: v })}
              />
              <MacroEdit
                label="C"
                value={analysis.carbsG}
                onChange={(v) => setAnalysis({ ...analysis, carbsG: v })}
              />
              <MacroEdit
                label="F"
                value={analysis.fatG}
                onChange={(v) => setAnalysis({ ...analysis, fatG: v })}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-(--color-muted)">
              <span>
                Confidence:{" "}
                <span
                  className={
                    analysis.confidence === "high"
                      ? "text-(--color-accent)"
                      : analysis.confidence === "medium"
                        ? "text-(--color-carbs)"
                        : "text-(--color-protein)"
                  }
                >
                  {analysis.confidence}
                </span>
              </span>
              {analysis.notes && <span className="ml-3 truncate">{analysis.notes}</span>}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={reset}
                className="flex-1 rounded-xl border bg-(--color-surface-2) py-3 text-sm"
              >
                Retry
              </button>
              <button
                type="button"
                onClick={save}
                className="flex-[2] rounded-xl bg-(--color-accent) py-3 font-semibold text-black"
              >
                Save to log
              </button>
            </div>
          </div>
        )}

        {step === "error" && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-(--color-protein)">{errorMessage}</p>
            <button
              type="button"
              onClick={reset}
              className="rounded-xl bg-(--color-accent) py-3 font-semibold text-black"
            >
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function MacroEdit({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col items-center rounded-lg bg-(--color-surface-2) p-2">
      <input
        type="number"
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) onChange(n);
        }}
        className="w-full bg-transparent text-center text-base font-semibold tabular-nums outline-none"
      />
      <span className="text-[10px] uppercase tracking-wider text-(--color-muted)">
        {label}
      </span>
    </div>
  );
}
