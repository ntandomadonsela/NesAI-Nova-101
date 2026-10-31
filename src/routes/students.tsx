import { createFileRoute } from "@tanstack/react-router";
import { PublicBrandPage } from "@/components/public-brand-page";
import { publicPageHead } from "@/lib/public-page-seo";

const description =
  "Study with NesAI’s AI copilot, specialist subject support, and South African past papers, memos, and study notes.";

export const Route = createFileRoute("/students")({
  head: () => publicPageHead("NesAI Student | AI Study Copilot and Past Papers", description, "/students"),
  component: StudentsPage,
});

function StudentsPage() {
  return (
    <PublicBrandPage
      content={{
        eyebrow: "NESAI FOR STUDENTS",
        title: "Your AI study copilot for South African learning.",
        introduction:
          "NesAI Student brings AI-powered study support and learning resources together for South African learners and students.",
        callToAction: { label: "Create a student account", href: "/auth?mode=signup" },
        sections: [
          {
            title: "Specialist AI tutors",
            description:
              "Ask questions and work through study problems with subject-focused AI tutors that explain concepts step by step.",
            points: [
              "Support across school and university subjects",
              "Explanations shaped to the selected level and subject",
              "A study desk for follow-up questions",
            ],
          },
          {
            title: "The Vault resource library",
            description:
              "Find past exam papers, memos and study notes organised around subjects and curricula.",
            points: [
              "Search by subject, year and resource type",
              "Use papers and memos alongside tutor support",
              "Open the NesAI Vault to explore available materials",
            ],
          },
          {
            title: "A practical study workspace",
            description:
              "Keep your study profile and learning conversations in one place as you prepare for assessments.",
            points: [
              "Choose a study level and subject area",
              "Return to your AI study desk when you need help",
              "Upgrade options are available in the student platform",
            ],
          },
        ]}}
    />
  );
}
