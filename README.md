# 🍼 Baby Bets — Production Setup Guide

A mobile-first web app for hosting baby birth pools with real prize payouts via Stripe.

---

## Tech Stack

| Layer      | Technology                        |
|------------|-----------------------------------|
| Frontend   | React 18 + Vite + Tailwind CSS    |
| Database   | Supabase (PostgreSQL + RLS)       |
| Auth       | Supabase Auth                     |
| Payments   | Stripe Connect (Express)          |
| Hosting    | Vercel / Netlify (recommended)    |

---

## Quick Start

```bash
# 1. Clone and install
npm install

# 2. Copy env file and fill in your keys
cp .env.example .env

# 3. Run locally
npm run dev
```

---

## Step 1: Supabase Setup

1. Go to [supabase.com](https://supabase.com) → New Project
2. Open **SQL Editor** and paste the entire contents of `supabase/schema.sql`
3. Run the query — this creates the `pools` and `bets` tables with RLS
4. Go to **Settings → API** and copy:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public key` → `VITE_SUPABASE_ANON_KEY`

---

## Step 2: Stripe Setup

### 2a. Create a Stripe Account
1. Go to [stripe.com](https://stripe.com) → create account
2. Get your **Publishable Key** → `VITE_STRIPE_PUBLISHABLE_KEY`
3. Get your **Secret Key** → used in Edge Functions (see below)

### 2b. Enable Stripe Connect (for automatic payouts to parents)
1. In Stripe Dashboard → **Connect → Get Started**
2. Choose **Express** accounts
3. Note your **Connect Client ID**

### 2c. Deploy Edge Functions
```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref your-project-ref

# Set secrets
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...

# Deploy functions
supabase functions deploy create-checkout
supabase functions deploy stripe-webhook
```

### 2d. Set Stripe Webhook
1. Stripe Dashboard → **Developers → Webhooks → Add endpoint**
2. URL: `https://your-project.supabase.co/functions/v1/stripe-webhook`
3. Events to listen for:
   - `checkout.session.completed`
   - `payment_intent.payment_failed`
4. Copy the **Signing Secret** → `STRIPE_WEBHOOK_SECRET`

---

## Step 3: Deploy Frontend

### Vercel (Recommended)
```bash
npm install -g vercel
vercel deploy
# Add env vars in Vercel dashboard
```

### Netlify
```bash
npm run build
# Drag /dist folder to app.netlify.com/drop
# Add env vars in Site Settings → Environment Variables
```

---

## Financial Logic Summary

| Item                    | Value                        |
|-------------------------|------------------------------|
| Platform fee            | 10% of gross pool            |
| Baby Fund               | 50% of net pool              |
| 1st Place Prize         | 25% of net pool              |
| 2nd Place Prize         | 16.66% of net pool           |
| 3rd Place Prize         | 8.33% of net pool            |
| Card processing fee     | ~2.9% + $0.30 (paid by guest)|
| Minimum bet price       | $2.00                        |
| Date price decay        | -10% of max per day away     |

### Example: $420 gross pool
- Platform fee (10%): $42.00
- Net pool: $378.00
- 👶 Baby Fund: $189.00
- 🥇 1st Place: $94.50
- 🥈 2nd Place: $62.97
- 🥉 3rd Place: $31.49 (+ $0.04 rounding = corrected to 1st)

---

## Winner Scoring Algorithm

Bets are scored with the following priority (lowest score wins):

1. **Day difference** (×10,000 weight)
2. **Hour difference** (×100 weight)
3. **Minute** — tie-breaker (×1 weight)
4. **Add-on bonuses** — correct sex or exact weight = small negative offset

---

## App Routes

| Route                  | Description                          |
|------------------------|--------------------------------------|
| `/`                    | Landing page                         |
| `/setup`               | Parent pool creation (4 steps)       |
| `/pool/:slug/host`     | Host dashboard (overview/bets/results)|
| `/bet/:slug`           | Guest bet builder (5 steps)          |

---

## Privacy & RLS Notes

- **Phone and email** are never exposed to non-owners via the public API
- The `public_bets` view strips PII — use this for the live pot display
- Pool owners see full bet details only after Supabase Auth verification
- Supabase RLS policies enforce access at the database level

---

## Customization Notes

- **Change fee rates:** Edit `PLATFORM_FEE_RATE`, `STRIPE_RATE`, `STRIPE_FIXED` in `src/lib/finance.js`
- **Change payout split:** Edit `SPLIT` object in `src/lib/finance.js`
- **Add more add-ons:** Extend the `pools` table, the setup form, and bet builder
- **Custom branding:** Update colors in `tailwind.config.js`
