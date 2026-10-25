import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteNav } from "@/components/site-nav";

export const Route = createFileRoute("/account-deletion")({
  head: () => ({
    meta: [
      { title: "Delete your NesAI account" },
      {
        name: "description",
        content: "How to permanently delete your NesAI student account and associated data.",
      },
    ],
  }),
  component: AccountDeletionPage,
});

function AccountDeletionPage() {
  return (
    <div className="min-h-screen bg-background nesai-app-surface">
      <SiteNav />
      <main className="mx-auto max-w-3xl px-6 py-14 md:py-20">
        <div className="app-eyebrow">ACCOUNT &amp; PRIVACY</div>
        <h1 className="mt-2 font-serif text-4xl app-page-title">Delete your NesAI account</h1>
        <p className="mt-4 text-muted-foreground">
          You can permanently delete your account and its associated student profile, study chats,
          and subscription records from the app or website.
        </p>
        <ol className="mt-8 list-decimal space-y-4 pl-6">
          <li>Sign in to NesAI and open your profile.</li>
          <li>
            Choose <strong>Delete account</strong>, acknowledge the subscription notice, and
            confirm.
          </li>
          <li>Your account and associated data are deleted immediately after confirmation.</li>
        </ol>
        <p className="mt-6 text-sm text-muted-foreground">
          Deleting a NesAI account does not cancel recurring billing with Apple, Google Play, or
          PayPal. Cancel subscriptions in the store or payment account where you purchased them
          before deleting your NesAI account. Payment-provider records remain subject to that
          provider’s retention policies.
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          Account deletion does not automatically remove Vault PDFs or study reminders stored on
          this device. Remove saved files in The Vault and turn off reminders in your profile, or
          clear the app’s local data.
        </p>
        <Link
          to="/auth"
          search={{ mode: "signin", redirect: "/profile" }}
          className="mt-8 inline-flex rounded-full bg-primary px-5 py-3 font-medium text-primary-foreground"
        >
          Sign in to manage your account
        </Link>
      </main>
    </div>
  );
}
