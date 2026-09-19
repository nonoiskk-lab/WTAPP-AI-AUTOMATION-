# TASK FOR BROWSER AGENT: Set up WhatsApp Cloud API for KRTECH.SPACE

## Your role and context

You are operating a browser with a Facebook account already logged in, on the
Meta for Developers platform (developers.facebook.com). Your job is to create
a Meta App, attach the WhatsApp product to it, and extract 5 specific
credentials that a developer needs to connect a WhatsApp AI bot to their
Next.js + Supabase application.

**You are performing REAL actions on a REAL account.** This will create an
actual Meta App visible in this person's developer account. Do not use any
other Facebook account, do not touch existing apps unless told to, and do not
guess or fabricate any credential — every value you report back MUST be
copied verbatim from the Meta dashboard, never invented.

**Never paste, log, or send any of these credentials to any third-party site,
form, or chat other than reporting them back to the user in this session.**
Treat every token as a live secret capable of sending WhatsApp messages and
spending the account's API quota.

## What you're building toward

The target app has this exact environment file structure (`.env.example`):

```
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_BUSINESS_ACCOUNT_ID=
WHATSAPP_VERIFY_TOKEN=
WHATSAPP_APP_SECRET=
```

Your job is to fill in the first, second, third, and fifth of these from the
Meta dashboard, and to generate the fourth yourself. At the end, present all
5 values clearly labeled so the user can paste them into their `.env` file.

## Step-by-step

### Step 1 — Go to Meta for Developers
Navigate to `https://developers.facebook.com/apps/`. Confirm you see a
dashboard of the logged-in user's apps (or an empty state if they have none).
Take a screenshot / describe what you see before proceeding, so the user can
confirm you're on the right account.

### Step 2 — Create a new App
1. Click **"Create App"**.
2. When asked "What do you want your app to do?" or for a use case, choose
   the option for **"Other"** if prompted, then app type **"Business"**.
   (If the flow instead asks for a use case list first, look for and select
   **"WhatsApp"** as the use case directly — Meta's onboarding flow changes
   periodically; pick whichever path leads to WhatsApp being added.)
3. App name: enter `KRTECH Business Agent` (or ask the user if they want a
   different name before submitting).
4. Provide a contact email if asked (use the account's own email).
5. Attach it to a Business Portfolio if prompted — if the user has no
   Business Portfolio yet, choose the option to create one, or select
   "skip"/"none" if that's offered. If this step blocks you and requires
   information you don't have (like a legal business name), STOP and ask
   the user rather than inventing details.
6. Submit / Create App.

### Step 3 — Add the WhatsApp product
1. On the new app's dashboard, find the **"Add Products to Your App"**
   section (or the left sidebar "Add Product").
2. Find **WhatsApp** and click **"Set up"**.
3. This lands you on the WhatsApp **"API Setup"** (aka "Getting Started")
   page — this is the main page you'll extract credentials from.

### Step 4 — Extract credential #1: Access Token
On the API Setup page, there is a section showing a **Temporary access
token** (a long string, often starting with `EAA...`).
- Click to reveal/copy it.
- Label this value **WHATSAPP_ACCESS_TOKEN** when reporting back.
- **Important caveat to tell the user:** this temporary token expires in
  24 hours. Mention explicitly in your final report that for anything beyond
  quick testing, they need a **permanent token**, generated via:
  Business Settings → System Users → create a system user → generate token
  with `whatsapp_business_messaging` and `whatsapp_business_management`
  permissions. Do NOT attempt this system-user flow yourself unless the user
  explicitly asks you to — it involves business-level permissions and is
  easy to misconfigure. Flag it as a follow-up step instead.

### Step 5 — Extract credential #2: Phone Number ID
Same API Setup page has a **"From"** phone number dropdown/field — this is
Meta's provided test number. Underneath or next to it there's a
**Phone number ID** (a numeric string).
- Copy it exactly.
- Label this value **WHATSAPP_PHONE_NUMBER_ID**.

### Step 6 — Extract credential #3: WhatsApp Business Account ID
On the same page (or under WhatsApp → **Configuration** in the left sidebar),
find **WhatsApp Business Account ID** (also a numeric string, different from
the phone number ID).
- Copy it exactly.
- Label this value **WHATSAPP_BUSINESS_ACCOUNT_ID**.

### Step 7 — Extract credential #5: App Secret
1. Go to the left sidebar → **App Settings → Basic**.
2. Find the **"App Secret"** field. It's hidden by default — click
   **"Show"**. Meta may require re-entering the Facebook account password to
   reveal it. If a password prompt appears, STOP and ask the user to enter
   it themselves rather than you handling their password.
3. Copy the revealed value.
4. Label this value **WHATSAPP_APP_SECRET**.

### Step 8 — Generate credential #4: Verify Token
This one is NOT in the Meta dashboard — you generate it yourself.
- Create a random alphanumeric string, e.g. `krtech_wh_` followed by 12
  random alphanumeric characters (you can generate this yourself, it doesn't
  need to be cryptographically special, just hard to guess).
- Label this value **WHATSAPP_VERIFY_TOKEN**.
- Remember this exact value — you'll need to paste the SAME string into the
  Meta webhook configuration in a later step (Step 10), once the app is
  deployed.

### Step 9 — Add a test recipient number
WhatsApp Cloud API test mode only allows sending to pre-verified numbers.
1. On the API Setup page, find **"To"** → **"Manage phone number list"**.
2. Add the phone number(s) that should be able to test the bot (e.g. the
   business owner's personal WhatsApp number), in international format
   (e.g. +91XXXXXXXXXX).
3. Meta will send an OTP/verification code to that WhatsApp number — the
   user will need to read that code off their own phone and provide it to
   you (or enter it themselves). Do not proceed without this human step.

### Step 10 — Webhook configuration (DO THIS LAST, AFTER DEPLOYMENT)
This step requires a **public HTTPS URL** for the app's webhook endpoint,
which only exists after the developer deploys the Next.js app (e.g. to
Vercel). **If the app isn't deployed yet, stop here and report the 5
credentials collected so far — do not attempt this step with a placeholder
URL.**

Once you have a real deployed URL (it will look like
`https://<something>.vercel.app`):
1. Go to WhatsApp → **Configuration** in the left sidebar.
2. Under **Webhook**, click **Edit**.
3. Callback URL: `https://<their-domain>/api/webhooks/whatsapp`
4. Verify token: paste the EXACT same string you generated in Step 8.
5. Click **Verify and Save**. If it fails, the most common causes are: the
   app isn't actually deployed/reachable yet, or the verify token doesn't
   match exactly what's set in the app's environment variable
   `WHATSAPP_VERIFY_TOKEN` — check both.
6. After saving, find the **"Webhook fields"** list and click **Subscribe**
   next to **`messages`**. This is required — without it, no incoming
   WhatsApp messages will ever reach the app.

### Step 11 — Final report
Present a clean summary back to the user in this exact format:

```
WHATSAPP_ACCESS_TOKEN=<value>          (⚠ temporary, expires in 24h)
WHATSAPP_PHONE_NUMBER_ID=<value>
WHATSAPP_BUSINESS_ACCOUNT_ID=<value>
WHATSAPP_VERIFY_TOKEN=<value you generated>
WHATSAPP_APP_SECRET=<value>
```

Then explicitly state:
- Whether Step 10 (webhook) was completed or skipped (and why, if skipped).
- That the test number(s) added in Step 9 are the only numbers that can
  currently message the bot.
- The reminder that the access token is temporary and a permanent one should
  be generated before going to production.

## If you get stuck

If any step presents a screen you don't recognize, a business-verification
requirement, a payment/billing prompt, or anything that asks for sensitive
personal/business information (tax ID, legal address, ID documents) — STOP
and describe exactly what you see to the user. Do not guess your way through
identity or business-verification flows.
