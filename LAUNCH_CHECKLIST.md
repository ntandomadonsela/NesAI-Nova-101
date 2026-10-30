# NesAI — Vercel Launch Checklist

Follow this top to bottom. Each step says exactly where to click and what to paste.
Nothing here is optional — skipping a step is almost always why "it's not working."

---

## ✅ Already done for you in this codebase
- Lovable fully removed (no dependency on their platform or account)
- Vercel build configured with Nitro and the TanStack Start framework preset
- NesAI logo mark installed as the app favicon
- "Owned and managed by Nesma Holdings (Pty) Ltd" on the site footer

Everything below is the setup work only *you* can do, because it requires your own
accounts and secrets.

---

## Step 1 — Database (Supabase) — ~10 minutes

1. Open the existing NesAI student Supabase project. Do not create a second project
   unless the application is intentionally being split across projects.
2. Open **SQL Editor**. Check migration history if it is tracked; otherwise verify each
   migration's effects against the project schema before applying. Apply only missing
   changes, once each, in filename order.
3. The complete migration sequence in this repository is:
   1. `20260727221111_676896a3-7a69-4ce2-a140-b4d859d49ea8.sql` — creates `profiles`,
      user roles, and the trigger that sets up a new profile on sign-up
   2. `20260727221122_82a157fa-9297-4a2c-a7ac-3fec7f49ed05.sql` — small permissions fix
   3. `20260728120000_payments_and_content_upload.sql` — creates `resources` (the Vault),
      `subscriptions` (PayPal billing), and `document_chunks` (AI grounding)
   4. `20261010090000_student_study_profiles.sql` — adds study and institution fields
      to profiles and updates new-profile creation
   5. `202610220001_secure_student_entitlements_and_ai_quota.sql` — protects premium
      entitlements and adds server-controlled AI usage reservations and quotas
4. Go to **Project Settings → API**. Copy these three values somewhere safe — you'll
   need them in Step 5:
   - **Project URL** → this is `SUPABASE_URL`
   - **anon / public key** → this is `SUPABASE_PUBLISHABLE_KEY`
   - **service_role key** (click "Reveal") → this is `SUPABASE_SERVICE_ROLE_KEY`

> ⚠️ The service role key bypasses all security rules. Never put it in code you commit
> to GitHub — it only ever goes into Vercel's server-side environment variables (Step 5).

---

## Step 2 — AI provider — ~5 minutes

Choose a provider supported by the application. Gemini works directly using
`GEMINI_API_KEY`; OpenAI-compatible providers can use `AI_GATEWAY_API_KEY` with the
endpoint and model settings below. Check model availability, usage limits and billing
in the provider dashboard before launch:
   ```
   AI_GATEWAY_API_KEY=                 ← provider key, if not using Gemini
   AI_GATEWAY_BASE_URL=https://api.groq.com/openai/v1
   AI_GATEWAY_MODEL=llama-3.3-70b-versatile
   ```

---

## Step 3 — Payments (PayPal) — ~15 minutes

Do this in **Sandbox** first so you can test without real money, then repeat in **Live**
once everything works.

1. Go to **developer.paypal.com/dashboard** → log in with your PayPal business account
   (free to create if you don't have one).
2. **Apps & Credentials** → **Create App**. Copy the **Client ID** and **Secret**.
3. Create a subscription plan: **Products** → create "NesAI Nova Premium" → add a
   monthly billing **Plan** on it, set your price (e.g. R89/month). Copy the **Plan ID**.
4. **Webhooks** → **Add Webhook** → URL: `https://YOURDOMAIN.com/api/payments/paypal-webhook`
   Subscribe it to:
   - `BILLING.SUBSCRIPTION.ACTIVATED`
   - `BILLING.SUBSCRIPTION.CANCELLED`
   - `BILLING.SUBSCRIPTION.EXPIRED`
   - `BILLING.SUBSCRIPTION.SUSPENDED`
   - `PAYMENT.SALE.COMPLETED`
   - `PAYMENT.SALE.REFUNDED`

   Copy the **Webhook ID** it gives you.
5. You now have 4 values: Client ID, Secret, Plan ID, Webhook ID.

---

## Step 4 — Push the code to GitHub

1. Unzip the project.
2. In a terminal, inside that folder:
   ```
   git init
   git add .
   git commit -m "Initial launch"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
   git push -u origin main
   ```
   (No terminal experience? GitHub's website lets you drag-and-drop the files into a
   new repo instead — same end result.)

---

## Step 5 — Vercel environment variables — ~5 minutes

Vercel dashboard → your project → **Settings → Environment Variables** → add each
value collected in Steps 1–3 to the **Preview** and **Production** environments:

```
SUPABASE_URL=                     ← optional if VITE_SUPABASE_URL is present
SUPABASE_PUBLISHABLE_KEY=         ← optional if VITE_SUPABASE_ANON_KEY is present
SUPABASE_SERVICE_ROLE_KEY=        ← from Step 1
VITE_SUPABASE_URL=                ← same value as SUPABASE_URL
VITE_SUPABASE_ANON_KEY=           ← Supabase anon/public key (or use VITE_SUPABASE_PUBLISHABLE_KEY)

GEMINI_API_KEY=                   ← from Step 2, or use AI_GATEWAY_API_KEY for another provider
AI_GATEWAY_API_KEY=               ← alternate provider key, when applicable
AI_GATEWAY_BASE_URL=https://api.groq.com/openai/v1   ← if using Groq
AI_GATEWAY_MODEL=llama-3.3-70b-versatile              ← if using Groq

PAYPAL_ENV=sandbox                ← "sandbox" for now, change to "live" later
PAYPAL_CLIENT_ID=                 ← from Step 3
PAYPAL_CLIENT_SECRET=             ← from Step 3
PAYPAL_WEBHOOK_ID=                ← from Step 3
VITE_PAYPAL_CLIENT_ID=            ← same value as PAYPAL_CLIENT_ID
VITE_PAYPAL_PLAN_ID=              ← from Step 3
```

The website enquiry form sends submissions to the configured Formspree endpoint in
`src/routes/api/leads.ts`; no additional Formspree environment variable is required.

The application accepts the existing `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
for user-scoped server requests, so do not duplicate the same values unless you prefer
the standard server variable names. Keep `SUPABASE_SERVICE_ROLE_KEY` server-only. Import
the Git repository in Vercel and deploy a Preview first. Redeploy whenever you change
environment values.

---

## Step 6 — Connect your domain — ~5 minutes + up to 1 hour waiting

1. In Vercel → **Project → Settings → Domains**, confirm the existing `www.nesai.co.za`
   domain is assigned to the production deployment.
2. Check the root-domain redirect and TLS status in Vercel. Change DNS only if Vercel
   reports that the current records are incorrect.
3. In Supabase Auth → URL Configuration, confirm the production Site URL and allow the
   production domain, the Vercel Preview URL pattern, and the local development URL.

---

## Step 7 — Make yourself admin — ~2 minutes

1. Visit your live site, sign up for a normal account like any student would.
2. Supabase → **Authentication → Users** → find your account → copy its **User UID**.
3. Supabase → **SQL Editor** → run (with your real UID pasted in):
   ```sql
   insert into public.user_roles (user_id, role)
   values ('PASTE-YOUR-USER-UID-HERE', 'admin');
   ```
4. Refresh the site, log in again. You'll now see the staff console instead of (or in
   addition to) the student view.

---

## Step 8 — Test everything before telling anyone it's live

Go through this list on the real, live site:

- [ ] Sign up as a new student — do you land on the Study Desk?
- [ ] Sign out, sign back in — does it remember you?
- [ ] Browse the Vault — do resources show up? (You'll need to upload some first — see
      the admin step below)
- [ ] Ask the AI tutor a question on each of the 4 subjects — does it respond?
- [ ] As admin: **Staff Upload** → upload a document, check "ground the AI tutor" →
      ask the tutor about that specific document — does it reference it?
- [ ] Go to **Upgrade** → subscribe using a PayPal **sandbox** buyer account → does your
      profile flip to Premium?
- [ ] Cancel that sandbox subscription → does Premium turn back off?
- [ ] Submit the enterprise enquiry form → confirm it arrives in Formspree or the configured CRM.
- [ ] Confirm Vercel Firewall/rate limiting is configured for `POST /api/leads`.
- [ ] Publish the approved privacy notice covering the data controller, CRM processor,
      purpose, lawful basis, retention and privacy contact.
- [ ] Once all of the above pass: switch `PAYPAL_ENV` to `live` in Vercel, swap in your
      live PayPal credentials, redeploy, and do **one real small test payment yourself**
      before announcing launch.

---

## If something breaks

Vercel → **Project → Deployments** → open the failed deployment and inspect its build or
function logs. Start with the first error, then check that all required environment
variables are assigned to the correct Preview or Production environment.
