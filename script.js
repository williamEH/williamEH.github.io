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
    name: "California",
    kind: "Blocking proposal + enacted digital-file law",
    status: "Enacted + active",
    statusClass: "status-enacted",
    summary: "California has an active printer-blocking proposal and a 2025 law expanding rules for digital firearm manufacturing code.",
    measures: [
      {
        status: "Active · Senate Appropriations",
        statusClass: "status-active",
        summary: "Would set performance standards for firearm-blueprint detection and later require compliant blocking technology on covered 3D printers.",
        bills: [{ label: "AB 2047", link: "https://leginfo.legislature.ca.gov/faces/billStatusClient.xhtml?bill_id=202520260AB2047" }],
      },
      {
        status: "Enacted · Ch. 636 (2025)",
        statusClass: "status-enacted",
        summary: "Expands covered digital manufacturing code and liability for distributing code or aiding unlawful firearm manufacture.",
        bills: [{ label: "AB 1263", link: "https://leginfo.legislature.ca.gov/faces/billStatusClient.xhtml?bill_id=202520260AB1263" }],
      },
    ],
  },
  NY: {
    name: "New York",
    kind: "Blocking law + active 3D-firearm bills",
    status: "Enacted + active",
    statusClass: "status-enacted",
    summary: "The enacted budget created a conditional blocking framework; separate active bills address manufacture, digital instructions, serialization, and printer sales.",
    measures: [
      {
        status: "Enacted · Ch. 55 (2026)",
        statusClass: "status-enacted",
        summary: "Creates 3D-firearm offenses and a working-group process for technically feasible printer-blocking standards.",
        bills: [
          { label: "S9005C", link: "https://www.nysenate.gov/legislation/bills/2025/S9005" },
          { label: "A10005C", link: "https://www.nysenate.gov/legislation/bills/2025/A10005/amendment/C" },
        ],
      },
      {
        status: "Active · In committee",
        statusClass: "status-active",
        summary: "Would require a gunsmith license, unique identifier, and State Police registration for a 3D-printed firearm.",
        bills: [
          { label: "S5952", link: "https://www.nysenate.gov/legislation/bills/2025/S5952" },
          { label: "A2060", link: "https://www.nysenate.gov/legislation/bills/2025/A2060" },
        ],
      },
      {
        status: "Active · In Codes",
        statusClass: "status-active",
        summary: "Would criminalize specified unlicensed 3D manufacture and intentional distribution of usable firearm design instructions.",
        bills: [
          { label: "S227A", link: "https://www.nysenate.gov/legislation/bills/2025/S227" },
          { label: "A1777A", link: "https://www.nysenate.gov/legislation/bills/2025/A1777" },
          { label: "S9827", link: "https://www.nysenate.gov/legislation/bills/2025/S9827" },
        ],
      },
      {
        status: "Active · In Codes",
        statusClass: "status-active",
        summary: "Would require a criminal-history background check before purchase of a printer capable of producing firearms or components.",
        bills: [
          { label: "S3562", link: "https://www.nysenate.gov/legislation/bills/2025/S3562" },
          { label: "A2228", link: "https://www.nysenate.gov/legislation/bills/2025/A2228" },
        ],
      },
    ],
  },
  WA: {
    name: "Washington",
    kind: "Enacted law + concluded proposal",
    status: "Enacted + concluded proposal",
    statusClass: "status-enacted",
    summary: "Washington enacted restrictions on specified manufacture and digital code; a separate printer-blocking proposal did not advance.",
    measures: [
      {
        status: "Enacted · Ch. 203 (2026)",
        statusClass: "status-enacted",
        summary: "Regulates specified firearm manufacture using 3D printers or CNC machines and possession or distribution of digital manufacturing code.",
        bills: [
          { label: "ESHB 2320", link: "https://app.leg.wa.gov/billsummary/?BillNumber=2320&Year=2025&Initiative=false" },
          { label: "SB 6314", link: "https://app.leg.wa.gov/billsummary/?BillNumber=6314&Year=2025&Initiative=false" },
        ],
      },
      {
        status: "Concluded · House committee",
        statusClass: "status-concluded",
        summary: "Would have required blocking features on covered 3D printers sold or transferred in Washington after July 2027.",
        bills: [{ label: "HB 2321", link: "https://app.leg.wa.gov/billsummary/?BillNumber=2321&Year=2025&Initiative=false" }],
      },
    ],
  },
  CO: {
    name: "Colorado",
    kind: "Related 3D-firearm law",
    status: "Enacted · Effective July 1, 2026",
    statusClass: "status-enacted",
    summary: "The final law covers specified 3D manufacture; proposed digital-file restrictions were removed before enactment.",
    measures: [{
      status: "Enacted · Ch. 94 (2026)",
      statusClass: "status-enacted",
      summary: "Prohibits specified 3D manufacture of potentially functional firearms and components, subject to stated exceptions.",
      bills: [{ label: "HB26-1144", link: "https://leg.colorado.gov/bills/hb26-1144" }],
    }],
  },
  CT: {
    name: "Connecticut",
    kind: "Related ghost-gun law",
    status: "Enacted · Public Act 26-41",
    statusClass: "status-enacted",
    summary: "A selected related ghost-gun law, rather than a printer-blocking measure.",
    measures: [{
      status: "Enacted · PA 26-41",
      statusClass: "status-enacted",
      summary: "Addresses unfinished frames and receivers, convertible pistols, relinquishment, and related enforcement provisions.",
      bills: [{ label: "HB 5043", link: "https://www.cga.ct.gov/ASP/CGABILLSTATUS/cgabillstatus.asp?bill_num=HB05043&selBillType=Bill&which_year=2026" }],
    }],
  },
  DE: {
    name: "Delaware",
    kind: "Blocking proposal + existing law",
    status: "Enacted + active",
    statusClass: "status-enacted",
    summary: "Delaware has an active printer-blocking bill and an existing law on unlicensed 3D manufacture and digital instructions.",
    measures: [
      {
        status: "Active · House Judiciary",
        statusClass: "status-active",
        summary: "Would require blocking technology and manufacturer attestations for covered 3D printers sold or delivered in Delaware.",
        bills: [{ label: "HB 399", link: "https://legis.delaware.gov/BillDetail?LegislationId=143522" }],
      },
      {
        status: "Enacted · Ch. 246 (2021)",
        statusClass: "status-enacted",
        summary: "Prohibits specified unlicensed 3D firearm manufacture and distribution of digital firearm-manufacturing instructions.",
        bills: [{ label: "HB 125", link: "https://legis.delaware.gov/BillDetail?legislationId=48451" }],
      },
    ],
  },
  ME: {
    name: "Maine",
    kind: "Related serialization law",
    status: "Enacted · Effective July 29, 2026",
    statusClass: "status-enacted",
    summary: "Maine's 2025 law directly addresses serialization and undetectability for certain privately made firearms and components.",
    measures: [{
      status: "Enacted · PL 2025, c. 537",
      statusClass: "status-enacted",
      summary: "Requires serialization in specified circumstances and covers frames or receivers made with 3D printers or CNC equipment.",
      bills: [{ label: "LD 1126", link: "https://legislature.maine.gov/legis/bills/display_ps.asp?LD=1126&snum=132" }],
    }],
  },
  NJ: {
    name: "New Jersey",
    kind: "Digital-instructions law + related proposals",
    status: "Enacted + active",
    statusClass: "status-enacted",
    summary: "New Jersey enacted a digital-instructions offense and has a current proposal affecting penalties for unlicensed 3D manufacture.",
    measures: [
      {
        status: "Enacted · P.L.2025, c.255",
        statusClass: "status-enacted",
        summary: "Creates a fourth-degree offense for knowingly possessing firearm digital instructions with intent to manufacture unlawfully.",
        bills: [
          { label: "A4975", link: "https://www.njleg.state.nj.us/bill-search/2024/A4975" },
          { label: "S3894", link: "https://www.njleg.state.nj.us/bill-search/2024/S3894" },
        ],
      },
      {
        status: "Concluded · 2024–25 session",
        statusClass: "status-concluded",
        summary: "Would have made possession of digital instructions for firearm manufacture a third-degree offense.",
        bills: [{ label: "A4917", link: "https://www.njleg.state.nj.us/bill-search/2024/A4917" }],
      },
      {
        status: "Withdrawn · Prior version approved",
        statusClass: "status-concluded",
        summary: "A prefiled successor to A4975/S3894 that was withdrawn after the prior-session measure became law.",
        bills: [{ label: "A1399", link: "https://www.njleg.state.nj.us/bill-search/2026/A1399" }],
      },
      {
        status: "Active · Senate committee",
        statusClass: "status-active",
        summary: "Would raise specified firearm-manufacturing crimes, including unlicensed 3D manufacture, from second- to first-degree offenses.",
        bills: [{ label: "S3232", link: "https://www.njleg.state.nj.us/bill-search/2026/S3232" }],
      },
    ],
  },
  VA: {
    name: "Virginia",
    kind: "Related unserialized-firearm law",
    status: "Enacted · Effective July 1, 2027",
    statusClass: "status-enacted",
    summary: "Virginia enacted companion bills covering unserialized firearms and unfinished frames or receivers.",
    measures: [{
      status: "Enacted · Chapters 531–532",
      statusClass: "status-enacted",
      summary: "Prohibits specified possession of unserialized firearms and unfinished frames or receivers, with stated exceptions.",
      bills: [
        { label: "HB 40", link: "https://lis.virginia.gov/bill-details/20261/HB40" },
        { label: "SB 323", link: "https://lis.virginia.gov/bill-details/20261/SB323" },
      ],
    }],
  },
  MN: {
    name: "Minnesota",
    kind: "Concluded 3D manufacture + file proposals",
    status: "Concluded · 2026 session",
    statusClass: "status-concluded",
    summary: "Several overlapping proposals addressed ghost guns, unlicensed 3D/CNC manufacture, design files, and serialization; none became law.",
    measures: [
      {
        status: "Concluded · SF reached second reading",
        statusClass: "status-concluded",
        summary: "Would have restricted ghost guns, unlicensed 3D/CNC manufacture, design-file distribution, and unserialized possession.",
        bills: [
          { label: "HF 3407", link: "https://www.revisor.mn.gov/bills/94/2026/0/HF/3407/" },
          { label: "SF 3661", link: "https://www.revisor.mn.gov/bills/94/2026/0/SF/3661/" },
        ],
      },
      {
        status: "Concluded · SF passed Senate",
        statusClass: "status-concluded",
        summary: "SF4067's final omnibus text carried similar 3D/CNC and design-file provisions; the listed House companion did not carry that final text.",
        bills: [
          { label: "SF 4067", link: "https://www.revisor.mn.gov/bills/94/2026/0/SF/4067/" },
          { label: "HF 3874", link: "https://www.revisor.mn.gov/bills/94/2026/0/HF/3874/" },
        ],
      },
      {
        status: "Concluded · 2026 session",
        statusClass: "status-concluded",
        summary: "Broad public-safety omnibus proposals that included ghost-gun, 3D manufacture, design-file, and serialization provisions.",
        bills: [
          { label: "HF 4882", link: "https://www.revisor.mn.gov/bills/94/2026/0/HF/4882/" },
          { label: "SF 5066", link: "https://www.revisor.mn.gov/bills/94/2026/0/SF/5066/" },
        ],
      },
      {
        status: "Concluded · House committee",
        statusClass: "status-concluded",
        summary: "A late omnibus proposal with the same unlicensed 3D/CNC manufacture and design-file restrictions.",
        bills: [{ label: "HF 5160", link: "https://www.revisor.mn.gov/bills/94/2026/0/HF/5160/" }],
      },
    ],
  },
  MI: {
    name: "Michigan",
    kind: "Serialization proposal",
    status: "Active · House Government Operations",
    statusClass: "status-active",
    summary: "A two-bill package remains active after Senate passage.",
    measures: [{
      status: "Active · Passed Senate; in House committee",
      statusClass: "status-active",
      summary: "Would regulate unserialized firearms and components, including unlicensed manufacture using 3D printers or CNC equipment; SB332 updates penalties.",
      bills: [
        { label: "SB 331", link: "https://www.legislature.mi.gov/Bills/Bill?ObjectName=2025-SB-0331" },
        { label: "SB 332", link: "https://www.legislature.mi.gov/Bills/Bill?ObjectName=2025-SB-0332" },
      ],
    }],
  },
  FL: {
    name: "Florida",
    kind: "Concluded 3D-firearm proposals",
    status: "Concluded · 2025 session",
    statusClass: "status-concluded",
    summary: "Four overlapping 2025 proposals addressed unserialized firearms and unlicensed 3D/CNC manufacture; none became law.",
    measures: [
      {
        status: "Concluded · Died in committee",
        statusClass: "status-concluded",
        summary: "Overlapping proposals on unserialized firearms, unlicensed 3D/CNC manufacture, and machines marketed primarily for firearm production.",
        bills: [
          { label: "SB 1096", link: "https://www.flsenate.gov/Session/Bill/2025/1096" },
          { label: "SB 252", link: "https://www.flsenate.gov/Session/Bill/2025/252" },
          { label: "HB 1019", link: "https://www.flsenate.gov/Session/Bill/2025/1019" },
        ],
      },
      {
        status: "Concluded · Withdrawn before introduction",
        statusClass: "status-concluded",
        summary: "An earlier House proposal covering the same general ghost-gun and unlicensed manufacturing policy area.",
        bills: [{ label: "HB 65", link: "https://www.flsenate.gov/Session/Bill/2025/65" }],
      },
    ],
  },
  MS: {
    name: "Mississippi",
    kind: "Concluded serialization proposal",
    status: "Concluded · 2025–26 sessions",
    statusClass: "status-concluded",
    summary: "Similar serialization proposals were introduced in consecutive sessions and died in committee.",
    measures: [
      {
        status: "Concluded · Died in committee (2026)",
        statusClass: "status-concluded",
        summary: "Would have required serialization of firearms made with 3D-printing technology and regulated unserialized firearms and components.",
        bills: [{ label: "HB 434", link: "https://billstatus.ls.state.ms.us/documents/2026/html/HB/0400-0499/HB0434IN.htm" }],
      },
      {
        status: "Concluded · Died in committee (2025)",
        statusClass: "status-concluded",
        summary: "The prior-session version of the state's proposed serialization and ghost-gun restrictions.",
        bills: [{ label: "HB 850", link: "https://billstatus.ls.state.ms.us/documents/2025/html/HB/0800-0899/HB0850IN.htm" }],
      },
    ],
  },
  TX: {
    name: "Texas",
    kind: "Concluded 3D-firearm proposal",
    status: "Concluded · 2025 session",
    statusClass: "status-concluded",
    summary: "Two separate 2025 proposals directly addressed 3D-printed firearms or components; both remained in committee.",
    measures: [
      {
        status: "Concluded · Senate committee",
        statusClass: "status-concluded",
        summary: "Would have prohibited specified manufacture, sale, transfer, or possession of a 3D-printed firearm and intentional distribution of schematics.",
        bills: [{ label: "SB 1711", link: "https://capitol.texas.gov/billlookup/History.aspx?LegSess=89R&Bill=SB1711" }],
      },
      {
        status: "Concluded · House committee",
        statusClass: "status-concluded",
        summary: "Would have required identifying marks on unmarked firearms and created offenses involving 3D-printed firearm components.",
        bills: [{ label: "HB 4159", link: "https://capitol.texas.gov/billlookup/History.aspx?LegSess=89R&Bill=HB4159" }],
      },
    ],
  },
  VT: {
    name: "Vermont",
    kind: "Related serialization law",
    status: "Enacted · In force",
    statusClass: "status-enacted",
    summary: "A selected related law whose serialization requirements became operative in 2025 and expressly cover 3D-printed manufacture.",
    measures: [{
      status: "Enacted · Act 120 (2024)",
      statusClass: "status-enacted",
      summary: "Requires specified firearms, frames, and receivers to be serialized and expressly includes manufacture by 3D printer.",
      bills: [{ label: "S.209", link: "https://legislature.vermont.gov/bill/status/2024/S.209" }],
    }],
  },
};

const policyMarkers = [...document.querySelectorAll("[data-policy-state]")];
const policyCode = document.querySelector("[data-policy-code]");
const policyKind = document.querySelector("[data-policy-kind]");
const policyStatus = document.querySelector("[data-policy-status]");
const policyTitle = document.querySelector("[data-policy-title]");
const policySummary = document.querySelector("[data-policy-summary]");
const policyMeasures = document.querySelector("[data-policy-measures]");
const policyRecords = document.querySelector("[data-policy-records]");
const policySelect = document.querySelector("#policy-state-select");

function createPolicyLink(bill) {
  const link = document.createElement("a");
  link.className = "policy-bill-link";
  link.href = bill.link;
  link.target = "_blank";
  link.rel = "noreferrer";
  link.textContent = `${bill.label} ↗`;
  return link;
}

function createPolicyMeasure(measure, detail = false) {
  const item = document.createElement("div");
  item.className = detail ? "policy-detail-measure" : "policy-record-measure";

  const meta = document.createElement("div");
  meta.className = "policy-measure-meta";
  const status = document.createElement("span");
  status.className = measure.statusClass;
  status.textContent = measure.status;
  const links = document.createElement("div");
  links.className = "policy-bill-links";
  measure.bills.forEach((bill) => links.append(createPolicyLink(bill)));
  meta.append(status, links);

  const summary = document.createElement("p");
  summary.textContent = measure.summary;
  item.append(meta, summary);
  return item;
}

function renderPolicyRecords() {
  if (!policyRecords) return;
  Object.values(policyData).forEach((policy) => {
    const record = document.createElement("article");
    record.className = "policy-record reveal visible";

    const heading = document.createElement("div");
    heading.className = "policy-record-heading";
    const name = document.createElement("span");
    name.textContent = policy.name;
    const status = document.createElement("em");
    status.className = policy.statusClass;
    status.textContent = policy.status;
    const kind = document.createElement("strong");
    kind.textContent = policy.kind;
    heading.append(name, status, kind);

    const measures = document.createElement("div");
    measures.className = "policy-record-measures";
    policy.measures.forEach((measure) => measures.append(createPolicyMeasure(measure)));
    record.append(heading, measures);
    policyRecords.append(record);
  });
}

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
  if (policyTitle) policyTitle.textContent = policy.name;
  if (policySummary) policySummary.textContent = policy.summary;
  if (policyMeasures) {
    policyMeasures.replaceChildren(...policy.measures.map((measure) => createPolicyMeasure(measure, true)));
    policyMeasures.scrollTop = 0;
  }
  if (policySelect) policySelect.value = state;
}

renderPolicyRecords();
setPolicyState("CA");

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

const demoDialog = document.querySelector("[data-demo-dialog]");
const demoCloseButton = document.querySelector("[data-demo-close]");
const demoTitle = document.querySelector("#demo-chooser-title");
const demoCaseButtons = [...document.querySelectorAll("[data-demo-case]")];
const demoOutput = document.querySelector(".demo-output");
const demoResultTitle = document.querySelector("[data-demo-decision]");
const demoVisualLabel = document.querySelector("[data-demo-visual-label]");
const demoPreview = document.querySelector("[data-demo-preview]");
const demoFormat = document.querySelector("[data-demo-format]");
const demoFile = document.querySelector("[data-demo-file]");
const demoExplanation = document.querySelector("[data-demo-explanation]");
const demoScore = document.querySelector("[data-demo-score]");
const demoScoreBar = document.querySelector("[data-demo-score-bar]");
const demoCategory = document.querySelector("[data-demo-category]");
const demoRoute = document.querySelector("[data-demo-route]");
const demoElapsed = document.querySelector("[data-demo-elapsed]");
const demoModel = document.querySelector("[data-demo-model]");
const demoModelSpec = document.querySelector("[data-demo-model-spec]");
const demoRuntimeStatus = document.querySelector("[data-demo-runtime-status]");
const demoStages = [...document.querySelectorAll("[data-demo-stage]")];
const demoLiveRegion = document.querySelector("[data-demo-live]");
const demoBundle = window.PRINTGUARD_DEMO_CLASSIFIER;
const defaultDocumentTitle = document.title;
const demoHash = "#demotime";

let demoReturnHash = window.history.state?.printguardDemoReturnHash || "";
let demoReturnScroll = Number(window.history.state?.printguardDemoReturnScroll || 0);
let demoReturnFocus = null;
let demoDirectEntry = window.location.hash === demoHash && !window.history.state?.printguardDemoOwned;
let demoRunToken = 0;

function scoreDemoFeatures(features) {
  const classifier = demoBundle?.classifier;
  if (!classifier || features.length !== classifier.featureCount) {
    throw new Error("Browser classifier artifact is unavailable or incompatible.");
  }

  let rawScore = classifier.baseline;
  classifier.trees.forEach((tree) => {
    let nodeIndex = 0;
    while (tree[nodeIndex][0] === 0) {
      const node = tree[nodeIndex];
      const value = features[node[1]];
      const goLeft = Number.isNaN(value) ? Boolean(node[3]) : value <= node[2];
      nodeIndex = node[goLeft ? 4 : 5];
    }
    rawScore += tree[nodeIndex][1];
  });
  return 1 / (1 + Math.exp(-rawScore));
}

function demoPolicyResult(score) {
  const policy = demoBundle.classifier.policy;
  if (score < policy.allowBelow) {
    return {
      state: "allow",
      decision: "Not flagged",
      route: "Continue under active policy",
      stage: "Below policy line",
      explanation: "The classifier score stayed below the illustrative policy line shown here.",
    };
  }
  if (score < policy.holdAtOrAbove) {
    return {
      state: "review",
      decision: "Policy-dependent signal",
      route: "Configured policy action",
      stage: "Policy band",
      explanation: "This score sits between the two illustrative classification lines. A deployment can move those lines—and change the resulting action—to reflect applicable state-specific legislation or an operator’s workflow.",
    };
  }
  return {
    state: "hold",
    decision: "Firearm-related signal",
    route: "Configured policy action",
    stage: "Above policy line",
    explanation: "This score crosses the upper illustrative classification line. A deployment can move that line and choose the resulting action based on applicable state-specific legislation or workflow requirements.",
  };
}

function setDemoCase(key) {
  const sample = demoBundle?.fixtures?.find((fixture) => fixture.id === key);
  if (!sample || !demoOutput) return;
  const runToken = ++demoRunToken;

  demoCaseButtons.forEach((button) => {
    const selected = button.dataset.demoCase === key;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-pressed", String(selected));
  });

  demoOutput.dataset.demoCaseState = key;
  demoOutput.dataset.demoRunState = "running";
  demoOutput.setAttribute("aria-busy", "true");
  if (demoResultTitle) demoResultTitle.textContent = "Analyzing…";
  if (demoVisualLabel) demoVisualLabel.textContent = "Geometry-derived fixture preview";
  if (demoPreview) demoPreview.setAttribute("src", `assets/demo-preview-${sample.preview}.svg?v=1`);
  if (demoFormat) demoFormat.textContent = sample.format;
  if (demoFile) demoFile.textContent = sample.file;
  if (demoExplanation) demoExplanation.textContent = "Running the exported gradient-boosted model locally in this browser.";
  if (demoScore) demoScore.textContent = "—";
  if (demoScoreBar) demoScoreBar.style.setProperty("--score", "0%");
  if (demoCategory) demoCategory.textContent = sample.category;
  if (demoRoute) demoRoute.textContent = "Pending";
  if (demoElapsed) demoElapsed.textContent = "Running locally";
  if (demoRuntimeStatus) demoRuntimeStatus.textContent = "Classifier running";
  demoStages.forEach((stage, index) => {
    stage.textContent = ["Feature vector loaded", "Evaluating trees", "Waiting"][index] || "";
  });

  const delay = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 420;
  window.setTimeout(() => {
    if (runToken !== demoRunToken) return;
    try {
      const startedAt = performance.now();
      const score = scoreDemoFeatures(sample.features);
      const elapsed = performance.now() - startedAt;
      const result = demoPolicyResult(score);
      const percentage = score * 100;
      const classifier = demoBundle.classifier;

      demoOutput.dataset.demoRunState = "complete";
      demoOutput.dataset.demoResultState = result.state;
      demoOutput.setAttribute("aria-busy", "false");
      if (demoResultTitle) demoResultTitle.textContent = result.decision;
      if (demoExplanation) demoExplanation.textContent = result.explanation;
      if (demoScore) demoScore.textContent = percentage.toFixed(1);
      if (demoScoreBar) demoScoreBar.style.setProperty("--score", `${percentage}%`);
      if (demoRoute) demoRoute.textContent = result.route;
      if (demoElapsed) demoElapsed.textContent = elapsed < 0.1 ? "< 0.1 ms · local" : `${elapsed.toFixed(1)} ms · local`;
      if (demoModel) demoModel.textContent = `GBDT ${classifier.modelSha256.slice(0, 12)}`;
      if (demoModelSpec) demoModelSpec.textContent = `Exported GBDT · ${classifier.featureCount.toLocaleString()} geometry features · ${classifier.trees.length} trees`;
      if (demoRuntimeStatus) demoRuntimeStatus.textContent = "Inference complete";
      demoStages.forEach((stage, index) => {
        stage.textContent = [
          `${classifier.featureCount.toLocaleString()} features`,
          `${classifier.trees.length} trees evaluated`,
          result.stage,
        ][index] || "";
      });
      if (demoLiveRegion) {
        demoLiveRegion.textContent = `${sample.title}: ${result.decision}. Firearm-related score ${percentage.toFixed(1)} percent. ${result.route}.`;
      }
    } catch (error) {
      demoOutput.dataset.demoRunState = "error";
      demoOutput.setAttribute("aria-busy", "false");
      if (demoResultTitle) demoResultTitle.textContent = "Model unavailable";
      if (demoExplanation) demoExplanation.textContent = error instanceof Error ? error.message : "Classifier failed to run.";
      if (demoRuntimeStatus) demoRuntimeStatus.textContent = "Classifier unavailable";
    }
  }, delay);
}

function isElementInViewport(element) {
  if (!element?.isConnected) return false;
  const rect = element.getBoundingClientRect();
  return rect.bottom > 0 && rect.top < window.innerHeight && rect.right > 0 && rect.left < window.innerWidth;
}

function getDemoReturnFocus() {
  const activeElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  if (siteNav?.contains(activeElement)) return menuButton;
  if (activeElement && activeElement !== document.body && isElementInViewport(activeElement)) return activeElement;

  const headerOffset = (header?.getBoundingClientRect().height || 0) + 12;
  const currentSection = [...document.querySelectorAll("main > section")].find((section) => {
    const rect = section.getBoundingClientRect();
    return rect.top <= headerOffset && rect.bottom > headerOffset;
  });
  return currentSection?.querySelector("h1, h2") || header?.querySelector(".brand") || null;
}

function openDemo() {
  if (!demoDialog || demoDialog.open) return;
  demoReturnFocus = getDemoReturnFocus();
  closeMenu();
  const returnFocusIsNaturallyFocusable = demoReturnFocus?.matches("a[href], button, input, select, textarea, [contenteditable=true]");
  if (demoReturnFocus && !returnFocusIsNaturallyFocusable && !demoReturnFocus.hasAttribute("tabindex")) {
    demoReturnFocus.setAttribute("tabindex", "-1");
  }
  demoReturnFocus?.focus({ preventScroll: true });
  if (!window.history.state?.printguardDemoOwned) demoReturnScroll = window.scrollY;
  document.body.classList.add("demo-open");
  document.title = "Live classifier — PrintGuard";
  setDemoCase("benign");

  if (typeof demoDialog.showModal === "function") demoDialog.showModal();
  else demoDialog.setAttribute("open", "");

  document.documentElement.classList.remove("demo-route-pending");
  requestAnimationFrame(() => demoTitle?.focus({ preventScroll: true }));
}

function closeDemo({ restoreSitePosition = false } = {}) {
  const wasActive = Boolean(demoDialog?.open || document.body.classList.contains("demo-open"));
  if (demoDialog?.open && typeof demoDialog.close === "function") demoDialog.close();
  else if (demoDialog?.open) demoDialog.removeAttribute("open");
  document.body.classList.remove("demo-open");
  document.title = defaultDocumentTitle;
  document.documentElement.classList.remove("demo-route-pending");

  if (!wasActive || !restoreSitePosition) return;
  requestAnimationFrame(() => {
    const returnToTop = demoDirectEntry && !demoReturnHash;
    const previousScrollBehavior = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = "auto";
    window.scrollTo(0, returnToTop ? 0 : demoReturnScroll);
    document.documentElement.style.scrollBehavior = previousScrollBehavior;
    const returnSection = demoReturnHash ? document.querySelector(demoReturnHash) : null;
    const returnFocusIsVisible = isElementInViewport(demoReturnFocus);
    const focusTarget = (returnFocusIsVisible ? demoReturnFocus : null)
      || returnSection?.querySelector("h1, h2")
      || (returnToTop ? document.querySelector("#hero-title") : null);
    const isNaturallyFocusable = focusTarget?.matches("a[href], button, input, select, textarea, [contenteditable=true]");
    if (focusTarget && !isNaturallyFocusable && !focusTarget.hasAttribute("tabindex")) focusTarget.setAttribute("tabindex", "-1");
    focusTarget?.focus({ preventScroll: true });
    demoDirectEntry = false;
  });
}

function syncDemoRoute() {
  if (window.location.hash === demoHash) openDemo();
  else closeDemo({ restoreSitePosition: true });
  document.documentElement.classList.remove("demo-route-pending");
}

function requestDemoClose() {
  if (window.location.hash !== demoHash) {
    closeDemo({ restoreSitePosition: true });
    return;
  }
  if (window.history.state?.printguardDemoOwned) {
    window.history.back();
    return;
  }
  const returnUrl = `${window.location.pathname}${window.location.search}${demoReturnHash}`;
  window.history.replaceState(null, "", returnUrl);
  closeDemo({ restoreSitePosition: true });
}

demoCaseButtons.forEach((button) => button.addEventListener("click", () => setDemoCase(button.dataset.demoCase)));
demoCloseButton?.addEventListener("click", requestDemoClose);
demoDialog?.addEventListener("cancel", (event) => {
  event.preventDefault();
  requestDemoClose();
});

window.addEventListener("hashchange", (event) => {
  const oldHash = new URL(event.oldURL).hash;
  if (window.location.hash === demoHash && oldHash !== demoHash) {
    demoDirectEntry = false;
    demoReturnHash = oldHash;
    demoReturnScroll = window.scrollY;
    window.history.replaceState(
      {
        ...window.history.state,
        printguardDemoOwned: true,
        printguardDemoReturnHash: oldHash,
        printguardDemoReturnScroll: demoReturnScroll,
      },
      "",
      window.location.href,
    );
  }
  syncDemoRoute();
});

if (window.location.hash === demoHash && !window.history.state?.printguardDemoOwned) {
  demoReturnHash = "";
  demoReturnScroll = 0;
}
syncDemoRoute();
