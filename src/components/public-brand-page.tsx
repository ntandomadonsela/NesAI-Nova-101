import { useState } from "react";
import type { ReactNode } from "react";
import { ArrowRight, ArrowUpRight, Menu, X } from "lucide-react";

export type PublicBrandPageContent = {
  eyebrow: string;
  title: string;
  introduction: string;
  sections: Array<{
    title: string;
    description: string;
    points: string[];
  }>;
  callToAction: { label: string; href: string };
  children?: ReactNode;
};

export function PublicBrandPage({ content }: { content: PublicBrandPageContent }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="corporate-home corp-public-page">
      <a className="corp-skip-link" href="#main-content">
        Skip to main content
      </a>
      <header className="corp-header">
        <div className="corp-container corp-nav">
          <a className="corp-brand" href="/" aria-label="NesAI home">
            <img src="/nesai-brand.png" alt="NesAI — Intelligence, Deployed at Scale" />
          </a>
          <button
            type="button"
            className="corp-public-mobile-toggle"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={menuOpen}
            aria-controls="public-navigation"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <nav
            id="public-navigation"
            className={menuOpen ? "corp-public-links open" : "corp-public-links"}
            aria-label="NesAI sections"
          >
            <a href="/about" onClick={() => setMenuOpen(false)}>About NesAI</a>
            <a href="/students" onClick={() => setMenuOpen(false)}>Academic Copilot</a>
            <a href="/resources" onClick={() => setMenuOpen(false)}>Student Resources</a>
            <a href="/marketplace" onClick={() => setMenuOpen(false)}>AI Data Marketplace</a>
            <a href="/enterprise-ai-data" onClick={() => setMenuOpen(false)}>Enterprise services</a>
            <a className="corp-button corp-button-small" href="/contact" onClick={() => setMenuOpen(false)}>
              Contact NesAI <ArrowRight size={14} />
            </a>
          </nav>
        </div>
      </header>

      <main id="main-content">
        <section className="corp-public-hero">
          <div className="corp-container">
            <div className="corp-eyebrow dark">
              <span /> {content.eyebrow}
            </div>
            <h1>{content.title}</h1>
            <p>{content.introduction}</p>
            <a className="corp-button" href={content.callToAction.href}>
              {content.callToAction.label} <ArrowRight size={16} />
            </a>
          </div>
        </section>

        <section className="corp-section corp-public-sections">
          <div className="corp-container">
            <div className="corp-public-grid">
              {content.sections.map((section, index) => (
                <article className="corp-service-card" key={section.title}>
                  <div className="corp-card-index">
                    {String(index + 1).padStart(2, "0")} / NESAI
                  </div>
                  <h2>{section.title}</h2>
                  <p>{section.description}</p>
                  <ul>
                    {section.points.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
            {content.children}
          </div>
        </section>

        <section className="corp-public-cta">
          <div className="corp-container corp-public-cta-inner">
            <div>
              <div className="corp-eyebrow">
                <span /> NESAI · INTELLIGENCE, DEPLOYED AT SCALE
              </div>
              <h2>Find the right NesAI platform for your work.</h2>
            </div>
            <a className="corp-button" href={content.callToAction.href}>
              {content.callToAction.label} <ArrowUpRight size={16} />
            </a>
          </div>
        </section>
      </main>

      <footer className="corp-footer">
        <div className="corp-container">
          <div className="corp-footer-main">
            <a className="corp-brand" href="/" aria-label="NesAI home">
              <img src="/nesai-brand.png" alt="NesAI — Intelligence, Deployed at Scale" />
            </a>
            <p>Human intelligence for better AI.</p>
            <div className="corp-footer-links">
              <a href="/enterprise-ai-data">Enterprise AI data</a>
              <a href="/marketplace">NesAI AI Data Marketplace</a>
              <a href="/students">NesAI Academic Copilot</a>
              <a href="/resources">Student resources</a>
              <a href="/vault">The Vault</a>
              <a href="https://marketplace.nesai.co.za/?workspace=talent">Contributor sign-in</a>
              <a href="/contact">Contact NesAI</a>
            </div>
          </div>
          <div className="corp-footer-bottom">
            <span>© {new Date().getFullYear()} NesAI. A brand of Nesma Holdings (Pty) Ltd.</span>
            <a href="mailto:hello@nesai.co.za">hello@nesai.co.za</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
