import { createFileRoute } from "@tanstack/react-router";
import { PublicBrandPage } from "@/components/public-brand-page";
import { publicPageHead } from "@/lib/public-page-seo";

const description =
  "Explore NesAI’s human-led AI data services for enterprise teams, including data annotation, transcription, RLHF, and model evaluation.";

export const Route = createFileRoute("/marketplace")({
  head: () => publicPageHead("NesAI AI Data Marketplace | Annotation and Evaluation", description, "/marketplace"),
  component: MarketplacePage,
});

function MarketplacePage() {
  return (
    <PublicBrandPage
      content={{
        eyebrow: "NESAI MARKETPLACE",
        title: "Human-led AI data services for enterprise teams.",
        introduction:
          "NesAI Marketplace connects enterprise data projects with contributors whose experience fits the work. Projects can cover data collection, annotation, model feedback and evaluation.",
        callToAction: {
          label: "Open NesAI Marketplace",
          href: "https://marketplace.nesai.co.za/",
        },
        sections: [
          {
            title: "For enterprise teams",
            description:
              "Prepare a structured project brief, define the work and quality requirements, and manage project funding and delivery through the marketplace.",
            points: [
              "Project-specific instructions and deliverables",
              "Budget and review requirements",
              "Secure access controls for restricted projects",
            ],
          },
          {
            title: "For contributors",
            description:
              "Find work that matches your domain skills and complete the required qualification before joining eligible tasks.",
            points: [
              "Project opportunities matched to relevant skills",
              "Qualification and onboarding steps",
              "Clear task instructions and submission requirements",
            ],
          },
          {
            title: "Quality and accountability",
            description:
              "Marketplace workflows support independent review, quality checks and tracked project progress.",
            points: [
              "Configurable multi-review workflows",
              "Review outcomes and quality approval",
              "Project-level controls for budget and task access",
            ],
          },
        ]}}
    />
    );
}
