# NesAI

NesAI is a full-stack AI study platform built with TanStack Start, React, TypeScript, Tailwind CSS, Supabase, and an OpenAI-compatible AI provider. It supports Vercel through Nitro and keeps the Netlify adapter for the existing Netlify deployment.

## Run locally

Requires Node.js 22 or newer.

```sh
git clone <your-repository-url>
cd <repository-name>
copy .env.example .env
npm ci
npm run dev
```

## Deploy to Vercel

1. Push this repository to GitHub, GitLab, or Bitbucket.
2. In Vercel, choose **Add New → Project**, import the repository, and keep the project root as the repository root.
3. Keep the detected **TanStack Start** framework preset and default build command (`npm run build`). The repo's Vercel config selects the TanStack Start preset; `vite.config.ts` selects Nitro when Vercel builds the app.
4. Add the environment variables below in **Project → Settings → Environment Variables**. Add server secrets to Production and Preview as needed; add public browser variables to every environment where you test the app.
5. Deploy to Preview first. Complete the service configuration checklist below and verify the listed user journeys before promoting the deployment to Production.
6. Add a custom domain in **Project → Settings → Domains** when ready. Then add the production hostname to Supabase Auth's allowed redirect URLs and site URL.

Vercel creates preview deployments from branches and pull requests, and production deployments from the configured production branch. Redeploy after changing environment variables so the deployment uses the new values.

### Environment variables

Use `.env.example` as the source of truth. Never commit `.env` or put secrets in a `VITE_` variable. Set the same Supabase project URL and publishable/anon key in both the public and server variables because the browser client and authenticated server routes read them separately.

| Variable                        | Required for                                                  | Visibility                                                     |
| ------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------- |
| `VITE_SUPABASE_URL`             | Browser sign-in, Vault, and uploads                           | Public                                                         |
| `VITE_SUPABASE_PUBLISHABLE_KEY` or `VITE_SUPABASE_ANON_KEY` | Browser sign-in, Vault, and uploads | Public; use the Supabase publishable/anon key only |
| `VITE_APP_URL`                  | Canonical origin for Supabase auth callback links             | Public; set to the production Vercel URL with no trailing path |
| `SUPABASE_URL`                  | Server-side auth and data routes                              | Server only                                                    |
| `SUPABASE_PUBLISHABLE_KEY`      | Server-side user-scoped Supabase requests                     | Server only; same publishable/anon key                         |
| `SUPABASE_SERVICE_ROLE_KEY`     | Trusted server admin writes, AI indexing, and billing records | **Secret; service role key**                                   |
| `GEMINI_API_KEY`, `AI_GATEWAY_API_KEY` or `OPENAI_API_KEY` | AI tutor responses | **Secret** |
| `AI_GATEWAY_BASE_URL`           | Optional OpenAI-compatible provider URL                       | Server only; Gemini endpoint is selected automatically for `GEMINI_API_KEY` |
| `AI_GATEWAY_MODEL`              | Optional model override                                       | Server only; defaults to `gemini-3.8-flash` for Gemini or `gpt-5.4-mini` for OpenAI |
| `VITE_PAYPAL_CLIENT_ID`         | PayPal checkout button                                        | Public                                                         |
| `VITE_PAYPAL_PLAN_ID`           | PayPal subscription plan                                      | Public identifier                                              |
| `PAYPAL_CLIENT_ID`              | Server-side PayPal API verification                           | Server only                                                    |
| `PAYPAL_CLIENT_SECRET`          | Server-side PayPal API verification                           | **Secret**                                                     |
| `PAYPAL_ENV`                    | Select `sandbox` or `live` PayPal API                         | Server only                                                    |
| `PAYPAL_WEBHOOK_ID`             | Verify PayPal webhook signatures                              | **Secret**                                                     |
| `FORMSPREE_FORM_ID`             | Formspree delivery for contact enquiries                      | Server-side setting                                           |
| `LEADS_WEBHOOK_URL`             | Optional alternative CRM webhook delivery                     | **Secret**                                                     |

The server accepts either the standard Supabase server variable names or the existing Vercel `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` pair for user-scoped requests. The service-role key must remain server-only. The chat route can use `GEMINI_API_KEY` directly, or use an OpenAI-compatible provider through `AI_GATEWAY_API_KEY` and its optional base URL/model settings. For contact enquiries, set `FORMSPREE_FORM_ID` from the Formspree form endpoint, or use `LEADS_WEBHOOK_URL` for a private CRM webhook. If neither is set, the contact form reports that delivery is unavailable rather than claiming an enquiry was sent.

### Service setup required before launch

- **Supabase database:** use the existing NesAI student project, check its migration history, then apply only unapplied files from `supabase/migrations/` in filename order. The migrations cover profiles and roles, Vault and billing tables, study-profile fields, and server-controlled study entitlements and AI usage quotas. The Vault migration also creates the `resource-files` storage bucket.
- **Supabase Auth:** set the production Site URL to your deployed domain, then allow the production URL, your Vercel preview URL pattern, and local development URL under redirect URLs. Add `/auth*` for each hostname so email confirmation returns users to sign-in and then opens their study desk. Set `VITE_APP_URL` in Vercel to the stable production origin (for example, `https://your-app.vercel.app`) and redeploy; this prevents confirmation requests created from a local or preview page from redirecting to localhost or a temporary preview URL.
- **Supabase admin:** after creating your account, assign its user UUID the `admin` role in `public.user_roles` to access `/admin/upload`.
- **AI provider:** set a paid-tier `GEMINI_API_KEY` for the recommended `gemini-3.8-flash` model, or configure `OPENAI_API_KEY` / `AI_GATEWAY_API_KEY`. Keep keys server-side. Do not send student chats through Gemini's unpaid tier: its terms allow submitted content to be used to improve Google products. The paid tier excludes prompts and responses from that use.
- **Free AI allowance:** free accounts receive 20 successful AI questions per rolling 24-hour window; failed provider requests release the reserved credit. Premium accounts retain unlimited verified access.
- **PayPal:** leave `PAYPAL_ENV=sandbox` and use sandbox credentials and a sandbox plan while verifying checkout and webhook flows. Configure the webhook endpoint as `https://<your-domain>/api/payments/paypal-webhook`. Switch all PayPal credentials, plan, webhook ID, and `PAYPAL_ENV=live` together only when ready for real payments.
- **Contact form:** set `FORMSPREE_FORM_ID` in Vercel or configure an HTTPS CRM webhook in `LEADS_WEBHOOK_URL`.
- **Contact form abuse controls:** configure a Vercel Firewall/rate limit for `POST /api/leads`. The form includes a honeypot, but that is not a substitute for request-rate limiting.
- **Privacy notice:** publish the approved privacy notice for the data controller and enquiry processor, including purpose, lawful basis, retention, and the data-subject contact route. The inline form notice explains the CRM hand-off but is not a full privacy policy.

### Production verification checklist

Run these checks against a Vercel Preview deployment before production:

1. Load `/`, `/auth`, `/vault`, `/chat`, and `/upgrade`; confirm assets load and deep links work after a hard refresh.
2. Create an account, confirm email, sign in, sign out, and verify the Supabase redirect returns to the correct preview or production hostname.
3. Ask the tutor a question and confirm the streaming answer completes. Verify the free daily limit is enforced.
4. Sign in as an admin, upload a small PDF or DOCX, confirm it appears in the Vault, and ask the tutor about that resource.
5. In PayPal sandbox, complete a subscription and confirm the profile's premium flag changes. Send a test webhook and confirm cancellation/refund removes premium access.
6. Submit the contact form and confirm delivery in Formspree or the configured webhook/CRM.
7. Check Vercel function logs and browser console for failed requests, missing environment variables, or asset errors.

## Deploy to Netlify

The existing Netlify deployment remains available. Import the repository into Netlify and use the included `netlify.toml`; add the same provider environment variables to the Netlify environment settings before deploying.
