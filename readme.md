# Cal AI Clone

A photo-first calorie tracker. Snap a meal, Claude estimates calories and macros, and a daily ring dashboard tracks you against personalized targets.

## Try it on your phone

Pick whichever is convenient — all three give you a URL openable on iOS Safari.

### A · GitHub Codespaces (zero local setup)

1. On the branch page, click **Code → Codespaces → Create codespace on this branch**.
2. In the Codespace terminal: `DEMO_MODE=1 npm install && npm run dev` (omit `DEMO_MODE` and add `ANTHROPIC_API_KEY` as a Codespace secret if you want real Claude analysis).
3. When VS Code prompts to forward port `3000`, choose **Open in Browser** and set the port visibility to **Public**. Use that `*.app.github.dev` URL on your phone.

### B · Vercel from your laptop

```bash
git clone https://github.com/navidniya/codex
cd codex
git checkout claude/cal-ai-clone-X4TuU
npx vercel deploy --prod
```

When Vercel prompts for env vars, set either `ANTHROPIC_API_KEY` (for real analysis) or `DEMO_MODE=1` (canned data). You get a `*.vercel.app` URL.

> A "Deploy with Vercel" button isn't included on purpose — Vercel's clone flow ignores branch paths and would deploy the empty `main` instead.

### C · LAN from your laptop

```bash
DEMO_MODE=1 npm install && npm run dev
```

Find your laptop's LAN IP (`ipconfig getifaddr en0` on macOS, `hostname -I` on Linux), then on the phone (same Wi-Fi) open `http://<that-ip>:3000`.

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

### Demo without an API key

To click through the entire flow without calling Claude, run with
`DEMO_MODE=1`. The `/api/analyze` route will return canned nutrition
instead of hitting the API:

```bash
DEMO_MODE=1 npm run dev
```

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
