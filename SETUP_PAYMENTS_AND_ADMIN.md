# Payments, Staff Uploads & the AI Tutor — Setup Guide

Read this before going live. It covers three things: what was already built into this
project, the two small bugs I fixed, and the accounts/keys you still need to plug in.

## 1. The AI tutor does not need "training"

`src/lib/subject-agents.ts` and `src/routes/api/chat.ts` show how it works: every message
is sent to a chat model through an OpenAI-compatible AI gateway (`src/lib/ai-gateway.server.ts`,
configurable to point at OpenAI, OpenRouter, or any other OpenAI-compatible provider), along
with a "system prompt" that tells it how to behave for that subject (Math Tutor, Law Tutor,
etc.). That's a general-purpose model — nothing is fine-tuned on your content, which is why
it already "knew stuff" when you tested it.

What *is* built, and does the job you actually want, is retrieval-augmented generation
(RAG): when staff upload a document and tick "ground the AI tutor in this document," the
file's text is extracted, split into chunks, and stored in `document_chunks`
(`src/routes/api/admin/ingest.ts`). When a student asks a question about that resource,
`src/routes/api/chat.ts` pulls the most relevant chunks (`match_document_chunks` in the
migration) and feeds them to the model as context before it answers. So the more you
upload, the better-grounded the tutor gets — no training step required.

## 2. Bugs I fixed

- **`upgrade.tsx` referenced an undeclared `PayPalNamespace` type**, which failed
  `tsc --noEmit` and would have failed your production build. Added
  `src/types/paypal.d.ts` with a minimal ambient type for the PayPal JS SDK. Verified
  `npx tsc --noEmit` and `npm run build` both pass now.
- **The staff upload console and upgrade page had no link anywhere in the UI.**
  `/admin/upload` and `/upgrade` existed as routes but nothing pointed to them.
  Added an "Upgrade" link (visible to everyone) and a "Staff Upload" link (visible only
  to admins) to `src/components/site-nav.tsx`.
- Changed the homepage footer from "A Nesma Holdings (Pty) Ltd product" to
  "Owned and operated by Nesma Holdings (Pty) Ltd."

## 3. What was already built (I didn't build these — just verifying they're real and wired up)

- **Payments**: `src/routes/upgrade.tsx` renders the PayPal JS SDK with
  `vault=true&intent=subscription`, which shows *both* a PayPal button and a
  "Debit or Credit Card" button in the same checkout — so you get card payments without
  needing a separate processor like Stripe. `src/routes/api/payments/paypal-subscribe.ts`
  verifies the subscription server-side and flips `profiles.is_premium` to true.
  `src/routes/api/payments/paypal-webhook.ts` handles renewals, cancellations and refunds
  so access stays accurate even if the user never comes back to the site.
- **Staff upload console**: `/admin/upload`, gated by the `admin` role in `user_roles`.
  Staff pick academic level, curriculum, subject, doc type and year, upload the file to
  Supabase Storage, and it appears in The Vault immediately.

## 4. What you still need to do

### A. Environment variables
Your exported `.env` only has Supabase keys. Add these (locally in `.env`, and in
whatever host runs this in production):

```
AI_GATEWAY_API_KEY=...            # required for the tutor to respond at all
AI_GATEWAY_BASE_URL=...           # optional, defaults to https://api.openai.com/v1
AI_GATEWAY_MODEL=...              # optional, defaults to gpt-4o-mini
SUPABASE_SERVICE_ROLE_KEY=...     # from Supabase project settings -> API
PAYPAL_ENV=sandbox                # "sandbox" while testing, "live" when ready
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_WEBHOOK_ID=...
VITE_PAYPAL_CLIENT_ID=...         # same value as PAYPAL_CLIENT_ID, exposed to the browser
VITE_PAYPAL_PLAN_ID=...
```

### B. Deploying to Netlify
This project is configured to deploy on Netlify out of the box (`vite.config.ts` uses
`@netlify/vite-plugin-tanstack-start`, and `netlify.toml` sets the build command).

1. Push this repo to GitHub.
2. In Netlify: **Add new project → Import an existing project** → pick the GitHub repo.
   Netlify will detect the build settings from `netlify.toml` automatically
   (`npm run build`, publish `dist/public`) — you shouldn't need to change anything.
3. Before the first deploy, go to **Site configuration → Environment variables** and add
   every variable listed above (Supabase, AI gateway, PayPal). Do this in the Netlify
   dashboard, never commit them to the repo.
4. Trigger a deploy. SSR pages, `/api/*` routes and server functions all run as Netlify
   Functions automatically — there's nothing extra to configure for that.
5. **Custom domain**: Site configuration → Domain management → Add a domain. Netlify
   gives you either an apex/A-record setup or a CNAME, depending on whether you're using
   the domain's root (`nesainova.com`) or a subdomain (`app.nesainova.com`). Add that
   record with your domain registrar; Netlify provisions HTTPS automatically once DNS
   propagates (usually under an hour).
6. Every push to your main branch redeploys automatically after this; pull requests get
   their own preview URL for testing changes before they go live.

### C. PayPal setup (~15 minutes)
1. Go to [developer.paypal.com](https://developer.paypal.com/dashboard/) and log in with
   your PayPal business account (create one if you don't have it yet — it's free).
2. **Apps & Credentials** → create an app → copy the **Client ID** and **Secret** into
   `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET`. Do this once in Sandbox to test, and again
   in Live when you're ready to accept real money.
3. **Create a subscription plan**: under your account, create a Product
   ("NesAI Nova Premium") and a Plan on it (monthly billing, your price). The dashboard
   has a "Subscriptions" section for this, or it can be done via the
   `/v1/billing/plans` API. Copy the resulting Plan ID into `VITE_PAYPAL_PLAN_ID`.
4. **Set up the webhook**: in the same app, add a webhook pointing to
   `https://yourdomain.com/api/payments/paypal-webhook`, subscribed at minimum to:
   `BILLING.SUBSCRIPTION.ACTIVATED`, `BILLING.SUBSCRIPTION.CANCELLED`,
   `BILLING.SUBSCRIPTION.EXPIRED`, `BILLING.SUBSCRIPTION.SUSPENDED`,
   `PAYMENT.SALE.COMPLETED`, `PAYMENT.SALE.REFUNDED`. Copy the Webhook ID into
   `PAYPAL_WEBHOOK_ID`.
5. Test end-to-end in Sandbox with a PayPal sandbox buyer account before switching
   `PAYPAL_ENV` to `live` and swapping in your live credentials.

Note on credit cards: PayPal's hosted checkout (the setup above) already lets a customer
pay by debit/credit card without a PayPal account — no Stripe account needed. If you'd
specifically like a Stripe-branded card form instead later, that's a separate, larger
integration — say the word and I'll scope it out.

### D. Making yourself (or an employee) an admin
There's no self-serve "make me admin" button by design — anyone could tick it otherwise.
In the Supabase SQL editor for this project, run (with the person's real user UUID from
**Authentication → Users**):

```sql
insert into public.user_roles (user_id, role)
values ('<their-user-uuid>', 'admin');
```

Once that row exists, "Staff Upload" appears in their nav automatically.

## 5. Suggested next test pass
1. Fill in the env vars above (sandbox PayPal is fine to start).
2. Sign in, go to **Upgrade**, subscribe with a PayPal sandbox account and separately
   with a sandbox card, confirm `profiles.is_premium` flips to `true` both ways.
3. Make yourself admin via the SQL above, go to **Staff Upload**, upload a past paper
   with "ground the AI tutor" checked, then ask the tutor a question about it from The
   Vault and confirm the answer cites the actual document.
