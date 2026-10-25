import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { SiteNav } from "@/components/site-nav";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy notice | NesAI Student" },
      {
        name: "description",
        content: "How NesAI Student uses account, study, subscription and device data.",
      },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background nesai-app-surface">
      <SiteNav />
      <main className="mx-auto max-w-3xl px-6 py-14 md:py-20">
        <div className="app-eyebrow">ACCOUNT &amp; PRIVACY</div>
        <h1 className="mt-2 font-serif text-4xl app-page-title">NesAI Student privacy notice</h1>
        <p className="mt-4 text-sm text-muted-foreground">Last updated: 25 October 2026</p>

        <div className="mt-8 space-y-8 text-muted-foreground">
          <section>
            <h2 className="font-serif text-2xl text-foreground">Information we use</h2>
            <p className="mt-3">
              When you create an account, we process your email address and any name you provide.
              Your optional study profile can include your school or university level, selected
              subjects, institution, degree and study year. We use this information to operate your
              account and tailor study support.
            </p>
            <p className="mt-3">
              When you use the Study Desk, your prompts and the relevant parts of your study profile
              are sent to NesAI and the AI model provider configured for the service so it can
              generate a response. Do not include passwords, financial details or other sensitive
              information in study prompts. The current app does not save Study Desk conversations
              as chat history in your NesAI account.
            </p>
            <p className="mt-3">
              If you buy Premium, we process subscription status, product and transaction details
              needed to verify the purchase and provide access. Apple and Google process in-app
              purchases under their own terms. Google purchase tokens are stored as a one-way hash
              for subscription matching. Website payments are handled by PayPal; NesAI does not
              receive your full card number from PayPal.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl text-foreground">Files saved on your device</h2>
            <p className="mt-3">
              If you save a Vault PDF for offline study, the file and its resource details are
              stored in local browser storage on that device. You can remove saved files from the
              Vault. They may also be removed by clearing the app's data or uninstalling the app.
              Deleting your NesAI account does not automatically clear files already saved on your
              device. When you share a PDF, the selected file is passed to the app you choose in
              your device's share sheet. Deleting your NesAI account does not automatically clear
              saved PDFs or reminders stored locally on that device.
            </p>
            <p className="mt-3">
              If you set a daily study reminder, its time is saved in app storage on this device and
              the reminder is scheduled with the operating system. This preference is not sent to
              NesAI. You can change or turn the reminder off in your profile or device settings.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl text-foreground">Service providers</h2>
            <p className="mt-3">
              We use service providers to host the app and database, authenticate accounts, deliver
              AI responses and process payments. They receive information needed to provide those
              services and handle it under their own privacy terms and our service configuration.
              The providers currently used for your request depend on the service settings in effect
              when you use NesAI.
            </p>
            <p className="mt-3">
              We do not currently use advertising trackers or a third-party analytics SDK in the
              student app. Hosting and security systems may process standard connection and error
              information to keep the service running and protect it from abuse.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl text-foreground">Retention and deletion</h2>
            <p className="mt-3">
              Account and profile information is kept while your account is active. You can request
              account deletion from your profile or follow the instructions on our account deletion
              page. We delete associated NesAI account data when the account is deleted, except for
              information that must be retained for security, legal or financial recordkeeping.
              Apple, Google and PayPal may keep their own transaction records under their policies.
            </p>
            <p className="mt-3">
              You can ask to access or correct your account information, or contact us with a
              privacy request, at{" "}
              <a className="underline" href="mailto:hello@nesai.co.za">
                hello@nesai.co.za
              </a>
              .
            </p>
            <Link to="/account-deletion" className="mt-3 inline-flex text-primary underline">
              Account deletion instructions
            </Link>
          </section>

          <section>
            <h2 className="font-serif text-2xl text-foreground">Changes and contact</h2>
            <p className="mt-3">
              We may update this notice as the app changes. The latest version will be available on
              this page. For questions about privacy or data handling, email{" "}
              <a className="underline" href="mailto:hello@nesai.co.za">
                hello@nesai.co.za
              </a>
              .
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
