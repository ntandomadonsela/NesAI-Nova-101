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
6. Save the settings and request a new confirmation email from the sign-up page.
   Check the email provider's delivery log if the message still does not arrive.

Supabase owns the SMTP delivery and confirmation template settings. Changing the
frontend cannot make a message arrive when SMTP is not configured, the sender domain
is not verified, or the Supabase project URL is not reachable.
