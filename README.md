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

| Variable | Required for | Visibility |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Browser sign-in, Vault, and uploads | Public |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Browser sign-in, Vault, and uploads | Public; use the Supabase publishable/anon key only |
| `SUPABASE_URL` | Server-side auth and data routes | Server only |
| `SUPABASE_PUBLISHABLE_KEY` | Server-side user-scoped Supabase requests | Server only; same publishable/anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Trusted server admin writes, AI indexing, and billing records | **Secret; service role key** |
| `AI_GATEWAY_API_KEY` | AI tutor responses | **Secret** |
| `AI_GATEWAY_BASE_URL` | Optional non-OpenAI-compatible provider URL | Server only; defaults to OpenAI |
| `AI_GATEWAY_MODEL` | Optional model override | Server only; defaults to `gpt-4o-mini` |
| `VITE_PAYPAL_CLIENT_ID` | PayPal checkout button | Public |
| `VITE_PAYPAL_PLAN_ID` | PayPal subscription plan | Public identifier |
| `PAYPAL_CLIENT_ID` | Server-side PayPal API verification | Server only |
| `PAYPAL_CLIENT_SECRET` | Server-side PayPal API verification | **Secret** |
| `PAYPAL_ENV` | Select `sandbox` or `live` PayPal API | Server only |
| `PAYPAL_WEBHOOK_ID` | Verify PayPal webhook signatures | **Secret** |
| `LEADS_WEBHOOK_URL` | Optional delivery for contact enquiries | **Secret** |

The AI, Supabase, and PayPal values come from those providers' project/app settings. `LEADS_WEBHOOK_URL` is optional; without it, the endpoint accepts submissions in development mode but does not forward them to a CRM.

### Service setup required before launch

- **Supabase database:** run every SQL migration in `supabase/migrations/` in filename order. The latest migration creates the Vault tables, document chunks, and the public-read/admin-write `resource-files` storage bucket.
- **Supabase Auth:** set the production Site URL to your deployed domain, then allow the production URL, your Vercel preview URL pattern, and local development URL under redirect URLs. Email confirmation links must return to the deployment that initiated sign-up.
- **Supabase admin:** after creating your account, assign its user UUID the `admin` role in `public.user_roles` to access `/admin/upload`.
- **AI provider:** add `AI_GATEWAY_API_KEY`; the chat route returns a configuration error until a provider key is present.
- **PayPal:** leave `PAYPAL_ENV=sandbox` and use sandbox credentials and a sandbox plan while verifying checkout and webhook flows. Configure the webhook endpoint as `https://<your-domain>/api/payments/paypal-webhook`. Switch all PayPal credentials, plan, webhook ID, and `PAYPAL_ENV=live` together only when ready for real payments.
- **Contact form:** add a private CRM/webhook URL if enquiries should be delivered outside the app.

### Production verification checklist

Run these checks against a Vercel Preview deployment before production:

1. Load `/`, `/auth`, `/vault`, `/chat`, and `/upgrade`; confirm assets load and deep links work after a hard refresh.
2. Create an account, confirm email, sign in, sign out, and verify the Supabase redirect returns to the correct preview or production hostname.
3. Ask the tutor a question and confirm the streaming answer completes. Verify the free daily limit is enforced.
4. Sign in as an admin, upload a small PDF or DOCX, confirm it appears in the Vault, and ask the tutor about that resource.
5. In PayPal sandbox, complete a subscription and confirm the profile's premium flag changes. Send a test webhook and confirm cancellation/refund removes premium access.
6. Submit the contact form and confirm delivery in the configured webhook/CRM.
7. Check Vercel function logs and browser console for failed requests, missing environment variables, or asset errors.

## Deploy to Netlify

The existing Netlify deployment remains available. Import the repository into Netlify and use the included `netlify.toml`; add the same provider environment variables to the Netlify environment settings before deploying.
