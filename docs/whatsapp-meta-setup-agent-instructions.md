# TASK FOR BROWSER AGENT: Set up WhatsApp Cloud API for KRTECH.SPACE

## Handoff state (read this first)

The human has ALREADY completed Meta for Developers account registration
themselves — including accepting terms and any OTP/verification during
signup. That step is done and is NOT yours to repeat or check.

**Your job starts at Step 1 below (creating the App) and continues straight
through without pausing, EXCEPT for the two explicit stop conditions listed
in "When to stop and ask" below.** Do not ask the human to confirm
in-between steps that don't require their input — just proceed.

## Your role and context

You are operating a browser with a Facebook account already logged in, on
the Meta for Developers platform (developers.facebook.com), with a
developer account already registered. Your job is to create a Meta App,
attach the WhatsApp product to it, and extract 5 specific credentials that a
developer needs to connect a WhatsApp AI bot to their Next.js + Supabase
application.

**You are performing REAL actions on a REAL account.** This will create an
actual Meta App visible in this person's developer account. Do not use any
other Facebook account, do not touch existing apps unless told to, and do not
guess or fabricate any credential — every value you report back MUST be
copied verbatim from the Meta dashboard, never invented.

**Never paste, log, or send any of these credentials to any third-party
site, form, or chat other than reporting them back to the human at the end.**
Treat every token as a live secret capable of sending WhatsApp messages and
spending the account's API quota.

## When to stop and ask (only these two situations)

1. **App Secret reveal asks for the account password.** Do not enter it
   yourself — pause and ask the human to type it.
2. **Test-number verification sends a WhatsApp OTP** to a phone. Pause and
   ask the human to read you the code from that phone.

Anything else — including intermediate confirmation screens, "are you sure"
dialogs for actions you were already asked to do, or normal navigation —
just proceed through it yourself. Do not stop to narrate every click; only
report back at the final summary (Step 8) or at one of the two stop
conditions above.

## What you're building toward

The target app has this exact environment file structure (`.env.example`):

```
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_BUSINESS_ACCOUNT_ID=
WHATSAPP_VERIFY_TOKEN=
WHATSAPP_APP_SECRET=
```

Fill in the 1st, 2nd, 3rd, and 5th from the Meta dashboard; generate the 4th
yourself. At the end, present all 5 values clearly labeled.

## Step 1 — Create a new App

1. Go to `https://developers.facebook.com/apps/`. You should now see the
   apps dashboard (not the public landing page) since the account is
   already registered — if you still see a public landing/"Get Started"
   page, STOP and tell the human the account doesn't look registered yet.
2. Click **"Create App"**.
3. If asked "What do you want your app to do?" or for a use case, choose
   **"Other"** if prompted, then app type **"Business"**. (If instead the
   flow shows a use-case list first, select **"WhatsApp"** directly if
   offered — Meta's onboarding varies; take whichever path leads to
   WhatsApp being added.)
4. App name: `KRTECH Business Agent`.
5. Provide a contact email if asked (use the account's own email).
6. If asked to attach a Business Portfolio: if one already exists, use it;
   if none exists, choose to create one using the account's own name/email;
   do not invent a fictitious legal business name — if the form demands a
   legal business name or tax details you don't have, STOP and ask.
7. Submit / Create App.

## Step 2 — Add the WhatsApp product

1. On the app dashboard, find **"Add Products to Your App"** (or the left
   sidebar **"Add Product"**).
2. Find **WhatsApp** → click **"Set up"**.
3. This opens the WhatsApp **"API Setup"** page — your main source for
   credentials.

## Step 3 — Credential #1: Access Token

On the API Setup page, find the **Temporary access token** field (a long
string, often starting with `EAA...`). Copy it in full.
→ Label: **WHATSAPP_ACCESS_TOKEN**
(Note for your final report: this expires in 24h; a permanent token needs a
System User set up separately — mention this, don't attempt it.)

## Step 4 — Credential #2: Phone Number ID

Same page, near the **"From"** phone number dropdown, find **Phone number
ID** (numeric string). Copy it.
→ Label: **WHATSAPP_PHONE_NUMBER_ID**

## Step 5 — Credential #3: WhatsApp Business Account ID

Same page or WhatsApp → **Configuration**, find **WhatsApp Business Account
ID** (a different numeric string). Copy it.
→ Label: **WHATSAPP_BUSINESS_ACCOUNT_ID**

## Step 6 — Credential #5: App Secret

1. Left sidebar → **App Settings → Basic**.
2. Find **"App Secret"** → click **"Show"**.
3. **If this asks for the account password → STOP, this is stop condition
   #1. Ask the human to enter it.**
4. Copy the revealed value.
→ Label: **WHATSAPP_APP_SECRET**

## Step 7 — Credential #4: Verify Token (you generate this)

Generate a random string yourself, e.g. `krtech_wh_` + 12 random
alphanumeric characters. No need to ask the human — just generate it and
remember it for Step 9.
→ Label: **WHATSAPP_VERIFY_TOKEN**

## Step 8 — Add a test recipient number

1. On the API Setup page: **"To"** → **"Manage phone number list"** → add
   the number(s) that should be able to test the bot, international format
   (e.g. +91XXXXXXXXXX). If you don't know which number to use, ask the
   human for it before proceeding (this is a normal input request, not one
   of the two stop conditions — just ask inline and continue once you have
   the number).
2. Meta sends a WhatsApp OTP to that number.
   **This is stop condition #2 → ask the human to read you the code.**
3. Enter the code to complete verification.

## Step 9 — Final report

Present this exact summary:

```
WHATSAPP_ACCESS_TOKEN=<value>          (⚠ temporary, expires in 24h)
WHATSAPP_PHONE_NUMBER_ID=<value>
WHATSAPP_BUSINESS_ACCOUNT_ID=<value>
WHATSAPP_VERIFY_TOKEN=<value you generated>
WHATSAPP_APP_SECRET=<value>
```

Then state clearly:
- Test number(s) verified in Step 8 are the only ones that can currently
  message the bot.
- A permanent access token should replace the temporary one before
  production use (System User flow — separate task).
- Webhook configuration (Meta dashboard → WhatsApp → Configuration →
  Webhook) is NOT done yet and requires the app to be deployed to a public
  HTTPS URL first — that's a separate follow-up step, not part of this task.

## If something unexpected appears

If you hit a business-verification requirement, a billing/payment prompt,
or any request for sensitive personal/business documents (tax ID, ID
scans, legal address) that wasn't anticipated above — stop and describe
exactly what you see. Do not guess your way through identity or
business-verification flows.
