import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const NutritionSchema = z.object({
  name: z
    .string()
    .describe("Concise dish/food name, e.g. 'Grilled chicken Caesar salad'"),
  servingDescription: z
    .string()
    .describe(
      "Visible portion in plain language, e.g. 'about 1 cup' or '2 slices'",
    ),
  calories: z.number().int().nonnegative(),
  proteinG: z.number().nonnegative(),
  carbsG: z.number().nonnegative(),
  fatG: z.number().nonnegative(),
  confidence: z
    .enum(["low", "medium", "high"])
    .describe("Confidence in the estimate based on image clarity and recognizability"),
  notes: z
    .string()
    .optional()
    .describe("Brief assumptions or caveats, e.g. 'Assumed olive oil dressing'"),
});

const SYSTEM_PROMPT = `You are a nutrition analyst that estimates calories and macronutrients from food photos.

Given a single food image, identify the dish and estimate its nutrition for the visible portion. Follow these rules:

1. Identify the most likely dish or combination of foods. If multiple items are on the plate, treat the whole plate as one entry and combine their macros.
2. Estimate the visible portion size from visual cues (plate diameter ~25cm, utensil sizes, etc.). Be realistic — don't assume restaurant-large or diet-tiny portions without evidence.
3. Provide whole-number calories. Macros (protein/carbs/fat) may include one decimal.
4. Use confidence:
   - "high": clearly recognizable single dish with predictable preparation (e.g. plain grilled chicken breast)
   - "medium": recognizable but with hidden variables (sauces, oils, breading)
   - "low": ambiguous, mixed, or partially obscured
5. Macros must be self-consistent with calories: protein*4 + carbs*4 + fat*9 should be within ~15% of the calorie value.
6. If the image clearly does not contain food, return calories: 0, all macros 0, confidence: "low", and explain in notes.

Be decisive — return your single best estimate, not ranges.`;

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured." },
      { status: 500 },
    );
  }

  let body: { imageBase64?: string; mediaType?: string; note?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { imageBase64, mediaType, note } = body;
  if (!imageBase64 || !mediaType) {
    return NextResponse.json(
      { error: "imageBase64 and mediaType are required." },
      { status: 400 },
    );
  }

  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowed.includes(mediaType)) {
    return NextResponse.json(
      { error: `Unsupported media type: ${mediaType}` },
      { status: 400 },
    );
  }

  const client = new Anthropic();

  const userText = note?.trim()
    ? `Analyze this food. The user adds context: "${note.trim()}"`
    : "Analyze this food and return its nutrition.";

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
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType as
                  | "image/jpeg"
                  | "image/png"
                  | "image/webp"
                  | "image/gif",
                data: imageBase64,
              },
            },
            { type: "text", text: userText },
          ],
        },
      ],
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
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
