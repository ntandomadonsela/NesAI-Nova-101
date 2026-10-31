import { createFileRoute } from "@tanstack/react-router";
import { PublicBrandPage } from "@/components/public-brand-page";
import { publicPageHead } from "@/lib/public-page-seo";

const description =
  "Learn about NesAI, a South African education technology and AI data operations brand within Nesma Holdings.";

export const Route = createFileRoute("/about")({
  head: () => publicPageHead("About NesAI | Our Mission and Background", description, "/about"),
  component: AboutPage,
});

function AboutPage() {
  return (
    <PublicBrandPage
      content={{
        eyebrow: "ABOUT NESAI",
        title: "South African expertise for learning and AI.",
        introduction:
          "NesAI is a South African technology brand within Nesma Holdings (Pty) Ltd. We build practical tools for students and human-led data workflows for organizations developing AI.",
        callToAction: { label: "Contact NesAI", href: "/contact" },
        sections: [
          {
            title: "Our mission",
            description:
              "Make useful technology more accessible by pairing capable AI systems with people who understand the local context.",
            points: ["Support learning with a focused AI study copilot", "Help AI teams produce reliable human-reviewed data"],
          },
          {
            title: "Built for South Africa",
            description:
              "Our student offering is shaped around South African learners, curricula, and study resources.",
            points: ["South African study support", "Past papers, memos, and learning resources"],
          },
          {
            title: "Part of Nesma Holdings",
            description:
              "NesAI operates as an education technology and AI data operations brand within Nesma Holdings (Pty) Ltd.",
            points: ["Education technology", "Enterprise AI data services"],
          },
        ],
      }}
    />
  );
}
