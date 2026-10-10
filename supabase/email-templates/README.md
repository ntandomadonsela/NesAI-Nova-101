# NesAI sign-up confirmation email

The app uses Supabase Auth's built-in confirmation email. The branded HTML is in
[`confirm-signup.html`](./confirm-signup.html); the app cannot choose the sender
address or deliver email by itself.

## Configure delivery in Supabase

1. In the Supabase dashboard, open **Authentication → SMTP Settings** and enable a
   custom SMTP provider. Supabase's default sender is for testing and may only send
   to addresses belonging to your Supabase organization. Production signup needs
   an SMTP service such as Resend, Postmark, or Brevo.
2. Verify a domain you control with that email provider and add the DNS records it
   gives you. Use a sender address on that verified domain, for example
   `no-reply@your-verified-domain`. Do not use that example until you own and verify
   the domain.
3. Set the sender display name to **NesAI**, and enter the SMTP host, port, username,
   and password from the provider in Supabase. Keep the SMTP password private.
4. Open **Authentication → Email Templates → Confirm signup**. Set the subject to
   **Confirm your NesAI account**, then replace the message body with the contents of
   `confirm-signup.html`. The template loads the logo from
   `{{ .SiteURL }}/nesai-logo.png`, so deploy the app (including
   `public/nesai-logo.png`) and set the Supabase Site URL to that live site first.
5. In **Authentication → URL Configuration**, set the production Site URL and add
   the production domain and any Vercel preview domains to the redirect URL allow
   list. The app sends users back to `/auth?redirect=%2Fchat` after they confirm.
   In Vercel, set `VITE_APP_URL` to the stable production origin (for example,
   `https://your-app.vercel.app`) and redeploy. Do not include `localhost` here.
   Keep the production Site URL and redirect allow-list pointed at that same site.
6. Save the settings and request a new confirmation email from the sign-up page.
   Check the email provider's delivery log if the message still does not arrive.

## Logo in the email and logo beside the sender

The confirmation email body uses the full NesAI logo at
`{{ .SiteURL }}/nesai-logo.png`. The image must load over HTTPS without a login,
and the Supabase Site URL must be the public website origin. Some recipients may
need to allow remote images in their email app before seeing it.

The small sender image shown beside a message in an inbox is separate from the
email HTML. To request that mailbox providers show a brand logo, configure BIMI
for the verified sending domain: align SPF/DKIM with DMARC, publish a BIMI DNS
record that points to a public SVG Tiny-PS logo, and obtain a VMC or CMC if the
mailbox provider requires one. Providers decide whether to display it, so it
cannot be guaranteed by the email template alone.

Supabase owns the SMTP delivery and confirmation template settings. Changing the
frontend cannot make a message arrive when SMTP is not configured, the sender domain
is not verified, or the Supabase project URL is not reachable.
