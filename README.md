# Tickwise

Tickwise is an AI-powered market intelligence workspace for investment desks. It monitors the companies you follow, reads updates from their newsrooms and press pages, and turns a firehose of headlines into a short, prioritized brief.

Every item is scored by materiality — **material**, **potentially material**, or **noteworthy** — and shipped with a short investor-grade take on what it means for estimates, margins, and valuation. Noise (webinars, sponsored posts, recycled PR) is filtered out before it reaches the inbox.

## How it works

1. **Add sources.** Point Tickwise at the newsrooms and pages that matter, each tied to a ticker.
2. **Triage the noise.** An agent reads every update, scores materiality, and drops the fluff. Teams set exclude terms, domains, and a minimum materiality bar.
3. **Get the brief.** A prioritized digest is emailed on the schedule the desk picks.

Workspaces are shared: invite analysts and keep the whole team reading from the same curated feed. Platform admins manage organizations separately from a member workspace.

## Stack

- React 18, TypeScript, Vite
- Tailwind CSS
- React Router
- Supabase (auth and data)

## Local development

```bash
npm install
cp .env.example .env.local
```

Fill `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local` (local Supabase or a hosted project).

```bash
npm run dev      # local env (.env.local)
npm run prod     # production env (.env)
npm run build    # typecheck + production build
npm run preview  # serve the production build
```
