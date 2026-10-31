import { createFileRoute } from "@tanstack/react-router";
import { PublicBrandPage } from "@/components/public-brand-page";
import { publicPageHead } from "@/lib/public-page-seo";

const description =
  "Explore NesAI student resources, including the AI study copilot, practice tests, and a library of South African past papers, memos, and notes.";

export const Route = createFileRoute("/resources")({
  head: () => publicPageHead("Student Resources and Study Tools | NesAI", description, "/resources"),
  component: ResourcesPage,
});

function ResourcesPage() {
  return (
    <PublicBrandPage
      content={{
        eyebrow: "STUDENT RESOURCES",
        title: "Study tools and academic resources in one place.",
        introduction:
          "Use NesAI’s study copilot to work through questions, practise with multiple-choice tests, and find papers and study materials in The Vault.",
        callToAction: { label: "Browse The Vault", href: "/vault" },
        sections: [
          {
            title: "AI study copilot",
            description:
              "Ask questions, revisit saved conversations, and get step-by-step help with your learning.",
            points: ["Study support", "Conversation history", "Practice test creation and marking"],
          },
          {
            title: "The Vault",
            description:
              "Find academic documents and narrow your search with filters for level, curriculum, subject, type, and year.",
            points: ["Past papers", "Memos", "Study notes"],
          },
          {
            title: "Learn with your materials",
            description:
              "Open a document in the student platform and ask the tutor to help explain its content and questions.",
            points: ["Document-based study help", "Guided explanations", "Self-paced revision"],
          },
        ],
      }}
    />
  );
}
