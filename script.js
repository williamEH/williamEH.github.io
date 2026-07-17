const header = document.querySelector("[data-header]");
const menuButton = document.querySelector(".menu-toggle");
const menuLabel = menuButton?.querySelector(".sr-only");
const siteNav = document.querySelector(".site-nav");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function updateHeader() {
  header?.classList.toggle("scrolled", window.scrollY > 24);
}

function closeMenu() {
  if (!menuButton || !siteNav) return;
  menuButton.setAttribute("aria-expanded", "false");
  if (menuLabel) menuLabel.textContent = "Open navigation";
  siteNav.classList.remove("open");
  document.body.classList.remove("menu-open");
}

menuButton?.addEventListener("click", () => {
  const isOpen = menuButton.getAttribute("aria-expanded") === "true";
  menuButton.setAttribute("aria-expanded", String(!isOpen));
  if (menuLabel) menuLabel.textContent = isOpen ? "Open navigation" : "Close navigation";
  siteNav?.classList.toggle("open", !isOpen);
  document.body.classList.toggle("menu-open", !isOpen);
});

siteNav?.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || menuButton?.getAttribute("aria-expanded") !== "true") return;
  closeMenu();
  menuButton?.focus();
});
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

const policyData = {
  CA: {
    kind: "Direct blocking proposal",
    status: "Active · Senate Appropriations",
    statusClass: "status-active",
    title: "AB 2047",
    summary: "Would establish performance guidance and compliance requirements for firearm-blueprint detection technology in 3D printers.",
    link: "https://leginfo.legislature.ca.gov/faces/billStatusClient.xhtml?bill_id=202520260AB2047",
  },
  NY: {
    kind: "Blocking law + active bill",
    status: "Enacted + active",
    statusClass: "status-enacted",
    title: "S9005C + S5952",
    summary: "Chapter 55 establishes a blocking-technology framework; S5952/A2060 separately remains in committee on serialization and registration.",
    link: "https://www.nysenate.gov/legislation/bills/2025/S9005",
  },
  WA: {
    kind: "Enacted law + blocking proposal",
    status: "Enacted + introduced",
    statusClass: "status-enacted",
    title: "ESHB 2320 + HB 2321",
    summary: "ESHB 2320 regulates firearm manufacture and digital manufacturing code; HB 2321 separately proposes printer-level blocking features.",
    link: "https://app.leg.wa.gov/billsummary?BillNumber=2320&Year=2025&Initiative=false",
  },
  CO: {
    kind: "Related 3D-firearm law",
    status: "Enacted · Effective July 2026",
    statusClass: "status-enacted",
    title: "HB26-1144",
    summary: "Prohibits specified 3D-printed manufacture of potentially functional firearms and components, subject to exceptions.",
    link: "https://leg.colorado.gov/bills/hb26-1144",
  },
  CT: {
    kind: "Related ghost-gun law",
    status: "Enacted · Public Act 26-41",
    statusClass: "status-enacted",
    title: "HB 5043",
    summary: "Addresses unfinished frames and receivers, convertible pistols, and related ghost-gun enforcement provisions.",
    link: "https://www.cga.ct.gov/asp/cgabillstatus/cgabillstatus.asp?selBillType=Bill&bill_num=HB5043&which_year=2026",
  },
  DE: {
    kind: "Blocking proposal + existing law",
    status: "Active + enacted",
    statusClass: "status-active",
    title: "HB 399 + Chapter 246",
    summary: "HB 399 proposes blocking technology for printers sold in Delaware; Chapter 246 already regulates specified 3D manufacture and digital instructions.",
    link: "https://legis.delaware.gov/BillDetail?LegislationId=143522",
  },
  ME: {
    kind: "Related serialization law",
    status: "Enacted · Public Law c.537",
    statusClass: "status-enacted",
    title: "LD 1126",
    summary: "Requires serialization in specified circumstances and addresses frames or receivers made with 3D printers or CNC equipment.",
    link: "https://legislature.maine.gov/legis/bills/display_ps.asp?LD=1126&snum=132",
  },
  NJ: {
    kind: "Related digital-instructions law",
    status: "Enacted · P.L.2025 c.255",
    statusClass: "status-enacted",
    title: "A4975 / S3894",
    summary: "Establishes an offense concerning possession of digital instructions used to illegally manufacture firearms or components.",
    link: "https://www.njleg.state.nj.us/bill-search/2024/A4975",
  },
  VA: {
    kind: "Related unserialized-firearm law",
    status: "Enacted · Chapters 531–532",
    statusClass: "status-enacted",
    title: "HB 40 / SB 323",
    summary: "Addresses unfinished frames or receivers, unserialized firearms, and undetectable-firearm restrictions.",
    link: "https://lis.virginia.gov/bill-details/20261/HB40",
  },
  MN: {
    kind: "3D manufacture + file proposals",
    status: "Active + introduced",
    statusClass: "status-active",
    title: "HF 3407 / SF 3661 · HF 4882 / SF 5066",
    summary: "The companion proposals address unlicensed 3D firearm manufacture, distribution of design files, and serialization; SF 3661 advanced to second reading.",
    link: "https://www.revisor.mn.gov/bills/94/2026/0/HF/3407/",
  },
  MI: {
    kind: "Serialization proposal",
    status: "Active · passed Senate",
    statusClass: "status-active",
    title: "SB 331 / SB 332",
    summary: "The linked bills would regulate unserialized firearms and components, including manufacture using 3D printers or CNC equipment.",
    link: "https://www.legislature.mi.gov/Bills/Bill?ObjectName=2025-SB-0331",
  },
  FL: {
    kind: "Concluded 3D-firearm proposals",
    status: "Concluded · 2025 session",
    statusClass: "status-concluded",
    title: "SB 1096 + related bills",
    summary: "SB 1096, SB 252, and HB 1019 included restrictions involving unserialized firearms and unlicensed 3D-printer or CNC manufacture but did not advance.",
    link: "https://www.flsenate.gov/Session/Bill/2025/1096",
  },
  MS: {
    kind: "Concluded serialization proposal",
    status: "Concluded · died in committee",
    statusClass: "status-concluded",
    title: "HB 434",
    summary: "Would have required firearms made with 3D-printing technology to be serialized and regulated possession of unserialized firearms and components.",
    link: "https://billstatus.ls.state.ms.us/documents/2026/html/HB/0400-0499/HB0434IN.htm",
  },
  TX: {
    kind: "Concluded 3D-firearm proposal",
    status: "Concluded · 2025 session",
    statusClass: "status-concluded",
    title: "SB 1711",
    summary: "Would have created a state offense concerning manufacture, sale, transfer, or possession of a 3D-printed firearm; it remained in committee.",
    link: "https://capitol.texas.gov/billlookup/History.aspx?LegSess=89R&Bill=SB1711",
  },
};

const policyMarkers = [...document.querySelectorAll("[data-policy-state]")];
const policyCode = document.querySelector("[data-policy-code]");
const policyKind = document.querySelector("[data-policy-kind]");
const policyStatus = document.querySelector("[data-policy-status]");
const policyTitle = document.querySelector("[data-policy-title]");
const policySummary = document.querySelector("[data-policy-summary]");
const policyLink = document.querySelector("[data-policy-link]");

function setPolicyState(state) {
  const policy = policyData[state];
  if (!policy) return;
  policyMarkers.forEach((marker) => {
    const isActive = marker.dataset.policyState === state;
    marker.classList.toggle("active", isActive);
    marker.setAttribute("aria-pressed", String(isActive));
  });
  if (policyCode) policyCode.textContent = state;
  if (policyKind) policyKind.textContent = policy.kind;
  if (policyStatus) {
    policyStatus.textContent = policy.status;
    policyStatus.className = `detail-status ${policy.statusClass}`;
  }
  if (policyTitle) policyTitle.textContent = policy.title;
  if (policySummary) policySummary.textContent = policy.summary;
  if (policyLink) policyLink.href = policy.link;
}

policyMarkers.forEach((marker) => marker.addEventListener("click", () => setPolicyState(marker.dataset.policyState)));

const policyMapCanvas = document.querySelector(".policy-map-canvas");
function nearestPolicyMarker(x, y) {
  return policyMarkers.reduce((best, marker) => {
    const dot = marker.querySelector("i").getBoundingClientRect();
    const distance = Math.hypot(x - (dot.left + dot.width / 2), y - (dot.top + dot.height / 2));
    return !best || distance < best.distance ? { marker, distance } : best;
  }, null)?.marker;
}

policyMapCanvas?.addEventListener("pointermove", (event) => {
  const target = event.target.closest?.(".state-marker");
  const nearest = target ? nearestPolicyMarker(event.clientX, event.clientY) : null;
  policyMarkers.forEach((marker) => marker.classList.toggle("is-nearest", marker === nearest));
});
policyMapCanvas?.addEventListener("pointerleave", () => {
  policyMarkers.forEach((marker) => marker.classList.remove("is-nearest"));
});

policyMapCanvas?.addEventListener("click", (event) => {
  const target = event.target.closest?.(".state-marker");
  if (!target || event.detail === 0) return;

  const nearest = nearestPolicyMarker(event.clientX, event.clientY);

  if (nearest && nearest !== target) {
    event.preventDefault();
    event.stopPropagation();
    setPolicyState(nearest.dataset.policyState);
  }
}, true);
