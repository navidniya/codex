# Cal AI Clone

A photo-first calorie tracker. Snap a meal, Claude estimates calories and macros, and a daily ring dashboard tracks you against personalized targets.

## Stack

- **Next.js 15** (App Router, React 19) + TypeScript
- **Tailwind CSS 4** for the UI
- **Claude Opus 4.7** with vision + structured outputs for the food analysis
- **localStorage** for state — no database

## How it works

1. **Onboarding** — sex, age, height, weight, activity level, and goal feed a Mifflin-St Jeor BMR → TDEE calculation. Targets are split 30/40/30 protein/carbs/fat.
2. **Snap** — the user takes a photo. The browser compresses it to ≤1280px JPEG and POSTs base64 to `/api/analyze`.
3. **Analyze** — the route calls `client.messages.parse()` against `claude-opus-4-7` with a Zod schema describing `{name, servingDescription, calories, proteinG, carbsG, fatG, confidence, notes}`. The system prompt is marked `cache_control: ephemeral` so future expansions cache for free.
4. **Review** — the user can tweak any field before saving. Saved meals land in localStorage and roll up into the daily rings.

## Setup

```bash
cp .env.example .env.local
# add your ANTHROPIC_API_KEY

npm install
npm run dev
```

Then open http://localhost:3000.

## Project layout

```
app/
  api/analyze/route.ts   # Claude vision endpoint
  layout.tsx
  page.tsx               # routes between Onboarding and Dashboard
  globals.css
components/
  Onboarding.tsx
  Dashboard.tsx
  Rings.tsx              # SVG progress rings
  FoodLog.tsx
  AddFoodModal.tsx       # camera capture + review flow
lib/
  types.ts
  nutrition.ts           # BMR/TDEE math
  storage.ts             # localStorage wrapper
```

## Notes

- All state is local to the browser — clearing site data resets everything.
- The API route runs on Node (not Edge) because the Anthropic SDK uses Node streams.
- The system prompt is small (<1k tokens) so caching is a no-op today, but the marker is in place for when you grow it.
