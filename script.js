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

const demoDialog = document.querySelector("[data-demo-dialog]");
const demoCloseButton = document.querySelector("[data-demo-close]");
const demoTitle = document.querySelector("#demo-chooser-title");
const demoCaseButtons = [...document.querySelectorAll("[data-demo-case]")];
const demoOutput = document.querySelector(".demo-output");
const demoResultTitle = document.querySelector("[data-demo-decision]");
const demoVisualLabel = document.querySelector("[data-demo-visual-label]");
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
      route: "Continue workflow",
      stage: "Allow",
      explanation: "The classifier score stayed below the browser demo’s selective-review threshold.",
    };
  }
  if (score < policy.holdAtOrAbove) {
    return {
      state: "review",
      decision: "Needs human review",
      route: "Manual review",
      stage: "Review",
      explanation: "The score falls inside the selective-review band, so the system abstains from an automatic route.",
    };
  }
  return {
    state: "hold",
    decision: "Firearm-related signal",
    route: "Hold for review",
    stage: "Hold",
    explanation: "The classifier score crossed the browser demo’s high-confidence review threshold.",
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
  if (demoVisualLabel) demoVisualLabel.textContent = "Local geometry feature fixture";
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
