const header = document.querySelector("[data-header]");
const menuButton = document.querySelector(".menu-toggle");
const siteNav = document.querySelector(".site-nav");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function updateHeader() {
  header?.classList.toggle("scrolled", window.scrollY > 24);
}

function closeMenu() {
  if (!menuButton || !siteNav) return;
  menuButton.setAttribute("aria-expanded", "false");
  siteNav.classList.remove("open");
  document.body.classList.remove("menu-open");
}

menuButton?.addEventListener("click", () => {
  const isOpen = menuButton.getAttribute("aria-expanded") === "true";
  menuButton.setAttribute("aria-expanded", String(!isOpen));
  siteNav?.classList.toggle("open", !isOpen);
  document.body.classList.toggle("menu-open", !isOpen);
});

siteNav?.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));
window.addEventListener("scroll", updateHeader, { passive: true });
updateHeader();

const revealObserver = new IntersectionObserver(
  (entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("visible");
      observer.unobserve(entry.target);
    });
  },
  { threshold: 0.12, rootMargin: "0px 0px -5%" },
);

document.querySelectorAll(".reveal").forEach((element) => revealObserver.observe(element));

const stageCopy = [
  { state: "INGESTING", title: "Accepting file", detail: "Native, local mesh parser", progress: "22%" },
  { state: "EXTRACTING", title: "Reading geometry", detail: "Mesh · point cloud · voxel · views", progress: "48%" },
  { state: "COMPARING", title: "Layering evidence", detail: "Known matches · model scores", progress: "74%" },
  { state: "ROUTING", title: "Returning decision", detail: "Confidence · evidence · audit log", progress: "100%" },
];

const stageSteps = [...document.querySelectorAll("[data-system-step]")];
const stageState = document.querySelector("[data-stage-state]");
const stageTitle = document.querySelector("[data-stage-title]");
const stageDetail = document.querySelector("[data-stage-detail]");
const stageProgress = document.querySelector("[data-stage-progress]");

function setStage(index) {
  const copy = stageCopy[index];
  if (!copy) return;
  stageSteps.forEach((step, stepIndex) => step.classList.toggle("active", stepIndex === index));
  if (stageState) stageState.textContent = copy.state;
  if (stageTitle) stageTitle.textContent = copy.title;
  if (stageDetail) stageDetail.textContent = copy.detail;
  if (stageProgress) stageProgress.style.width = copy.progress;
}

stageSteps.forEach((step, index) => {
  step.addEventListener("mouseenter", () => setStage(index));
  step.addEventListener("focusin", () => setStage(index));
});

if (!reduceMotion && stageSteps.length) {
  let stageIndex = 0;
  window.setInterval(() => {
    stageIndex = (stageIndex + 1) % stageSteps.length;
    setStage(stageIndex);
  }, 2600);
}

const numberFormatter = new Intl.NumberFormat("en-US");

function animateCount(element) {
  const target = Number(element.dataset.count);
  if (!Number.isFinite(target)) return;
  const decimalPlaces = String(element.dataset.count).split(".")[1]?.length ?? 0;
  const duration = reduceMotion ? 0 : 1250;
  const start = performance.now();

  function frame(now) {
    const elapsed = Math.min(1, (now - start) / Math.max(duration, 1));
    const eased = 1 - Math.pow(1 - elapsed, 3);
    const value = target * eased;
    element.textContent = decimalPlaces
      ? value.toFixed(decimalPlaces)
      : numberFormatter.format(Math.round(value));
    if (elapsed < 1) requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

const metricObserver = new IntersectionObserver(
  (entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("counted");
      entry.target.querySelectorAll("[data-count]").forEach(animateCount);
      observer.unobserve(entry.target);
    });
  },
  { threshold: 0.45 },
);

document.querySelectorAll(".metric-card").forEach((card) => metricObserver.observe(card));

const year = document.querySelector("[data-year]");
if (year) year.textContent = new Date().getFullYear();
