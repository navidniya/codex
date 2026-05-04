import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const NutritionSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(120)
    .describe("Concise dish/food name, e.g. 'Grilled chicken Caesar salad'"),
  servingDescription: z
    .string()
    .min(1)
    .max(120)
    .describe(
      "Visible portion in plain language, e.g. 'about 1 cup' or '2 slices'",
    ),
  calories: z.number().int().nonnegative().max(5000),
  proteinG: z.number().nonnegative().max(500),
  carbsG: z.number().nonnegative().max(800),
  fatG: z.number().nonnegative().max(500),
  confidence: z
    .enum(["low", "medium", "high"])
    .describe(
      "Confidence in the estimate based on image clarity / description specificity",
    ),
  notes: z
    .string()
    .max(280)
    .optional()
    .describe("Brief assumptions or caveats, e.g. 'Assumed olive oil dressing'"),
});

const SYSTEM_PROMPT = `You are a nutrition analyst that estimates calories and macronutrients from a food photo OR a written description.

Identify the dish (or combination of dishes on the plate) and estimate its nutrition for the visible portion. Rules:

1. Treat the whole plate as one entry; combine items if there are multiple.
2. Estimate the portion size from visual cues (plate ~25cm, utensil sizes) when given an image, or from typical serving sizes when given text.
3. Whole-number calories. Macros (protein/carbs/fat) may include one decimal.
4. Confidence:
   - "high": clearly recognizable single dish with predictable preparation
   - "medium": recognizable but with hidden variables (sauces, oils, breading, vague portion)
   - "low": ambiguous, mixed, partially obscured, or only loosely described
5. Macros must be self-consistent: protein*4 + carbs*4 + fat*9 should be within ~15% of the calorie value.
6. If the input clearly does not refer to food, return calories: 0 with all macros 0, confidence: "low", and explain in notes.

Be decisive — return your single best estimate, not ranges.`;

type Body =
  | { imageBase64: string; mediaType: string; note?: string; text?: never }
  | { text: string; imageBase64?: never; mediaType?: never; note?: never };

function isImageBody(b: unknown): b is Extract<Body, { imageBase64: string }> {
  return (
    typeof b === "object" &&
    b !== null &&
    typeof (b as { imageBase64?: unknown }).imageBase64 === "string" &&
    typeof (b as { mediaType?: unknown }).mediaType === "string"
  );
}
function isTextBody(b: unknown): b is Extract<Body, { text: string }> {
  return (
    typeof b === "object" &&
    b !== null &&
    typeof (b as { text?: unknown }).text === "string" &&
    !(b as { imageBase64?: unknown }).imageBase64
  );
}

export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const imgBody = isImageBody(raw) ? raw : null;
  const txtBody = !imgBody && isTextBody(raw) ? raw : null;

  if (!imgBody && !txtBody) {
    return NextResponse.json(
      { error: "Provide either {imageBase64, mediaType} or {text}." },
      { status: 400 },
    );
  }

  if (imgBody) {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(imgBody.mediaType)) {
      return NextResponse.json(
        { error: `Unsupported media type: ${imgBody.mediaType}` },
        { status: 400 },
      );
    }
  }

  if (process.env.DEMO_MODE === "1") {
    if (txtBody) {
      return NextResponse.json({
        name: txtBody.text.slice(0, 60) || "Demo meal",
        servingDescription: "1 serving",
        calories: 420,
        proteinG: 24,
        carbsG: 48,
        fatG: 14,
        confidence: "medium" as const,
        notes:
          "DEMO_MODE — set ANTHROPIC_API_KEY and unset DEMO_MODE for real analysis.",
      });
    }
    return NextResponse.json({
      name: "Demo plate",
      servingDescription: "about 1 plate",
      calories: 540,
      proteinG: 32,
      carbsG: 58,
      fatG: 19,
      confidence: "medium" as const,
      notes:
        "DEMO_MODE — set ANTHROPIC_API_KEY and unset DEMO_MODE for real analysis.",
    });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured." },
      { status: 500 },
    );
  }

  const client = new Anthropic();

  type Block =
    | { type: "image"; source: { type: "base64"; media_type: "image/jpeg" | "image/png" | "image/webp" | "image/gif"; data: string } }
    | { type: "text"; text: string };

  const userContent: Block[] = imgBody
    ? [
        {
          type: "image",
          source: {
            type: "base64",
            media_type: imgBody.mediaType as
              | "image/jpeg"
              | "image/png"
              | "image/webp"
              | "image/gif",
            data: imgBody.imageBase64,
          },
        },
        {
          type: "text",
          text: imgBody.note?.trim()
            ? `Analyze this food. The user adds context: "${imgBody.note.trim().replace(/"/g, '\\"')}"`
            : "Analyze this food and return its nutrition.",
        },
      ]
    : [
        {
          type: "text",
          text: `Estimate the nutrition for this meal description: "${txtBody!.text.replace(/"/g, '\\"')}"`,
        },
      ];

  try {
    const response = await client.messages.parse({
      model: "claude-opus-4-7",
      max_tokens: 1024,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      output_config: { format: zodOutputFormat(NutritionSchema) },
      messages: [{ role: "user", content: userContent }],
    });

    if (!response.parsed_output) {
      return NextResponse.json(
        { error: "Could not parse nutrition response." },
        { status: 502 },
      );
    }
    return NextResponse.json(response.parsed_output);
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status ?? 500 },
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
