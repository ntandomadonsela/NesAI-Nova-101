import { useState, type FormEvent, type CSSProperties } from "react";
import {
  ArrowDownRight,
  ArrowRight,
  AudioLines,
  Boxes,
  BrainCircuit,
  Check,
  ChevronDown,
  Code2,
  GraduationCap,
  Layers3,
  Menu,
  Network,
  Play,
  ShieldCheck,
  Sparkles,
  WandSparkles,
  X,
} from "lucide-react";

const demos = {
  Text: {
    icon: BrainCircuit,
    input: '"The support was friendly, but I waited three days for a reply."',
    rows: [
      ["sentiment", "Mixed"],
      ["resolution", "Unresolved"],
      ["key phrase", "three days"],
    ],
    colour: "#1765fa",
  },
  Image: {
    icon: Layers3,
    input: "Street scene · frame 0142.jpg",
    rows: [
      ["vehicle", "car"],
      ["pedestrian", "person"],
      ["scene", "urban · daylight"],
    ],
    colour: "#1765fa",
  },
  Audio: {
    icon: AudioLines,
    input: "Speaker 01 · 00:04.820–00:07.110",
    rows: [
      ["transcript", "Turn left at the next street."],
      ["language", "English · en-ZA"],
      ["speaker", "Speaker 01"],
    ],
    colour: "#1765fa",
  },
  "3D / LiDAR": {
    icon: Boxes,
    input: "Sequence 003 · 128 point-cloud frames",
    rows: [
      ["tracked object", "vehicle · track 004"],
      ["trajectory", "path segment 08"],
      ["action", "grasp"],
    ],
    colour: "#1765fa",
  },
} as const;
type DemoType = keyof typeof demos;
type Enquiry = {
  name: string;
  email: string;
  company: string;
  interest: string;
  size: string;
  message: string;
};

export function CorporateHome() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [demoType, setDemoType] = useState<DemoType>("Text");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<Enquiry>({
    name: "",
    email: "",
    company: "",
    interest: "Data annotation",
    size: "",
    message: "",
  });
  const activeDemo = demos[demoType];
  const DemoIcon = activeDemo.icon;

  async function submitEnquiry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const website = String(new FormData(event.currentTarget).get("website") ?? "");
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          interest: form.interest,
          company: form.company,
          dataset_size: form.size,
          message: form.message,
          website,
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "We could not send your enquiry. Please try again.");
      setSent(true);
      setForm({
        name: "",
        email: "",
        company: "",
        interest: "Data annotation",
        size: "",
        message: "",
      });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "We could not send your enquiry. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  const update = (key: keyof Enquiry, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  return (
    <div className="corporate-home">
      <a className="corp-skip-link" href="#main-content">
        Skip to main content
      </a>
      <header className="corp-header">
        <div className="corp-container corp-nav">
          <a className="corp-brand" href="#top" aria-label="NesAI home">
            <img src="/nesai-brand.png" alt="NesAI — Intelligence, Deployed at Scale" />
          </a>
          <button
            className="corp-mobile-toggle"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={menuOpen}
            aria-controls="primary-navigation"
          >
            {menuOpen ? <X /> : <Menu />}
          </button>
          <nav id="primary-navigation" className={menuOpen ? "corp-links open" : "corp-links"}>
            <a href="/enterprise-ai-data" onClick={() => setMenuOpen(false)}>
              Enterprise services
            </a>
            <a href="#workflow" onClick={() => setMenuOpen(false)}>
              How we work
            </a>
            <a href="#ecosystem" onClick={() => setMenuOpen(false)}>
              Our ecosystem
            </a>
            <a href="/marketplace">
              Marketplace <ArrowDownRight size={13} />
            </a>
            <div className="corp-nav-ctas">
              <a className="corp-portal-link" href="/auth?mode=signup">
                <GraduationCap size={15} /> Student portal
              </a>
              <a
                className="corp-annotator-link"
                href="https://marketplace.nesai.co.za/?workspace=talent"
              >
                Annotator sign-up
              </a>
              <a className="corp-button corp-button-small" href="#contact">
                Request a demo <ArrowRight size={14} />
              </a>
            </div>
          </nav>
        </div>
      </header>

      <main id="main-content">
        <section className="corp-hero" id="top">
          <div className="corp-grid-glow" aria-hidden="true" />
          <div className="corp-container corp-hero-grid">
            <div className="corp-hero-copy">
              <div className="corp-eyebrow">
                <span /> DATA OPERATIONS FOR AI TEAMS
              </div>
              <h1>
                Human-led data.
                <br />
                <em>Built for AI.</em>
              </h1>
              <p className="corp-hero-lead">
                NesAI helps teams create, review and evaluate the data behind AI systems, with
                trained contributors and workflows shaped around the work.
              </p>
              <div className="corp-hero-actions">
                <a href="#contact" className="corp-button">
                  Talk to our team <ArrowRight size={16} />
                </a>
                <a href="#workflow" className="corp-text-link">
                  See how we work <ArrowDownRight size={16} />
                </a>
              </div>
              <div className="corp-hero-foot">
                <span>
                  <ShieldCheck size={15} /> Expert-led data workflows
                </span>
                <span>Based in South Africa. Built for global teams.</span>
              </div>
            </div>
            <div
              className="corp-product-preview"
              aria-label="Illustrative NesAI 3D trajectory annotation task"
            >
              <div className="corp-product-bar">
                <div>
                  <span className="corp-product-mark">
                    <Layers3 size={15} />
                  </span>
                  <span>
                    <b>TRAJECTORY REVIEW</b>
                    <small>ILLUSTRATIVE TASK · SEQUENCE 0142</small>
                  </span>
                </div>
                <span className="corp-sample-badge">
                  <i /> SAMPLE
                </span>
              </div>
              <div className="corp-product-body">
                <div className="corp-scene-panel">
                  <div className="corp-scene-label">
                    <span>SIMULATION VIEW</span>
                    <span>FRAME 018 / 240</span>
                  </div>
                  <svg
                    className="corp-trajectory-scene"
                    viewBox="0 0 480 300"
                    role="img"
                    aria-label="Sample 3D trajectory plotted over a ground grid"
                  >
                    <defs>
                      <linearGradient id="trajectoryPath" x1="0" x2="1">
                        <stop offset="0" stopColor="#168ce8" />
                        <stop offset="1" stopColor="#7540e7" />
                      </linearGradient>
                      <pattern id="grid" width="28" height="18" patternUnits="userSpaceOnUse">
                        <path d="M 28 0 L 0 0 0 18" fill="none" stroke="#dce4f2" strokeWidth="1" />
                      </pattern>
                    </defs>
                    <path d="M30 110 240 24 450 110 240 198Z" fill="url(#grid)" stroke="#d3dced" />
                    <path
                      d="M30 110v90l210 78v-80M240 198v80M450 110v90l-210 78"
                      fill="url(#grid)"
                      stroke="#d3dced"
                    />
                    <path
                      d="M92 148 C145 162 162 101 218 122 S290 157 334 111 S388 77 417 88"
                      fill="none"
                      stroke="url(#trajectoryPath)"
                      strokeWidth="5"
                      strokeLinecap="round"
                      strokeDasharray="8 7"
                    />
                    <circle cx="92" cy="148" r="8" fill="#0785e7" />
                    <circle cx="218" cy="122" r="8" fill="#4560e5" />
                    <circle cx="334" cy="111" r="8" fill="#683fe6" />
                    <circle cx="417" cy="88" r="9" fill="#7540e7" />
                    <g transform="translate(242 137)">
                      <path d="m0 13 22-9 22 9-22 10Z" fill="#e7edff" stroke="#6379d9" />
                      <path d="M0 13v27l22 10V23Z" fill="#d9e5ff" stroke="#6379d9" />
                      <path d="M44 13v27L22 50V23Z" fill="#c8d7ff" stroke="#6379d9" />
                    </g>
                  </svg>
                  <div className="corp-scene-legend">
                    <span>
                      <i /> AGENT PATH
                    </span>
                    <span>
                      <i /> TARGET OBJECT
                    </span>
                    <span>SIMULATED ENVIRONMENT</span>
                  </div>
                </div>
                <div className="corp-json-panel">
                  <div className="corp-json-heading">
                    <span>ANNOTATION OUTPUT</span>
                    <span>
                      <Check size={12} /> VALID JSON
                    </span>
                  </div>
                  <pre aria-label="Sample structured annotation JSON">
                    <code>{`{
  "task_id": "sample-0142",
  "agent": "robot_01",
  "actions": [
    {
      "type": "navigate",
      "target": "object_03",
      "frame_range": [18, 64]
    },
    {
      "type": "grasp",
      "result": "success"
    }
  ],
  "review": {
    "status": "approved"
  }
}`}</code>
                  </pre>
                  <div className="corp-json-foot">
                    <span>
                      <Check size={12} /> Schema checked
                    </span>
                    <span>JSONL · 1 record</span>
                  </div>
                </div>
              </div>
              <div className="corp-product-timeline">
                <span>EVENT TIMELINE</span>
                <div>
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                </div>
                <span>00:02.840 — 00:04.120</span>
              </div>
              <div className="corp-product-caption">
                Sample interface and data only · Illustrative, not a client deliverable
              </div>
            </div>
          </div>
          <div className="corp-container corp-hero-index">
            <span>01 — INTELLIGENCE, BUILT TO SCALE</span>
            <span>
              SCROLL TO EXPLORE <ChevronDown size={14} />
            </span>
          </div>
        </section>

        <section className="corp-trust">
          <div className="corp-container corp-trust-inner">
            <span>THE WORK WE DO</span>
            <b>DATA CREATION</b>
            <i />
            <b>ANNOTATION</b>
            <i />
            <b>MODEL EVALUATION</b>
            <i />
            <b>QUALITY REVIEW</b>
          </div>
        </section>

        <section className="corp-section corp-services" id="services">
          <div className="corp-container">
            <div className="corp-section-head">
              <div>
                <div className="corp-eyebrow dark">
                  <span /> OUR SERVICES
                </div>
                <h2>
                  Data operations for
                  <br />
                  <em>teams building AI.</em>
                </h2>
              </div>
              <p>
                We plan and run the human work behind training data, model evaluation and quality
                review.
              </p>
            </div>
            <div className="corp-service-grid">
              <article className="corp-service-card service-featured">
                <div className="corp-card-index">01 / DATA</div>
                <span className="corp-service-icon">
                  <Layers3 />
                </span>
                <h3>
                  Data annotation
                  <br />& generation
                </h3>
                <p>
                  Purpose-built datasets that give your models the context, coverage and precision
                  they need.
                </p>
                <ul>
                  <li>Computer vision & segmentation</li>
                  <li>Speech, language & multimodal data</li>
                  <li>3D trajectories & computer use</li>
                </ul>
                <a href="#contact">
                  Build your dataset <ArrowRight size={15} />
                </a>
                <div className="corp-card-glow" />
              </article>
              <article className="corp-service-card">
                <div className="corp-card-index">02 / ALIGNMENT</div>
                <span className="corp-service-icon">
                  <Sparkles />
                </span>
                <h3>
                  RLHF & model
                  <br />
                  evaluation
                </h3>
                <p>
                  Expert preference data and rigorous evaluation that make model behaviour more
                  useful, safe and aligned.
                </p>
                <ul>
                  <li>Preference ranking & response review</li>
                  <li>Red teaming & safety assessment</li>
                  <li>Domain-specific benchmarks</li>
                </ul>
                <a href="#contact">
                  Improve model quality <ArrowRight size={15} />
                </a>
              </article>
              <article className="corp-service-card">
                <div className="corp-card-index">03 / SYSTEMS</div>
                <span className="corp-service-icon">
                  <Network />
                </span>
                <h3>
                  AI solutions
                  <br />& integration
                </h3>
                <p>
                  Move from experimentation to working systems with practical AI engineering and
                  integration support.
                </p>
                <ul>
                  <li>Custom AI workflow design</li>
                  <li>Model and data pipeline integration</li>
                  <li>Applied research & advisory</li>
                </ul>
                <a href="#contact">
                  Explore a solution <ArrowRight size={15} />
                </a>
              </article>
            </div>
          </div>
        </section>

        <section className="corp-section corp-usecases">
          <div className="corp-container">
            <div className="corp-section-head">
              <div>
                <div className="corp-eyebrow dark">
                  <span /> DATA FOR REAL-WORLD AI
                </div>
                <h2>
                  Work shaped around
                  <br />
                  <em>the model’s needs.</em>
                </h2>
              </div>
              <p>
                Different systems need different evidence. We shape collection and review around the
                behaviour you need your model to learn.
              </p>
            </div>
            <div className="corp-usecase-grid">
              <article>
                <span>
                  <Boxes />
                </span>
                <div>
                  <h3>Robotics and embodied AI</h3>
                  <p>
                    First-person task recordings, action labels, trajectories and environment
                    context.
                  </p>
                </div>
              </article>
              <article>
                <span>
                  <Layers3 />
                </span>
                <div>
                  <h3>Computer vision</h3>
                  <p>
                    Image and video labels, object tracking, segmentation and scene descriptions.
                  </p>
                </div>
              </article>
              <article>
                <span>
                  <BrainCircuit />
                </span>
                <div>
                  <h3>Language model evaluation</h3>
                  <p>
                    Prompt and response review, preference comparisons, safety checks and reasoning
                    tasks.
                  </p>
                </div>
              </article>
              <article>
                <span>
                  <AudioLines />
                </span>
                <div>
                  <h3>Speech and multimodal systems</h3>
                  <p>
                    Transcription, language and speaker labels, with aligned media and event
                    metadata.
                  </p>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="corp-section corp-quality">
          <div className="corp-container">
            <div className="corp-section-head">
              <div>
                <div className="corp-eyebrow dark">
                  <span /> QUALITY BY DESIGN
                </div>
                <h2>
                  Good data starts
                  <br />
                  with <em>clear standards.</em>
                </h2>
              </div>
              <p>
                Set expectations before work begins. Keep contributor guidance, qualification and
                review connected to your project requirements.
              </p>
            </div>
            <div className="corp-quality-grid">
              <article>
                <span>01</span>
                <div>
                  <h3>Instructions for the task</h3>
                  <p>
                    Turn project rules and examples into practical guidance contributors can follow.
                  </p>
                </div>
              </article>
              <article>
                <span>02</span>
                <div>
                  <h3>Qualification before access</h3>
                  <p>Use project-specific knowledge checks to prepare contributors for the work.</p>
                </div>
              </article>
              <article>
                <span>03</span>
                <div>
                  <h3>Review against agreed criteria</h3>
                  <p>Set review expectations and independent checks to match the quality bar.</p>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="corp-demo-section">
          <div className="corp-container corp-demo-layout">
            <div className="corp-demo-copy">
              <div className="corp-eyebrow">
                <span /> EXAMPLE WORKFLOW
              </div>
              <h2>
                From source material
                <br />
                to <em>reviewed data.</em>
              </h2>
              <p>
                See how a contributor turns a source item into a structured annotation. Choose a
                data type to view a sample.
              </p>
              <div className="corp-demo-points">
                <span>
                  <Check /> Clear task criteria
                </span>
                <span>
                  <Check /> Structured responses
                </span>
                <span>
                  <Check /> Ready for review
                </span>
              </div>
              <a href="#contact" className="corp-text-link">
                Discuss your requirements <ArrowRight size={15} />
              </a>
            </div>
            <div className="corp-demo-card">
              <div className="corp-demo-head">
                <div>
                  <span className="corp-window-dots">
                    <i />
                    <i />
                    <i />
                  </span>
                  <b>NESAI / ANNOTATION PREVIEW</b>
                </div>
                <span className="corp-demo-live">
                  <i /> INTERACTIVE
                </span>
              </div>
              <div
                className="corp-demo-tabs"
                role="group"
                aria-label="Choose a data annotation demonstration"
              >
                {(Object.keys(demos) as DemoType[]).map((name) => (
                  <button
                    key={name}
                    type="button"
                    aria-pressed={demoType === name}
                    onClick={() => setDemoType(name)}
                  >
                    {name}
                  </button>
                ))}
              </div>
              <div
                className="corp-demo-content"
                key={demoType}
                style={{ "--demo-accent": activeDemo.colour } as CSSProperties}
              >
                <div className="corp-demo-input">
                  <div className="corp-demo-label">
                    <span>01</span> SOURCE ASSET <b>UNLABELLED</b>
                  </div>
                  <div className="corp-demo-input-box">
                    {demoType === "Image" ? (
                      <div className="corp-image-placeholder">
                        <div />
                        <div />
                        <span>FRAME 0142 · 1920 × 1080</span>
                      </div>
                    ) : demoType === "Audio" ? (
                      <div className="corp-wave">
                        <AudioLines />
                        <span>
                          {Array.from({ length: 32 }, (_, i) => (
                            <i key={i} style={{ height: `${15 + ((i * 17) % 38)}px` }} />
                          ))}
                        </span>
                      </div>
                    ) : demoType === "3D / LiDAR" ? (
                      <div className="corp-point-cloud">
                        {Array.from({ length: 48 }, (_, i) => (
                          <i
                            key={i}
                            style={{
                              left: `${(i * 37) % 100}%`,
                              top: `${(i * 53) % 100}%`,
                              opacity: 0.35 + ((i * 7) % 60) / 100,
                            }}
                          />
                        ))}
                        <span>SEQUENCE 003 · SPATIAL VIEW</span>
                      </div>
                    ) : (
                      <>
                        <code>{activeDemo.input}</code>
                        <span className="corp-token-mark">
                          {activeDemo.input.split(" ").slice(3, 6).join(" ")}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="corp-demo-connector">
                  <span />
                  <i>
                    <ArrowRight size={14} />
                  </i>
                  <span />
                </div>
                <div className="corp-demo-output">
                  <div className="corp-demo-label">
                    <span>02</span> EXPERT ANNOTATION{" "}
                    <b>
                      <DemoIcon size={12} /> STRUCTURED
                    </b>
                  </div>
                  <div className="corp-output-list">
                    {activeDemo.rows.map(([label, value], index) => (
                      <div
                        key={`${demoType}-${label}`}
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <span>{label}</span>
                        <b>{value}</b>
                        <Check />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="corp-demo-foot">
                <span>
                  <WandSparkles size={14} /> Illustrative example · sample data
                </span>
                <button
                  onClick={() => {
                    const names = Object.keys(demos) as DemoType[];
                    setDemoType(names[(names.indexOf(demoType) + 1) % names.length]);
                  }}
                >
                  <Play size={13} /> Try another example
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="corp-section corp-workflow" id="workflow">
          <div className="corp-container">
            <div className="corp-section-head">
              <div>
                <div className="corp-eyebrow dark">
                  <span /> HOW AN ENGAGEMENT RUNS
                </div>
                <h2>
                  A process built for
                  <br />
                  <em>the work at hand.</em>
                </h2>
              </div>
              <p>
                We agree the scope and quality bar first, then set up the tasks, contributor
                guidance and review process around your data.
              </p>
            </div>
            <div className="corp-steps">
              {[
                [
                  "01",
                  "Agree the scope",
                  "Set the outcome, data, timeline and acceptance criteria with your team.",
                ],
                [
                  "02",
                  "Prepare the workflow",
                  "Write task guidance, set contributor requirements and calibrate reviewers.",
                ],
                [
                  "03",
                  "Run and review",
                  "Manage the work, check quality and resolve disagreements against your criteria.",
                ],
                [
                  "04",
                  "Deliver the data",
                  "Provide agreed outputs and capture findings for the next iteration.",
                ],
              ].map(([number, title, description]) => (
                <article key={number}>
                  <span>{number}</span>
                  <div>
                    <b>{title}</b>
                    <p>{description}</p>
                  </div>
                  <ArrowDownRight />
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="corp-ecosystem" id="ecosystem">
          <div className="corp-container">
            <div className="corp-section-head">
              <div>
                <div className="corp-eyebrow">
                  <span /> NESAI PLATFORMS
                </div>
                <h2>
                  People and platforms
                  <br />
                  <em>for AI work.</em>
                </h2>
              </div>
              <p>
                Our enterprise services, contributor marketplace and student platform support
                different parts of the NesAI community.
              </p>
            </div>
            <div className="corp-ecosystem-grid">
              <a href="/enterprise-ai-data" className="corp-eco-card">
                <span>FOR ENTERPRISE</span>
                <BrainCircuit />
                <h3>Build better AI</h3>
                <p>Work with NesAI on data, evaluation, alignment and applied AI solutions.</p>
                <b>
                  Talk to our team <ArrowRight />
                </b>
                <i>01</i>
              </a>
              <a href="/marketplace" className="corp-eco-card">
                <span>BUYERS & SELLERS</span>
                <Boxes />
                <h3>Explore the marketplace</h3>
                <p>Discover AI assets, specialist workflows and opportunities to contribute.</p>
                <b>
                  Visit NesAI Marketplace <ArrowRight />
                </b>
                <i>02</i>
              </a>
              <a href="/students" className="corp-eco-card">
                <span>STUDENTS & ACADEMIA</span>
                <GraduationCap />
                <h3>Learn with NesAI</h3>
                <p>Access study support and explore the ideas shaping a new generation of AI.</p>
                <b>
                  Open the student portal <ArrowRight />
                </b>
                <i>03</i>
              </a>
            </div>
          </div>
        </section>

        <section className="corp-workforce">
          <div className="corp-container corp-workforce-inner">
            <div>
              <div className="corp-eyebrow">
                <span /> CONTRIBUTE YOUR EXPERTISE
              </div>
              <h2>
                Careful work makes
                <br />
                better <em>training data.</em>
              </h2>
              <p>
                Contributors work on projects that match their skills and complete the required
                onboarding and qualifications.
              </p>
            </div>
            <div className="corp-workforce-right">
              <div className="corp-workforce-perks">
                <span>
                  <Check /> Guided onboarding
                </span>
                <span>
                  <Check /> Skills-based qualification
                </span>
                <span>
                  <Check /> Project-based opportunities
                </span>
              </div>
              <a
                className="corp-button corp-button-light"
                href="https://marketplace.nesai.co.za/?workspace=talent"
              >
                View contributor projects <ArrowRight />
              </a>
              <small>Project access depends on requirements and qualification.</small>
            </div>
            <div className="corp-workforce-mark">
              <Code2 />
            </div>
          </div>
        </section>

        <section className="corp-contact" id="contact">
          <div className="corp-container corp-contact-grid">
            <div className="corp-contact-copy">
              <div className="corp-eyebrow dark">
                <span /> ENTERPRISE ENQUIRY
              </div>
              <h2>
                Tell us what your
                <br />
                team is <em>building.</em>
              </h2>
              <p>
                Share the problem, data and outcome you have in mind. The NesAI team will follow up
                to discuss scope and next steps.
              </p>
              <div className="corp-contact-aside">
                <span>
                  <ShieldCheck /> Your details stay with the NesAI team.
                </span>
                <span>
                  <ArrowDownRight /> We’ll respond about this enquiry.
                </span>
              </div>
            </div>
            <form className="corp-lead-form" onSubmit={(event) => void submitEnquiry(event)}>
              <div className="corp-form-title">
                <span>PROJECT ENQUIRY / 01</span>
                <b>
                  Request a consultation <ArrowRight />
                </b>
              </div>
              {sent ? (
                <div className="corp-form-success">
                  <span>
                    <Check />
                  </span>
                  <h3>Thank you. We have your enquiry.</h3>
                  <p>The NesAI team will be in touch to discuss your project.</p>
                  <button type="button" onClick={() => setSent(false)}>
                    Send another enquiry
                  </button>
                </div>
              ) : (
                <>
                  <div className="corp-honeypot" aria-hidden="true">
                    <label htmlFor="lead-website">Leave this field empty</label>
                    <input
                      id="lead-website"
                      name="website"
                      type="text"
                      tabIndex={-1}
                      autoComplete="off"
                    />
                  </div>
                  <div className="corp-form-row">
                    <label>
                      Your name
                      <input
                        required
                        maxLength={160}
                        autoComplete="name"
                        value={form.name}
                        onChange={(event) => update("name", event.target.value)}
                        placeholder="Name and surname"
                      />
                    </label>
                    <label>
                      Work email
                      <input
                        required
                        maxLength={254}
                        type="email"
                        autoComplete="email"
                        value={form.email}
                        onChange={(event) => update("email", event.target.value)}
                        placeholder="you@company.com"
                      />
                    </label>
                  </div>
                  <div className="corp-form-row">
                    <label>
                      Company
                      <input
                        required
                        maxLength={200}
                        autoComplete="organization"
                        value={form.company}
                        onChange={(event) => update("company", event.target.value)}
                        placeholder="Company name"
                      />
                    </label>
                    <label>
                      What do you need?
                      <select
                        value={form.interest}
                        onChange={(event) => update("interest", event.target.value)}
                      >
                        <option>Data annotation</option>
                        <option>RLHF & model evaluation</option>
                        <option>Custom dataset generation</option>
                        <option>AI solutions & integration</option>
                        <option>Enterprise consulting</option>
                      </select>
                    </label>
                  </div>
                  <label>
                    Approximate dataset size
                    <input
                      maxLength={200}
                      value={form.size}
                      onChange={(event) => update("size", event.target.value)}
                      placeholder="e.g. 25,000 images or 400 hours of audio"
                    />
                  </label>
                  <label>
                    Tell us about the project
                    <textarea
                      required
                      maxLength={4000}
                      rows={4}
                      value={form.message}
                      onChange={(event) => update("message", event.target.value)}
                      placeholder="What are you building, and what would a good outcome look like?"
                    />
                  </label>
                  {error && (
                    <p className="corp-form-error" role="alert">
                      {error}
                    </p>
                  )}
                  <button className="corp-button corp-form-submit" disabled={busy}>
                    {busy ? "Sending enquiry…" : "Send project enquiry"}
                    <ArrowRight />
                  </button>
                  <small>
                    We’ll send your details to NesAI and our enquiry processing provider so we can
                    respond. For privacy questions, email{" "}
                    <a href="mailto:hello@nesai.co.za">hello@nesai.co.za</a>.
                  </small>
                </>
              )}
            </form>
          </div>
        </section>
      </main>

      <footer className="corp-footer">
        <div className="corp-container">
          <div className="corp-footer-main">
            <a className="corp-brand" href="#top" aria-label="NesAI home">
              <img src="/nesai-brand.png" alt="NesAI — Intelligence, Deployed at Scale" />
            </a>
            <p>Human intelligence for better AI.</p>
            <div className="corp-footer-links">
              <a href="/enterprise-ai-data">Enterprise AI data</a>
              <a href="/marketplace">Marketplace</a>
              <a href="https://marketplace.nesai.co.za/?workspace=talent">Contributor portal</a>
              <a href="/students">Students & academia</a>
              <a href="#contact">Enterprise contact</a>
            </div>
          </div>
          <div className="corp-footer-bottom">
            <span>
              © {new Date().getFullYear()} NesAI. All rights reserved. · A brand of Nesma Holdings
              (Pty) Ltd
            </span>
            <span>
              South Africa <i /> Working globally
            </span>
            <a href="mailto:hello@nesai.co.za">hello@nesai.co.za</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
