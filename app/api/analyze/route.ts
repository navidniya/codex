import { z } from "zod";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const NutritionSchema = z.object({
  name: z.string().min(1).max(120),
  servingDescription: z.string().min(1).max(120),
  calories: z.number().int().nonnegative().max(5000),
  proteinG: z.number().nonnegative().max(500),
  carbsG: z.number().nonnegative().max(800),
  fatG: z.number().nonnegative().max(500),
  confidence: z.enum(["low", "medium", "high"]),
  notes: z.string().max(280).optional(),
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

Return ONLY valid JSON matching this schema (no markdown fences, no commentary):
{
  "name": string,
  "servingDescription": string,
  "calories": integer,
  "proteinG": number,
  "carbsG": number,
  "fatG": number,
  "confidence": "low" | "medium" | "high",
  "notes": string (optional)
}`;

const LIARA_BASE_URL =
  process.env.LIARA_BASE_URL ?? "https://ai.liara.ir/api/v1";
const LIARA_MODEL = process.env.LIARA_MODEL ?? "openai/gpt-4o-mini";

type ImageBody = { imageBase64: string; mediaType: string; note?: string };
type TextBody = { text: string };

function isImageBody(b: unknown): b is ImageBody {
  return (
    typeof b === "object" &&
    b !== null &&
    typeof (b as ImageBody).imageBase64 === "string" &&
    typeof (b as ImageBody).mediaType === "string"
  );
}
function isTextBody(b: unknown): b is TextBody {
  return (
    typeof b === "object" &&
    b !== null &&
    typeof (b as TextBody).text === "string" &&
    !(b as ImageBody).imageBase64
  );
}

const DEMO_IMAGE_RESPONSE = {
  name: "Demo plate",
  servingDescription: "about 1 plate",
  calories: 540,
  proteinG: 32,
  carbsG: 58,
  fatG: 19,
  confidence: "medium" as const,
  notes:
    "DEMO_MODE — set LIARA_API_KEY (or unset DEMO_MODE) for a real estimate.",
};

function demoTextResponse(text: string) {
  return {
    name: text.slice(0, 60) || "Demo meal",
    servingDescription: "1 serving",
    calories: 420,
    proteinG: 24,
    carbsG: 48,
    fatG: 14,
    confidence: "medium" as const,
    notes:
      "DEMO_MODE — set LIARA_API_KEY (or unset DEMO_MODE) for a real estimate.",
  };
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
    return NextResponse.json(
      txtBody ? demoTextResponse(txtBody.text) : DEMO_IMAGE_RESPONSE,
    );
  }

  if (!process.env.LIARA_API_KEY) {
    return NextResponse.json(
      { error: "LIARA_API_KEY is not configured." },
      { status: 500 },
    );
  }

  // Build OpenAI-compatible messages payload.
  type ContentPart =
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string } };

  const userParts: ContentPart[] = imgBody
    ? [
        {
          type: "text",
          text: imgBody.note?.trim()
            ? `Analyze this food. The user adds context: "${imgBody.note.trim().replace(/"/g, '\\"')}"`
            : "Analyze this food and return its nutrition as JSON.",
        },
        {
          type: "image_url",
          image_url: {
            url: `data:${imgBody.mediaType};base64,${imgBody.imageBase64}`,
          },
        },
      ]
    : [
        {
          type: "text",
          text: `Estimate the nutrition for this meal description and return JSON: "${txtBody!.text.replace(/"/g, '\\"')}"`,
        },
      ];

  const requestBody = {
    model: LIARA_MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userParts },
    ],
    response_format: { type: "json_object" as const },
    temperature: 0.2,
    max_tokens: 600,
  };

  let upstream: Response;
  try {
    upstream = await fetch(`${LIARA_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.LIARA_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
      // 55s — leave headroom under maxDuration=60
      signal: AbortSignal.timeout(55_000),
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? `Network error reaching Liara AI: ${err.message}`
            : "Network error reaching Liara AI.",
      },
      { status: 502 },
    );
  }

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => "");
    return NextResponse.json(
      {
        error: `Liara AI returned ${upstream.status}.`,
        detail: detail.slice(0, 500),
      },
      { status: upstream.status >= 500 ? 502 : upstream.status },
    );
  }

  let json: unknown;
  try {
    json = await upstream.json();
  } catch {
    return NextResponse.json(
      { error: "Liara AI returned a non-JSON response." },
      { status: 502 },
    );
  }

  // Extract the assistant message content from OpenAI-compatible shape.
  const content = extractContent(json);
  if (!content) {
    return NextResponse.json(
      { error: "Could not find a message in Liara AI's response." },
      { status: 502 },
    );
  }

  const parsed = parseModelJson(content);
  if (!parsed) {
    return NextResponse.json(
      {
        error: "Model returned malformed JSON.",
        detail: content.slice(0, 400),
      },
      { status: 502 },
    );
  }

  const validated = NutritionSchema.safeParse(parsed);
  if (!validated.success) {
    return NextResponse.json(
      {
        error: "Model JSON failed schema validation.",
        detail: validated.error.issues.slice(0, 5),
      },
      { status: 502 },
    );
  }

  return NextResponse.json(validated.data);
}

function extractContent(json: unknown): string | null {
  if (typeof json !== "object" || json === null) return null;
  const choices = (json as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) return null;
  const msg = (choices[0] as { message?: unknown }).message;
  if (typeof msg !== "object" || msg === null) return null;
  const content = (msg as { content?: unknown }).content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    // Some providers return content parts.
    return content
      .map((p) =>
        typeof p === "object" && p !== null && typeof (p as { text?: unknown }).text === "string"
          ? (p as { text: string }).text
          : "",
      )
      .join("");
  }
  return null;
}

/** Strip ```json fences if the model included them; then JSON.parse. */
function parseModelJson(s: string): unknown {
  const trimmed = s.trim();
  // Try whole-string parse first.
  try {
    return JSON.parse(trimmed);
  } catch {
    /* fall through */
  }
  // Find first { ... last } and try that.
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch {
      /* noop */
    }
  }
  return null;
}
