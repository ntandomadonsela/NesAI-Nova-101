import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { CorporateHome } from "@/components/corporate-home";

export const Route = createFileRoute("/")({
  head: () => {
    if (import.meta.env.VITE_MOBILE_APP === "true") {
      return {
        meta: [
          { title: "NesAI Student | AI Study Support" },
          { name: "description", content: "Your AI study desk and learning resources from NesAI." },
        ],
      };
    }

    return {
      meta: [
        { property: "og:url", content: "https://www.nesai.co.za/" },
        { property: "og:image", content: "https://www.nesai.co.za/nesai-brand.png" },
        { property: "og:image:alt", content: "NesAI — Intelligence, Deployed at Scale" },
        { name: "twitter:title", content: "NesAI | Human-led data for AI teams" },
        {
          name: "twitter:description",
          content: "Human-led training data, annotation and model evaluation for AI teams.",
        },
        { name: "twitter:image", content: "https://www.nesai.co.za/nesai-brand.png" },
      ],
      links: [{ rel: "canonical", href: "https://www.nesai.co.za/" }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "Organization",
                "@id": "https://www.nesai.co.za/#organization",
                name: "NesAI",
                url: "https://www.nesai.co.za/",
                logo: "https://www.nesai.co.za/nesai-brand.png",
                description: "Enterprise AI data, human expertise and intelligent systems.",
              },
              {
                "@type": "WebSite",
                "@id": "https://www.nesai.co.za/#website",
                name: "NesAI",
                url: "https://www.nesai.co.za/",
                description: "Enterprise AI data, human expertise and intelligent systems.",
                publisher: { "@id": "https://www.nesai.co.za/#organization" },
                inLanguage: "en-ZA",
              },
            ],
          }),
        },
      ],
    };
  },
  component: import.meta.env.VITE_MOBILE_APP === "true" ? MobileStudentEntry : CorporateHome,
});

function MobileStudentEntry() {
  const navigate = useNavigate();

  useEffect(() => {
    void navigate({ to: "/chat", replace: true });
  }, [navigate]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <img src="/nesai-symbol.png" alt="NesAI" className="h-20 w-20" />
      <h1 className="font-serif text-3xl">NesAI Student</h1>
      <p className="text-sm text-muted-foreground">Opening your Study Desk…</p>
      <Link to="/chat" className="text-primary underline">
        Open Study Desk
      </Link>
    </main>
  );
}
