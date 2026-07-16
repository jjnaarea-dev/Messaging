# 📨 Blast Messenger

A personal messaging app: add contacts, organize them into groups, write **one message**, and it gets sent as an **individual SMS to each person** via Twilio. Recipients never see each other, there's no group thread, and replies come back one-on-one.

> **About blue bubbles:** messages arrive as regular SMS (green bubbles on iPhone). Blue bubbles are iMessage, which only Apple can send between Apple devices — no third-party app can do that.

## Stack

- **Frontend:** Vite + React + TypeScript + Tailwind (the same stack Lovable uses)
- **Backend:** Supabase (Postgres + Auth + Edge Functions)
- **SMS delivery:** Twilio, called from the `send-message` edge function

## Features

- 🔐 Email/password sign-in (your data is private to your account)
- 👤 **Contacts** — add people with name + phone number (US numbers auto-normalize to +1)
- 👥 **Groups** — create groups and check off which contacts belong
- ✍️ **Compose** — pick a group (one tap selects all its members) and/or individual people, write one message, send. Each person gets their own individual SMS.
- 🕓 **History** — every send is logged with per-recipient delivery status and errors

## Setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Run the SQL in `supabase/migrations/20260716000000_init.sql` (SQL Editor → paste → run).
3. Deploy the edge function:
   ```sh
   supabase functions deploy send-message
   ```

### 2. Twilio

1. Create an account at [twilio.com](https://twilio.com) and buy a phone number with SMS capability (~$1.15/month; each US SMS is ~$0.008).
2. **US recipients:** register the number for A2P 10DLC (Twilio Console → Messaging → Regulatory Compliance), or use a verified toll-free number — unregistered numbers get carrier-filtered.
3. Set the secrets on your Supabase project:
   ```sh
   supabase secrets set TWILIO_ACCOUNT_SID=ACxxxx TWILIO_AUTH_TOKEN=xxxx TWILIO_FROM_NUMBER=+15551234567
   ```

### 3. Frontend

```sh
cp .env.example .env   # fill in your Supabase URL + anon key
npm install
npm run dev
```

## Using this with Lovable

Two options:

**Option A — import this repo:** connect Lovable to GitHub and import `jjnaarea-dev/Messaging`. Lovable can then restyle/extend it with prompts.

**Option B — rebuild from a prompt:** paste this into Lovable:

> Build a messaging app with Supabase. I can add contacts (name + phone number) and organize them into groups. There's a compose screen where I select a group or individual contacts, write one message, and send. Sending calls a Supabase Edge Function that loops through the selected recipients and sends each one an individual SMS via the Twilio API (using TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER stored as Supabase secrets). Recipients must never see each other — no group threads. Log each sent message with recipient and per-person delivery status, and show a history screen of sent messages. Include email/password auth with row-level security so each user only sees their own data.

## Good to know

- Twilio credentials live **only** in the edge function's secrets — never in the frontend.
- Carriers block numbers that blast identical messages at high volume. This is fine for personal use (invites, family updates, small teams); marketing use requires recipient opt-in.
- Message cost scales per recipient: 1 message to 20 people = 20 SMS.
