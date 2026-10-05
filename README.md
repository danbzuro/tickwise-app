# Tickwise

Tickwise is an AI-powered market intelligence workspace for investment desks. It monitors the companies you follow, reads updates from their newsrooms and press pages, and turns a firehose of headlines into a short, prioritized brief.

Every item is scored by materiality — **material**, **potentially material**, or **noteworthy** — and shipped with a short investor-grade take on what it means for estimates, margins, and valuation. Noise (webinars, sponsored posts, recycled PR) is filtered out before it reaches the inbox.

## How it works

1. **Add sources.** Point Tickwise at the newsrooms and pages that matter, each tied to a ticker.
2. **Triage the noise.** An agent reads every update, scores materiality, and drops the fluff. Teams set exclude terms, domains, and a minimum materiality bar.
3. **Get the brief.** A prioritized digest is emailed on the schedule the desk picks.

Workspaces are shared: invite analysts and keep the whole team reading from the same curated feed. Platform admins manage organizations separately from a member workspace.

## Stack

- Next.js (App Router), React 18, TypeScript
- Tailwind CSS
- Supabase (auth, data, scrape Edge Function)

## Local development

```bash
npm install
cp .env.example .env.development
```

Fill `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `RESEND_API_KEY` in `.env.development` (local) or `.env` (production). The scrape Edge Function reads `RESEND_API_KEY` (and optional `RESEND_FROM`) from that env file locally (`npm run functions`) and from `supabase secrets set` in production. Other scrape keys (`PERPLEXITY_API_KEY`, `OPENAI_API_KEY`) stay in Supabase secrets.

```bash
npm run dev        # local env (.env.development)
npm run prod       # production env (.env)
npm run functions  # sirve el scrape en local
npm run build      # production build
npm run start      # serve the production build
```
