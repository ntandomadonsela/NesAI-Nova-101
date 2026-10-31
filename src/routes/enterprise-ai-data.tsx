import { createFileRoute } from "@tanstack/react-router";
import { PublicBrandPage } from "@/components/public-brand-page";
import { publicPageHead } from "@/lib/public-page-seo";

const description =
  "NesAI helps enterprise AI teams create training data, annotate text, image, audio and video, and evaluate models with human experts.";

export const Route = createFileRoute("/enterprise-ai-data")({
  head: () => publicPageHead("Enterprise AI Data Services | NesAI", description, "/enterprise-ai-data"),
  component: EnterpriseAiDataPage,
});

function EnterpriseAiDataPage() {
  return (
    <PublicBrandPage
      content={{
        eyebrow: "ENTERPRISE AI DATA",
        title: "Human expertise for better AI data.",
        introduction:
          "NesAI helps AI teams scope, create and review the data behind model training and evaluation. Each workflow is shaped around the task, domain, quality standard and intended model use.",
        callToAction: { label: "Discuss an enterprise project", href: "/#contact" },
        sections: [
          {
            title: "Data generation and annotation",
            description:
              "Build structured datasets with clear task instructions and outputs that match your model and evaluation needs.",
            points: [
              "Text, image, audio and video annotation",
              "Transcription, classification and preference data",
              "Computer-use and 3D agent trajectory tasks",
            ],
          },
          {
            title: "RLHF and model evaluation",
            description:
              "Collect expert feedback and assess model behaviour against project-specific criteria.",
            points: [
              "Response ranking and quality ratings",
              "Safety assessment and red-teaming",
              "Reasoning and domain-specific evaluation",
            ],
          },
          {
            title: "Workflow design and quality review",
            description:
              "Translate project goals into contributor instructions, qualification checks and review steps.",
            points: [
              "Task templates matched to the data modality",
              "Qualification exams and contributor routing",
              "Independent review and consensus checks",
            ],
          },
        ]}}
    />
    );
}
