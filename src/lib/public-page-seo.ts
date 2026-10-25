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
  };
}
