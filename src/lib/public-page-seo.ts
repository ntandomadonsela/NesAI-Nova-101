export function publicPageHead(title: string, description: string, path: string) {
  const url = `https://www.nesai.co.za${path}`;
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:site_name", content: "NesAI" },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: url },
    ],
    links: [{ rel: "canonical", href: url }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebPage",
          "@id": `${url}#webpage`,
          url,
          name: title,
          description,
          isPartOf: { "@id": "https://www.nesai.co.za/#website" },
          about: { "@id": "https://www.nesai.co.za/#organization" },
          inLanguage: "en-ZA",
        }),
      },
    ],
  };
}
