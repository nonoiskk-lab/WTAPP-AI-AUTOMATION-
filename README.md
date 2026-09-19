# KRTECH.SPACE — WhatsApp AI Sales + Support + CRM + Automation Agent

A production-oriented Next.js + Supabase platform that turns WhatsApp conversations into
qualified, tracked business opportunities for KRTECH.SPACE — with an AI agent, CRM, lead
scoring, human handoff, follow-up automation, and an admin dashboard.

This README is written to be honest about what is **wired up and real** vs. what is
**scaffolded and needs your credentials/config** before it can be called production-ready.
See [Production readiness](#production-readiness) at the bottom before you tell anyone this
is "done."

## Architecture

```
WhatsApp Cloud API
   │  (webhook)
   ▼
src/app/api/webhooks/whatsapp/route.ts   ── GET verify, POST process (idempotent)
   │
   ├─ lib/crm/customers.ts        find-or-create customer + conversation (phone = identity)
   ├─ lib/ai/intent.ts            deterministic keyword-based intent detection
   ├─ lib/crm/signalExtraction.ts rule-based lead-scoring signal + profile field extraction
   ├─ lib/ai/knowledge.ts         retrieval: services/FAQs (keyword) + knowledge_chunks (vector)
   ├─ lib/ai/agent.ts             builds grounded prompt, calls the LLM, decides confidence
   ├─ lib/crm/handoffs.ts         escalation rules -> handoffs table + notification
   ├─ lib/crm/leadScoring.ts      lead_events -> recompute_lead_score() -> stage
   ├─ lib/crm/followups.ts        schedules + sends due follow-ups (opt-out aware)
   └─ lib/whatsapp/client.ts      sends the reply back via Graph API

Admin dashboard: src/app/(admin)/*  (Supabase Auth, RLS-protected reads/writes)
Database: supabase/migrations/*.sql (run these against your Supabase project)
```

## 1. Prerequisites

- Node.js 20.9+
- A Supabase project (free tier is fine to start)
- A Meta Developer account with a WhatsApp Business app
- An Anthropic or OpenAI API key

## 2. Set up Supabase

1. Create a project at https://supabase.com.
2. In the SQL editor, run the migrations **in order**:
   - `supabase/migrations/0001_init.sql`
   - `supabase/migrations/0002_rls.sql`
   - `supabase/migrations/0003_functions.sql`
   - `supabase/migrations/0004_seed.sql`
   (Or `supabase db push` if you have the Supabase CLI linked to the project.)
3. Copy **Project URL**, **anon public key**, and **service_role key** from
   Project Settings → API into `.env.local` (see `.env.example`).
4. Create your first admin login:
   - Supabase Dashboard → Authentication → Users → Add user (set an email + password).
   - Then in the SQL editor:
     ```sql
     insert into admins (id, full_name, email, role)
     values ('<the auth user's UUID>', 'Your Name', 'you@krtech.space', 'owner');
     ```
   Without a matching row in `admins`, RLS will block that user from reading any
   dashboard data even though they can log in.

## 3. Set up WhatsApp Cloud API

1. Meta for Developers → Create App → type "Business" → add the **WhatsApp** product.
2. From WhatsApp → API Setup, copy:
   - Temporary/permanent **access token** → `WHATSAPP_ACCESS_TOKEN`
   - **Phone number ID** → `WHATSAPP_PHONE_NUMBER_ID`
   - **WhatsApp Business Account ID** → `WHATSAPP_BUSINESS_ACCOUNT_ID`
3. App Settings → Basic → **App Secret** → `WHATSAPP_APP_SECRET` (used to verify webhook
   signatures — don't skip this in production).
4. Pick any string for `WHATSAPP_VERIFY_TOKEN` (e.g. a random 32-char string).
5. Deploy the app first (see below) so you have a public URL, then go to
   WhatsApp → Configuration → Webhook and set:
   - Callback URL: `https://<your-domain>/api/webhooks/whatsapp`
   - Verify token: the exact value of `WHATSAPP_VERIFY_TOKEN`
   - Subscribe to the `messages` field.
6. Send a test message from your own phone to the WhatsApp test number and confirm it
   appears in the `messages` table / Conversations page.

**Do not consider WhatsApp "connected" until you've completed step 6 and seen a real
message round-trip.** A configured token without a verified webhook is not integration.

## 4. Set up the AI provider

- `AI_PROVIDER=anthropic` (default) + `AI_API_KEY=<your Anthropic key>`, or
- `AI_PROVIDER=openai` + `AI_API_KEY=<your OpenAI key>`.
- Knowledge-base embeddings always call OpenAI's embeddings endpoint (Anthropic has no
  first-party embeddings API). If you're on `AI_PROVIDER=anthropic`, also set
  `EMBEDDING_API_KEY` to an OpenAI key, or the knowledge base will fall back to
  keyword-only retrieval (still functional, just less precise for large documents).

## 5. Run locally

```bash
npm install
cp .env.example .env.local   # fill in the values above
npm run dev
```

Visit `http://localhost:3000/login`. The webhook itself needs a public URL to receive
real WhatsApp traffic — use `ngrok http 3000` (or deploy) to test end-to-end locally.

## 6. Deploy

Designed for Vercel:

```bash
vercel deploy
```

Set every variable from `.env.example` in Vercel → Project → Settings → Environment
Variables. `vercel.json` already schedules `/api/cron/followups` every 15 minutes via
Vercel Cron (requires a paid Vercel plan for cron; on the free plan, trigger the same
endpoint from n8n/Make on a schedule instead — see comments in
`src/app/api/cron/followups/route.ts`).

## Anti-hallucination model

The AI never invents prices, features, timelines, or case studies (spec requirement).
Concretely:

- `services` and `faqs` tables are the only source of pricing/feature facts.
- `knowledge_documents` / `knowledge_chunks` hold anything else you paste in via
  the Knowledge Base admin page (PDF/DOC upload with automatic extraction is **not**
  implemented — see Known limitations).
- If a customer asks about pricing/quotes and nothing relevant is found in the
  knowledge base, the agent skips the LLM call entirely and returns the fixed
  fallback line ("team will confirm exact scope and pricing...") rather than
  letting the model guess.

## Known limitations (be upfront about these)

- **PDF/DOC upload extraction is not implemented.** The Knowledge Base page accepts
  pasted text only. Wiring up a PDF/DOCX parser (e.g. `pdf-parse`, `mammoth`) is the
  next step if file upload is required.
- **Structured profile extraction (business name, desired solution, etc.) is
  rule-based/regex, not LLM-based.** It reliably catches budget/timeline/urgency/
  known business-category keywords, but won't paraphrase a business name the way a
  human would. An LLM extraction pass that only writes fields it can quote verbatim
  evidence for is a reasonable next iteration.
- **`analytics_daily` is not auto-populated.** The Analytics page computes live
  counts directly instead; a nightly aggregation job (Supabase cron function or
  Vercel Cron) would need to be added to backfill that table for historical trend
  charts.
- **Meeting booking does not integrate with a real calendar.** `meetings` rows are
  created with `status = 'requested'`; confirming them (and syncing to Google
  Calendar/Calendly) is not implemented — the agent is instructed never to claim a
  meeting is booked, only that a request was recorded.
- **Message templates for WhatsApp's 24-hour-window rules are not enforced.**
  Outside the customer service window, WhatsApp requires pre-approved templates for
  outbound messages (including follow-ups). `message_templates.whatsapp_template_name`
  exists for this but the send path (`lib/whatsapp/client.ts`) only implements free-form
  text/interactive messages today — add a `sendTemplateMessage` function before relying
  on automated follow-ups outside the 24h window in production.

None of the above are faked — they're either not built, or built with a clearly
narrower scope than the full spec, and are called out here so nobody mistakes a
partial implementation for a finished one.

## Production readiness

Only check these off once you've actually verified them, not once the code exists:

- [ ] Supabase project created, all 4 migrations applied
- [ ] First admin created and can log in at `/login`
- [ ] `WHATSAPP_ACCESS_TOKEN` / `PHONE_NUMBER_ID` / `BUSINESS_ACCOUNT_ID` set
- [ ] Webhook URL verified in Meta dashboard (GET request succeeded)
- [ ] A real WhatsApp message sent and received in `/conversations`
- [ ] AI reply generated and delivered back to WhatsApp
- [ ] `WHATSAPP_APP_SECRET` set and signature verification confirmed (not skipped)
- [ ] At least one service's real pricing entered in Knowledge Base
- [ ] Lead scoring verified end-to-end (send a message with budget + timeline, see score change)
- [ ] Opt-out tested ("STOP") and confirmed `marketing_opt_out = true`
- [ ] Duplicate webhook delivery tested (resend same `wa_message_id`) — no duplicate reply
- [ ] Handoff tested (ask for a human) — row created in `handoffs`, notification created
- [ ] `CRON_SECRET` set and follow-up cron authenticated
- [ ] RLS confirmed: a non-admin Supabase user cannot read `customers`/`leads`
- [ ] Mobile responsiveness of the dashboard checked
- [ ] Production env vars set in Vercel (not just `.env.local`)

## Tech stack

Next.js 16 (App Router) · React 18 · TypeScript · Tailwind CSS · Supabase (Postgres,
Auth, pgvector) · WhatsApp Cloud API · Anthropic/OpenAI (configurable) · Vercel.

## A note on dependency versions

`npm audit` reports 0 vulnerabilities as of this build. Next.js was pinned to 16.3.5
(not 14, despite `AGENTS.md`/spec references to "Next.js") specifically because 14.x
and 15.x both had unpatched high/critical CVEs in the installed dependency tree at
build time — see the git history for the audit output. If you fork this and downgrade
Next.js, re-run `npm audit` first.
