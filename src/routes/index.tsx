import { createFileRoute } from "@tanstack/react-router";
import { CorporateHome } from "@/components/corporate-home";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { property: "og:url", content: "https://www.nesai.co.za/" },
      { property: "og:site_name", content: "NesAI" },
      { property: "og:image", content: "https://www.nesai.co.za/nesai-brand.png" },
      { property: "og:image:alt", content: "NesAI — Intelligence, Deployed at Scale" },
      { name: "twitter:title", content: "NesAI | AI Study Copilot and Human-Led AI Data" },
      {
        name: "twitter:description",
        content: "AI study support for South African students and human-led AI data services for enterprise teams.",
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
              description: "NesAI is the education technology and AI data operations brand of Nesma Holdings.",
              logo: {
                "@type": "ImageObject",
                url: "https://www.nesai.co.za/nesai-brand.png",
              },
              parentOrganization: {
                "@id": "https://www.nesmaholdings.co.za/#corporation",
              },
              contactPoint: {
                "@type": "ContactPoint",
                contactType: "enterprise enquiries",
                email: "hello@nesai.co.za",
                url: "https://www.nesai.co.za/contact",
              },
            },
            {
              "@type": "Corporation",
              "@id": "https://www.nesmaholdings.co.za/#corporation",
              name: "Nesma Holdings",
              legalName: "Nesma Holdings (Pty) Ltd",
              url: "https://www.nesmaholdings.co.za/",
              department: { "@id": "https://www.nesai.co.za/#organization" },
            },
            {
              "@type": "WebSite",
              "@id": "https://www.nesai.co.za/#website",
              name: "NesAI",
              url: "https://www.nesai.co.za/",
              description: "AI study support for South African students and human-led AI data services for enterprise teams.",
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
