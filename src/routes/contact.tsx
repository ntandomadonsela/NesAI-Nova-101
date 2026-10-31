import { createFileRoute } from "@tanstack/react-router";
import { PublicBrandPage } from "@/components/public-brand-page";
import { publicPageHead } from "@/lib/public-page-seo";

const description =
  "Contact NesAI for enterprise AI data projects, student platform support, or general enquiries.";

export const Route = createFileRoute("/contact")({
  head: () => publicPageHead("Contact NesAI | Sales, Support and Enquiries", description, "/contact"),
  component: ContactPage,
});

function ContactPage() {
  return (
    <PublicBrandPage
      content={{
        eyebrow: "CONTACT NESAI",
        title: "Talk to the right NesAI team.",
        introduction:
          "Contact us about an enterprise AI data project, the student platform, or another question. Our team will direct your enquiry to the right place.",
        callToAction: { label: "Send an enquiry", href: "/#contact" },
        sections: [
          {
            title: "Enterprise projects",
            description:
              "Tell us about your data collection, annotation, transcription, or model evaluation needs.",
            points: ["Project scoping", "Data operations", "Quality and evaluation"],
          },
          {
            title: "Student platform support",
            description:
              "Get help with your account, study tools, or academic resources.",
            points: ["Account and sign-in help", "Study desk and AI tutor", "The Vault"],
          },
          {
            title: "Email",
            description: "Reach the NesAI team directly by email.",
            points: ["hello@nesai.co.za"],
          },
        ],
        children: (
          <p className="corp-contact-email">
            Email <a href="mailto:hello@nesai.co.za">hello@nesai.co.za</a>
          </p>
        ),
      }}
    />
  );
}
