const header = document.querySelector("[data-header]");
const menuButton = document.querySelector(".menu-toggle");
const menuLabel = menuButton?.querySelector(".sr-only");
const siteNav = document.querySelector(".site-nav");
const mobileMenuQuery = window.matchMedia("(max-width: 900px)");
const menuOutside = [
  document.querySelector("main"),
  document.querySelector(".site-footer"),
  document.querySelector(".brand"),
  document.querySelector(".header-cta"),
].filter(Boolean);

function updateHeader() {
  header?.classList.toggle("scrolled", window.scrollY > 24);
}

function setMenuOutsideInert(isInert) {
  menuOutside.forEach((element) => { element.inert = isInert; });
}

function closeMenu({ restoreFocus = false } = {}) {
  if (!menuButton || !siteNav) return;
  menuButton.setAttribute("aria-expanded", "false");
  if (menuLabel) menuLabel.textContent = "Open navigation";
  siteNav.classList.remove("open");
  document.body.classList.remove("menu-open");
  setMenuOutsideInert(false);
  if (restoreFocus) menuButton.focus();
}

function openMenu() {
  if (!menuButton || !siteNav) return;
  menuButton.setAttribute("aria-expanded", "true");
  if (menuLabel) menuLabel.textContent = "Close navigation";
  siteNav.classList.add("open");
  document.body.classList.add("menu-open");
  setMenuOutsideInert(true);
  siteNav.querySelector("a")?.focus();
}

menuButton?.addEventListener("click", () => {
  const isOpen = menuButton.getAttribute("aria-expanded") === "true";
  if (isOpen) closeMenu({ restoreFocus: true });
  else openMenu();
});

siteNav?.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));
document.addEventListener("keydown", (event) => {
  if (menuButton?.getAttribute("aria-expanded") !== "true") return;
  if (event.key === "Escape") {
    event.preventDefault();
    closeMenu({ restoreFocus: true });
    return;
  }
  if (event.key !== "Tab" || !siteNav) return;
  const focusable = [menuButton, ...siteNav.querySelectorAll("a")];
  const currentIndex = focusable.indexOf(document.activeElement);
  if (event.shiftKey && currentIndex <= 0) {
    event.preventDefault();
    focusable.at(-1)?.focus();
  } else if (!event.shiftKey && currentIndex === focusable.length - 1) {
    event.preventDefault();
    menuButton.focus();
  }
});
mobileMenuQuery.addEventListener("change", (event) => {
  if (!event.matches) closeMenu();
});
window.addEventListener("resize", () => {
  if (!mobileMenuQuery.matches) closeMenu();
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
    kind: "Enacted law + concluded proposal",
    status: "Enacted + concluded proposal",
    statusClass: "status-enacted",
    title: "ESHB 2320 + HB 2321",
    summary: "ESHB 2320 regulates firearm manufacture and digital manufacturing code; HB 2321 separately proposed printer-level blocking features before the 2026 session adjourned.",
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
    kind: "Concluded 3D manufacture + file proposals",
    status: "Concluded · 2026 session",
    statusClass: "status-concluded",
    title: "HF 3407 / SF 3661 · HF 4882 / SF 5066",
    summary: "The companion proposals addressed unlicensed 3D firearm manufacture, distribution of design files, and serialization; SF 3661 reached second reading before the session adjourned.",
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
    status: "Concluded · 2026 session",
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
const policySelect = document.querySelector("#policy-state-select");

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
  if (policySelect) policySelect.value = state;
}

policyMarkers.forEach((marker) => marker.addEventListener("click", () => setPolicyState(marker.dataset.policyState)));
policySelect?.addEventListener("change", () => setPolicyState(policySelect.value));

const policyMapCanvas = document.querySelector(".policy-map-canvas");
policyMapCanvas?.addEventListener("click", (event) => {
  if (event.detail === 0) return;
  const nearest = policyMarkers.reduce((best, marker) => {
    const dot = marker.querySelector("i")?.getBoundingClientRect();
    if (!dot) return best;
    const distance = Math.hypot(event.clientX - (dot.left + dot.width / 2), event.clientY - (dot.top + dot.height / 2));
    return !best || distance < best.distance ? { marker, distance } : best;
  }, null);
  if (!nearest || nearest.distance > 28) return;
  event.preventDefault();
  event.stopPropagation();
  setPolicyState(nearest.marker.dataset.policyState);
}, true);
