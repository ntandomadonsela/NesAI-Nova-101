import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpen,
  BrainCircuit,
  Check,
  ChevronRight,
  GraduationCap,
  Library,
  Menu,
  ShieldCheck,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NesAI — Intelligence, deployed at scale" },
      {
        name: "description",
        content:
          "Your personal AI study partner. Get clear, step-by-step help across subjects, exam papers and study notes.",
      },
    ],
  }),
  component: HomePage,
});

const subjects = [
  "Mathematics",
  "Physical sciences",
  "Commerce",
  "Law",
  "Humanities",
  "Study skills",
];
const tools = [
  {
    icon: BrainCircuit,
    title: "Tutoring that gets you",
    text: "Ask a question, explore the steps, and keep going until the idea clicks.",
  },
  {
    icon: Library,
    title: "A library built for exams",
    text: "Find past papers, memos and notes, then bring any resource into your study chat.",
  },
  {
    icon: Zap,
    title: "Your pace. Your plan.",
    text: "Get focused support whenever you study, with tutors for the subjects you care about.",
  },
];

function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="nesai-home">
      <header className="nesai-header">
        <div className="nesai-wrap header-inner">
          <Link to="/" className="brand-lockup" aria-label="NesAI home">
            <img src="/nesai-symbol.png" alt="" />
            <span>
              Nes<span>AI</span>
              <small>INTELLIGENCE, DEPLOYED AT SCALE</small>
            </span>
          </Link>
          <button
            className="mobile-menu"
            aria-label="Toggle navigation"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X /> : <Menu />}
          </button>
          <nav className={menuOpen ? "main-nav is-open" : "main-nav"}>
            <a href="#platform" onClick={() => setMenuOpen(false)}>
              Platform
            </a>
            <a href="#subjects" onClick={() => setMenuOpen(false)}>
              Subjects
            </a>
            <Link to="/vault" onClick={() => setMenuOpen(false)}>
              Resource vault
            </Link>
            <Link to="/auth" className="nav-signin" onClick={() => setMenuOpen(false)}>
              Sign in
            </Link>
            <Link
              to="/auth"
              search={{ mode: "signup" }}
              className="nav-cta"
              onClick={() => setMenuOpen(false)}
            >
              Start learning <ArrowRight size={15} />
            </Link>
          </nav>
        </div>
      </header>
      <main>
        <section className="nesai-hero">
          <div className="hero-orb orb-one" />
          <div className="hero-orb orb-two" />
          <div className="nesai-wrap hero-grid">
            <div className="hero-copy">
              <div className="hero-kicker">
                <span className="live-dot" /> YOUR NEXT BREAKTHROUGH STARTS HERE
              </div>
              <h1>
                Make room for
                <br />
                <span>the “aha” moment.</span>
              </h1>
              <p className="hero-lead">
                Meet your AI study partner. Get unstuck, understand the why, and move forward with
                confidence.
              </p>
              <div className="hero-buttons">
                <Link to="/auth" search={{ mode: "signup" }} className="primary-button">
                  Start learning for free <ArrowRight size={17} />
                </Link>
                <Link to="/vault" className="secondary-button">
                  <BookOpen size={17} /> Explore the resource vault
                </Link>
              </div>
              <div className="hero-proof">
                <div className="proof-icon">
                  <ShieldCheck size={16} />
                </div>
                <span>Built for curious minds. Ready when you are.</span>
              </div>
            </div>
            <div className="hero-visual">
              <div className="visual-glow" />
              <div className="study-card">
                <div className="study-card-top">
                  <div className="mini-brand">
                    <img className="mini-mark" src="/nesai-symbol.png" alt="NesAI logo" />
                    <span>
                      NesAI <small>STUDY DESK</small>
                    </span>
                  </div>
                  <span className="online-status">
                    <i /> ONLINE
                  </span>
                </div>
                <div className="card-rule" />
                <div className="tutor-label">
                  <span className="tutor-avatar">
                    <GraduationCap size={18} />
                  </span>
                  <div>
                    <strong>Your Math Tutor</strong>
                    <small>Ready to work it through with you</small>
                  </div>
                  <Sparkles className="sparkle-icon" size={18} />
                </div>
                <div className="chat-bubble tutor-bubble">
                  Let’s solve this one together. What have you tried so far?
                </div>
                <div className="chat-bubble learner-bubble">
                  Can you explain the quadratic formula?
                </div>
                <div className="answer-card">
                  <div className="answer-heading">
                    <span className="answer-check">
                      <Check size={13} />
                    </span>{" "}
                    Start with the standard form
                  </div>
                  <p>
                    For <b>ax² + bx + c = 0</b>, the solutions are:
                  </p>
                  <div className="equation">
                    x = <span>−b ± √(b² − 4ac)</span>
                    <i>2a</i>
                  </div>
                  <div className="answer-hint">
                    <Sparkles size={13} /> We’ll break down each part next.
                  </div>
                </div>
                <div className="composer-preview">
                  <span>Ask a follow-up…</span>
                  <span className="send-circle">
                    <ArrowRight size={15} />
                  </span>
                </div>
              </div>
              <div className="floating-note">
                <span className="note-icon">
                  <Check size={15} />
                </span>
                <span>
                  <b>One step at a time</b>
                  <small>Learning that sticks</small>
                </span>
              </div>
              <div className="float-spark">✦</div>
            </div>
          </div>
          <div className="hero-bottom nesai-wrap">
            <span>PERSONALIZED SUPPORT</span>
            <span className="bottom-line" />
            <span>MADE FOR THE WAY YOU LEARN</span>
          </div>
        </section>
        <section className="trust-strip">
          <div className="nesai-wrap trust-inner">
            <span>ONE STUDY SPACE, READY FOR</span>
            {subjects.slice(0, 5).map((s) => (
              <b key={s}>{s}</b>
            ))}
          </div>
        </section>
        <section className="platform-section nesai-wrap" id="platform">
          <div className="section-intro">
            <div className="section-kicker">A SMARTER WAY TO STUDY</div>
            <h2>
              Big questions.
              <br />
              <span>Clear next steps.</span>
            </h2>
            <p>Bring your curiosity. NesAI helps turn the hard bits into progress you can feel.</p>
            <Link to="/auth" className="inline-link">
              Meet your study partner <ArrowRight size={16} />
            </Link>
          </div>
          <div className="feature-stack">
            {tools.map((item, i) => {
              const Icon = item.icon;
              return (
                <article className="feature-card" key={item.title}>
                  <div className="feature-number">0{i + 1}</div>
                  <div className="feature-icon">
                    <Icon size={21} />
                  </div>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.text}</p>
                  </div>
                  <ChevronRight className="feature-arrow" size={19} />
                </article>
              );
            })}
          </div>
        </section>
        <section className="subject-section" id="subjects">
          <div className="nesai-wrap subject-layout">
            <div>
              <div className="section-kicker">YOUR SUBJECTS, YOUR WAY</div>
              <h2>
                Every subject has
                <br />a <span>starting point.</span>
              </h2>
              <p>Choose a specialist tutor and start with the question in front of you.</p>
            </div>
            <div className="subject-grid">
              {subjects.map((s, i) => (
                <Link
                  to="/chat"
                  search={{
                    agent: ["math", "science", "commerce", "law", "humanities", "general"][i],
                  }}
                  className="subject-pill"
                  key={s}
                >
                  <span className="subject-index">0{i + 1}</span>
                  {s}
                  <ArrowRight size={15} />
                </Link>
              ))}
            </div>
          </div>
        </section>
        <section className="cta-section">
          <div className="nesai-wrap cta-panel">
            <div className="cta-spark">✦</div>
            <div className="section-kicker">YOUR STUDY DESK IS WAITING</div>
            <h2>
              Let’s make sense
              <br />
              of <span>what’s next.</span>
            </h2>
            <p>
              Sign in to pick up where you left off, or create your free account and ask your first
              question.
            </p>
            <Link to="/auth" search={{ mode: "signup" }} className="primary-button">
              Get started <ArrowRight size={17} />
            </Link>
            <div className="cta-decoration" />
          </div>
        </section>
      </main>
      <footer className="nesai-footer">
        <div className="nesai-wrap footer-main">
          <Link to="/" className="footer-logo">
            <img src="/nesai-symbol.png" alt="" />
            <span>
              Nes<span>AI</span>
            </span>
          </Link>
          <p>Intelligence, deployed at scale.</p>
          <div className="footer-links">
            <Link to="/vault">Resource vault</Link>
            <Link to="/upgrade">Premium</Link>
            <Link to="/auth">Sign in</Link>
          </div>
        </div>
        <div className="nesai-wrap footer-bottom">
          <span>© {new Date().getFullYear()} NesAI. Learn something new today.</span>
          <span>Built for learners, everywhere.</span>
        </div>
      </footer>
    </div>
  );
}
