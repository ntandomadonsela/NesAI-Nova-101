import { createFileRoute } from "@tanstack/react-router";
import { CorporateHome } from "@/components/corporate-home";

export const Route = createFileRoute("/")({
  head: () => ({
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
  }),
  component: CorporateHome,
});
