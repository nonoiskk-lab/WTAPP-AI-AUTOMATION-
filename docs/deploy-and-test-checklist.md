# Deploy + End-to-End Test Checklist

Status as of this doc: Meta App, WhatsApp product, test number, and all 5
WhatsApp credentials are ready (kept out of chat/commits — Krishna holds
them). This checklist covers everything else needed before the bot can
actually reply on WhatsApp: a live Supabase project, a deployed public URL,
and the webhook wired up on Meta's side.

## Part 1 — Supabase (do this first; the app can't run without it)

1. Create a project at supabase.com (any region close to your users).
2. Open the SQL editor and run these 4 files **in order** (copy-paste each,
   run, confirm no errors, then move to the next):
   - `supabase/migrations/0001_init.sql`
   - `supabase/migrations/0002_rls.sql`
   - `supabase/migrations/0003_functions.sql`
   - `supabase/migrations/0004_seed.sql`
3. Project Settings → API → copy:
   - **Project URL** → this becomes `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (never expose this
     client-side; it's server-only in this app by design)
4. Create the first admin login:
   - Authentication → Users → Add user → set an email + password.
   - SQL editor:
     ```sql
     insert into admins (id, full_name, email, role)
     values ('<paste the new user''s UUID from the Users table>', 'Krishna', 'krishna@example.com', 'owner');
     ```
   Without this row, that login can authenticate but RLS will block it from
   seeing any dashboard data.

## Part 2 — Deploy to Vercel

1. Push this repo to GitHub if not already (it is — `main` branch already
   has the code).
2. In Vercel: **Add New Project** → import the GitHub repo → Framework
   preset should auto-detect Next.js.
3. **Before the first deploy**, add every environment variable below in
   Vercel → Project Settings → Environment Variables (apply to Production,
   Preview, and Development):

| Variable | Value source |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Part 1 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Part 1 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Part 1 |
| `WHATSAPP_ACCESS_TOKEN` | Meta App Setup (temporary — 24h) |
| `WHATSAPP_PHONE_NUMBER_ID` | `1322744290922334` |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | `1623785009302981` |
| `WHATSAPP_VERIFY_TOKEN` | the string generated during Meta setup |
| `WHATSAPP_APP_SECRET` | Meta App Settings → Basic |
| `AI_PROVIDER` | `anthropic` (or `openai`) |
| `AI_MODEL` | `claude-sonnet-5` (or your chosen model) |
| `AI_API_KEY` | your Anthropic or OpenAI key — **the bot cannot generate any reply without this** |
| `EMBEDDING_API_KEY` | an OpenAI key, only if `AI_PROVIDER=anthropic` and you want knowledge-base search to use embeddings (optional — keyword search still works without it) |
| `NEXT_PUBLIC_APP_URL` | fill in *after* first deploy, once you know the real `https://....vercel.app` URL, then redeploy |
| `CRON_SECRET` | any random string — protects `/api/cron/followups` |

4. Deploy. Note the resulting URL, e.g. `https://krtech-agent.vercel.app`.
5. Go back and set `NEXT_PUBLIC_APP_URL` to that exact URL, then redeploy
   (Vercel → Deployments → ⋯ → Redeploy) so it takes effect.
6. **Note on cron:** `vercel.json` schedules `/api/cron/followups` every 15
   minutes via Vercel Cron, which requires a paid Vercel plan. On the free
   plan, that file is simply ignored — follow-ups won't auto-send until you
   either upgrade or trigger that same endpoint from an external scheduler
   (e.g. an n8n/Make scenario hitting it every 15 min with header
   `Authorization: Bearer <CRON_SECRET>`). This does not block WhatsApp
   messaging/replies — only the automated follow-up nudges.

## Part 3 — Connect the webhook on Meta's side (human step, post-deploy)

Do this only after Part 2 gives you a real, working `https://...vercel.app`
URL — Meta will reject `localhost` or unreachable URLs.

1. Meta for Developers → your app (**KRTECH Business Agent**, App ID
   `1603512751418056`) → WhatsApp → **Configuration**.
2. Webhook → **Edit**:
   - Callback URL: `https://<your-vercel-domain>/api/webhooks/whatsapp`
   - Verify token: the exact `WHATSAPP_VERIFY_TOKEN` value you put in Vercel
3. Click **Verify and Save**. If it fails: double check the deploy actually
   succeeded (visit the URL in a browser first) and that the verify token
   matches character-for-character on both sides.
4. Under **Webhook fields**, click **Subscribe** next to **`messages`**.
   Without this, no incoming message will ever reach the app, even if
   verification succeeded.
5. (Later, not urgent) Generate a **permanent access token**: Meta Business
   Settings → System Users → create one → assign it to this app → generate
   a token with `whatsapp_business_messaging` + `whatsapp_business_management`
   permissions → replace `WHATSAPP_ACCESS_TOKEN` in Vercel with it. The
   current token is temporary and expires in 24h; sends will start failing
   with a clearly logged "error 190" message in Vercel logs when it does
   (see `src/lib/whatsapp/client.ts`).

## Part 4 — End-to-end test plan

**Prerequisite check before testing:** all of Parts 1–3 must be complete —
Supabase migrated, app deployed with all env vars set (including
`AI_API_KEY` — without it the bot will store the incoming message but throw
an error trying to generate a reply, visible in Vercel function logs), and
the Meta webhook verified + subscribed to `messages`.

### Test 1 — Basic round trip
1. From the verified test recipient **+91 98352 66017**, send `hi` on
   WhatsApp to the Meta test number **+1 (555) 148-3699**.
   (This also opens the 24-hour customer service window, so the bot's
   free-form reply is allowed without a pre-approved template.)
2. Within a few seconds, check:
   - **Vercel → your project → Logs** — look for `[webhook]` log lines, no
     unexpected errors.
   - **Supabase → Table Editor → `messages`** — a new `inbound` row with
     your message text.
   - **Supabase → `conversations`** — a new/updated row.
   - Your WhatsApp — an actual reply from the bot.
3. Log into the admin dashboard (`https://<your-domain>/login`) → open
   `/conversations` → confirm the thread appears with the exchange.

### Test 2 — Opt-out
Send `stop` from the same number. Expect: one confirmation reply, then
check Supabase `customers.marketing_opt_out` is `true` for that row, and
`opt_outs` has a matching entry.

### Test 3 — Duplicate delivery (idempotency)
Meta occasionally redelivers the same webhook event. You can't easily force
this manually, but if you ever see the same message answered twice, that's
a real bug to report — the `wa_message_id` unique constraint and pre-insert
check in `processInboundMessage` are specifically there to prevent it.

### Test 4 — Token expiry (informational, not urgent)
24 hours after the temporary token was issued, sends will start failing.
Vercel logs will show a distinct `[whatsapp] Access token expired or
invalid (error 190...)` line rather than a generic failure — that's the
signal to generate the permanent System User token (Part 3, step 5).

## Status table

| Item | Status |
|---|---|
| Meta App + WhatsApp product + test number | ✅ Done |
| 5 WhatsApp credentials obtained | ✅ Done (held by Krishna, not in repo/chat) |
| `.env.example` documents all 5 vars | ✅ Done |
| Webhook GET verification | ✅ Done |
| Webhook POST signature verification (HMAC-SHA256, timing-safe, raw body) | ✅ Done |
| Webhook dedupe by `wa_message_id` | ✅ Done |
| Webhook responds fast, processes in background (`after()`) | ✅ Done (fixed in this update) |
| Send helper on Graph API v25.0 | ✅ Done (bumped in this update) |
| Send helper detects expired token (error 190) with a clear log | ✅ Done |
| Supabase project created + migrated | ❌ Pending (Part 1) |
| App deployed to Vercel with env vars set | ❌ Pending (Part 2) |
| Meta webhook Callback URL + verify token configured | ❌ Pending (Part 3, human step) |
| `messages` field subscribed | ❌ Pending (Part 3, human step) |
| Permanent System User access token | ❌ Pending (Part 3, step 5 — do after first successful test) |
| End-to-end WhatsApp message tested | ❌ Pending (Part 4) |
