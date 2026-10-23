const galleryViews = [
  { title: "Proposed village concept", note: "Original architectural concept · not an existing site", image: "assets/proposed-village-concept.svg", alt: "Illustrated proposed modular village", concept: true },
  { title: "Single studio concept", note: "Original interior concept · subject to final design", image: "assets/studio-concept.svg", alt: "Illustrated proposed studio interior", concept: true },
  { title: "Split-suite layout", note: "Illustrative 36 square metre plan concept", image: "assets/split-layout-concept.svg", alt: "Illustrated two-bedroom modular suite plan", concept: true },
  { title: "Modular assembly", note: "Exploded construction concept · not a final technical drawing", image: "assets/modular-exploded-concept.svg", alt: "Illustrated modular building assembly", concept: true },
];
const unitInfo = {
  single: {
    kicker: "YOUR OWN SPACE",
    title: "The Executive<br/>Single Studio",
    intro: "An independent, light-filled studio with everything in its right place.",
    specs: ["Furnished bedroom & private ensuite", "Built-in desk and storage", "Compact kitchenette", "Acoustic wall insulation"],
    image: "assets/studio-concept.svg",
  },
  split: {
    kicker: "ROOM TO SHARE",
    title: "The Split<br/>Dual Suite",
    intro: "Two lockable private bedrooms, joined by a shared kitchen and dining nook.",
    specs: ["Two private bedroom pods", "Shared central kitchenette", "Dining nook & dual bathrooms", "Lockable rooms for privacy"],
    image: "assets/split-layout-concept.svg",
  },
};
let galleryIndex = 0;

function setGallery(index) {
  galleryIndex = (index + galleryViews.length) % galleryViews.length;
  const item = galleryViews[galleryIndex];
  const galleryArt = document.querySelector(".gallery-art");
  galleryArt.src = item.image;
  galleryArt.alt = item.alt;
  document.querySelector(".gallery-count").textContent = `0${galleryIndex + 1} / 0${galleryViews.length}`;
  document.querySelector(".gallery-copy b").textContent = item.title;
  document.querySelector(".gallery-copy small").textContent = item.note;
  document.querySelector(".gallery-concept-tag").hidden = !item.concept;
  document.querySelectorAll(".gallery-dots button").forEach((dot, i) => dot.classList.toggle("selected", i === galleryIndex));
}

document.querySelectorAll(".gallery-controls button").forEach((button) => button.addEventListener("click", () => setGallery(galleryIndex + Number(button.dataset.dir))));
const dots = document.querySelector(".gallery-dots");
galleryViews.forEach((view, index) => {
  const dot = document.createElement("button");
  dot.type = "button";
  dot.setAttribute("aria-label", `Show ${view.title}`);
  dot.addEventListener("click", () => setGallery(index));
  dots.append(dot);
});
setGallery(0);

const campusText = {
  Potchefstroom: ["POTCHEFSTROOM · NORTH WEST", "Flagship development proposal", "Concept-stage vision; timing and delivery remain indicative."],
  Stellenbosch: ["STELLENBOSCH · WESTERN CAPE", "Potential future campus", "Proposed location only; plans are not yet confirmed."],
  Pretoria: ["PRETORIA · GAUTENG", "Potential future campus", "Proposed location only; plans are not yet confirmed."],
  "Other hubs": ["NATIONAL NETWORK CONCEPT", "Potential future campuses", "Share where you would like to see a village."],
};
document.querySelectorAll("[data-campus]").forEach((tab) => tab.addEventListener("click", () => {
  document.querySelectorAll("[data-campus]").forEach((other) => {
    const active = other === tab;
    other.classList.toggle("selected", active);
    other.setAttribute("aria-selected", String(active));
  });
  const [region, title, note] = campusText[tab.dataset.campus];
  document.querySelector(".campus-region").textContent = region;
  document.querySelector(".campus-note b").textContent = title;
  document.querySelector(".campus-note small").textContent = note;
  document.querySelector('select[name="campus"]').value = tab.dataset.campus;
}));

document.querySelectorAll("[data-unit]").forEach((tab) => tab.addEventListener("click", () => {
  document.querySelectorAll("[data-unit]").forEach((other) => {
    const active = other === tab;
    other.classList.toggle("selected", active);
    other.setAttribute("aria-selected", String(active));
  });
  const type = tab.dataset.unit;
  const info = unitInfo[type];
  document.querySelector(".unit-kicker").textContent = info.kicker;
  document.querySelector(".unit-info h3").innerHTML = info.title;
  document.querySelector(".unit-intro").textContent = info.intro;
  document.querySelector(".unit-art").hidden = type !== "single";
  document.querySelector(".layout-art").hidden = type !== "split";
  const list = document.querySelector(".unit-specs");
  list.replaceChildren(...info.specs.map((spec) => {
    const item = document.createElement("li");
    item.textContent = `✓  ${spec}`;
    return item;
  }));
  document.querySelector('select[name="unit"]').value = type === "single" ? "Executive single studio" : "Split dual suite";
}));
document.querySelector('[data-unit="single"]').click();

const menuButton = document.querySelector(".menu-toggle");
const nav = document.querySelector(".nav-links");
menuButton.addEventListener("click", () => {
  const open = nav.classList.toggle("open");
  menuButton.setAttribute("aria-expanded", String(open));
});
nav.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => {
  nav.classList.remove("open");
  menuButton.setAttribute("aria-expanded", "false");
}));

document.querySelector("#waitlist-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const name = new FormData(form).get("name").toString().trim().split(/\s+/)[0];
  const notice = document.querySelector(".form-notice");
  notice.textContent = `Thanks, ${name}. This proposal preview doesn't send or save enquiries yet; connect the waitlist form to your CRM before launch.`;
  notice.classList.add("visible");
  form.reset();
});
