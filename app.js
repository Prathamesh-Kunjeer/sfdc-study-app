(function () {
  let assets = Array.isArray(window.STUDY_ASSETS) ? window.STUDY_ASSETS : [];
  let catalogTopics = Array.isArray(window.STUDY_TOPICS) ? window.STUDY_TOPICS : [];
  const sprintTopics = [
    "order of execution",
    "security",
    "governor",
    "async",
    "future",
    "queueable",
    "batch",
    "trigger",
    "lifecycle",
    "integration",
    "flows vs",
    "permission"
  ];
  const tourStorageKey = "ultimate-revision-tour-seen";
  const themeStorageKey = "ultimate-revision-theme";
  const sidebarStorageKey = "ultimate-revision-sidebar";
  const modeTourItems = [
    {
      mode: "browse",
      title: "Browse",
      tag: "Full library",
      action: "Swipe through every sheet.",
      result: "Left: Reviewed. Right: Revise."
    },
    {
      mode: "sprint",
      title: "Sprint",
      tag: "Hot topics",
      action: "Jump to interview-heavy sheets.",
      result: "Fast pass before the call."
    },
    {
      mode: "plan",
      title: "Plan",
      tag: "Timer blocks",
      action: "Follow one topic at a time.",
      result: "60-minute guided revision."
    },
    {
      mode: "cheatsheet",
      title: "Cheat",
      tag: "Prompt scan",
      action: "Open quick answer prompts.",
      result: "Speak crisp points fast."
    }
  ];
  const plans = {
    sprint15: [
      {
        title: "Execution & Security Core",
        minutes: 3,
        description: "Order of execution, OWD, sharing rules, and profiles vs permission sets.",
        topics: ["Admin"],
        terms: ["order of execution", "security", "owd", "profile", "permission"]
      },
      {
        title: "Async Apex & Limits",
        minutes: 3,
        description: "Governor limits, Future vs Queueable vs Batch comparison, and transaction boundaries.",
        topics: ["Apex"],
        terms: ["governor", "async", "queueable", "future", "batch"]
      },
      {
        title: "Triggers & Automation",
        minutes: 3,
        description: "Before vs after triggers, recursion prevention, and Flow vs Trigger decisions.",
        topics: ["Triggers", "Flows"],
        terms: ["before", "after", "recursion", "flows vs", "flow elements"]
      },
      {
        title: "LWC Architecture",
        minutes: 3,
        description: "Component lifecycle hooks, @wire vs Imperative Apex, and LDS client-side caching.",
        topics: ["LWC"],
        terms: ["lifecycle", "wire", "imperative", "lds", "lms"]
      },
      {
        title: "Integrations & Testing",
        minutes: 3,
        description: "Named Credentials, REST callouts, Test.startTest / Test.stopTest, and test boundaries.",
        topics: ["Integration", "Apex"],
        terms: ["named", "rest", "callout", "test"]
      }
    ],
    plan60: [
      {
        title: "Admin and Security",
        minutes: 10,
        description: "Profiles, permission sets, sharing, record types, approvals, and order of execution.",
        topics: ["Admin"],
        terms: ["security", "profile", "permission", "sharing", "record type", "approval", "order"]
      },
      {
        title: "Apex Core and Async",
        minutes: 12,
        description: "Governor limits, SOQL, tests, Queueable, Future, Batch, and async tradeoffs.",
        topics: ["Apex"],
        terms: ["governor", "async", "queueable", "future", "batch", "soql", "test"]
      },
      {
        title: "Triggers",
        minutes: 8,
        description: "Before vs after, recursion control, rollups, and trigger best practices.",
        topics: ["Triggers"],
        terms: ["trigger", "recursion", "rollup", "before", "after"]
      },
      {
        title: "LWC",
        minutes: 10,
        description: "Lifecycle, wire vs imperative, LDS, LMS, data fetch, and component communication.",
        topics: ["LWC"],
        terms: ["lwc", "wire", "imperative", "lds", "lms", "lifecycle"]
      },
      {
        title: "Integration",
        minutes: 8,
        description: "REST, callouts, Named Credentials, Connected Apps, and integration patterns.",
        topics: ["Integration"],
        terms: ["integration", "rest", "http", "named", "connected", "callout"]
      },
      {
        title: "Flows and Agentforce",
        minutes: 7,
        description: "Flow types, Flow vs Trigger decisions, grounding, trust layer, and agent types.",
        topics: ["Flows", "Agentforce"],
        terms: ["flow", "agent", "einstein", "grounding", "trust"]
      },
      {
        title: "OOP and Final Flags",
        minutes: 5,
        description: "OOP concepts plus any starred or weak material before the interview starts.",
        topics: ["OOP"],
        terms: ["interface", "abstract", "overloading", "overriding", "wrapper"],
        includeFlags: true
      }
    ]
  };

  const state = {
    topic: "All",
    mode: "browse",
    query: "",
    currentId: assets[0]?.id || "",
    revealed: true,
    promptIndex: 0,
    checklistVisible: false,
    progressFilter: null,
    planType: "sprint15",
    planIndex: 0,
    timerRemaining: plans.sprint15[0].minutes * 60,
    timerRunning: false,
    mobileChromeHidden: false,
    mobileSearchOpen: false,
    mobileModeOpen: false,
    mobileTopicsOpen: false,
    sidebarCollapsed: loadSidebarState(),
    deckComplete: false,
    viewMode: "sheet",
    zoom: 1,
    sheetState: "peek",
    zoomScale: 1,
    panX: 0,
    panY: 0,
    dockHidden: false,
    tourOpen: false,
    theme: loadTheme(),
    progress: loadProgress()
  };
  let timerId = null;
  let touchStartX = 0;
  let touchStartY = 0;
  let touchStartTime = 0;
  let lastSwipeTime = 0;
  let lastTapTime = 0;
  let pinchInitialDistance = 0;
  let pinchInitialScale = 1;
  let swipeDragging = false;
  let swipeWasHorizontal = false;
  let lastCatalogRefresh = 0;
  let catalogRefreshInFlight = null;
  let revealObserver = null;
  const mobileQuery = window.matchMedia("(max-width: 900px), (hover: none) and (pointer: coarse)");
  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const transparentPixel = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

  const els = {
    appShell: document.getElementById("appShell"),
    studyLayout: document.getElementById("studyLayout"),
    sidebarToggleBtn: document.getElementById("sidebarToggleBtn"),
    queueSection: document.getElementById("queueSection"),
    progressMenu: document.getElementById("progressMenu"),
    mobileProgressSummary: document.getElementById("mobileProgressSummary"),
    resetProgressBtn: document.getElementById("resetProgressBtn"),
    mobileTopicToggle: document.getElementById("mobileTopicToggle"),
    topicList: document.getElementById("topicList"),
    searchWrap: document.getElementById("searchWrap"),
    mobileSearchToggle: document.getElementById("mobileSearchToggle"),
    mobileModeToggle: document.getElementById("mobileModeToggle"),
    offlineStatus: document.getElementById("offlineStatus"),
    searchInput: document.getElementById("searchInput"),
    modeButtons: Array.from(document.querySelectorAll(".mode-btn")),
    tourBtn: document.getElementById("tourBtn"),
    tourModal: document.getElementById("tourModal"),
    tourCards: document.getElementById("tourCards"),
    tourCloseBtn: document.getElementById("tourCloseBtn"),
    tourLaterBtn: document.getElementById("tourLaterBtn"),
    tourStartBtn: document.getElementById("tourStartBtn"),
    themeToggleBtn: document.getElementById("themeToggleBtn"),
    activeTopicLabel: document.getElementById("activeTopicLabel"),
    assetTitle: document.getElementById("assetTitle"),
    assetTopic: document.getElementById("assetTopic"),
    assetPosition: document.getElementById("assetPosition"),
    assetType: document.getElementById("assetType"),
    assetImage: document.getElementById("assetImage"),
    assetPdf: document.getElementById("assetPdf"),
    viewer: document.getElementById("viewer"),
    emptyStage: document.getElementById("emptyStage"),
    stageWrap: document.querySelector(".stage-wrap"),
    assetGrid: document.getElementById("assetGrid"),
    queueSummary: document.getElementById("queueSummary"),
    reviewedCount: document.getElementById("reviewedCount"),
    starredCount: document.getElementById("starredCount"),
    weakCount: document.getElementById("weakCount"),
    filterReviewedBtn: document.getElementById("filterReviewedBtn"),
    filterStarredBtn: document.getElementById("filterStarredBtn"),
    filterWeakBtn: document.getElementById("filterWeakBtn"),
    activeProgressFilterBar: document.getElementById("activeProgressFilterBar"),
    activeFilterLabel: document.getElementById("activeFilterLabel"),
    clearProgressFilterBtn: document.getElementById("clearProgressFilterBtn"),
    reviewedBtn: document.getElementById("reviewedBtn"),
    starBtn: document.getElementById("starBtn"),
    weakBtn: document.getElementById("weakBtn"),
    prevBtn: document.getElementById("prevBtn"),
    nextBtn: document.getElementById("nextBtn"),
    fitSheetBtn: document.getElementById("fitSheetBtn"),
    fitWidthBtn: document.getElementById("fitWidthBtn"),
    mobileFullscreenBtn: document.getElementById("mobileFullscreenBtn"),
    mobileAssetMeta: document.getElementById("mobileAssetMeta"),
    mobileAssetTitle: document.getElementById("mobileAssetTitle"),
    assetStatusChip: document.getElementById("assetStatusChip"),
    decisionToast: document.getElementById("decisionToast"),
    completionPanel: document.getElementById("completionPanel"),
    completionSummary: document.getElementById("completionSummary"),
    nextTopicBtn: document.getElementById("nextTopicBtn"),
    continueRoundBtn: document.getElementById("continueRoundBtn"),
    zoomOutBtn: document.getElementById("zoomOutBtn"),
    zoomResetBtn: document.getElementById("zoomResetBtn"),
    zoomInBtn: document.getElementById("zoomInBtn"),
    openBtn: document.getElementById("openBtn"),
    recallPanel: document.getElementById("recallPanel"),
    recallPromptMeta: document.getElementById("recallPromptMeta"),
    recallQuestion: document.getElementById("recallQuestion"),
    revealBtn: document.getElementById("revealBtn"),
    flashcardPanel: document.getElementById("flashcardPanel"),
    flashcardMeta: document.getElementById("flashcardMeta"),
    flashcardQuestion: document.getElementById("flashcardQuestion"),
    prevPromptBtn: document.getElementById("prevPromptBtn"),
    nextPromptBtn: document.getElementById("nextPromptBtn"),
    shufflePromptBtn: document.getElementById("shufflePromptBtn"),
    startRecallBtn: document.getElementById("startRecallBtn"),
    checklistToggleBtn: document.getElementById("checklistToggleBtn"),
    answerChecklist: document.getElementById("answerChecklist"),
    answerChecklistItems: document.getElementById("answerChecklistItems"),
    planPanel: document.getElementById("planPanel"),
    planBackdrop: document.getElementById("planBackdrop"),
    planSprint15Btn: document.getElementById("planSprint15Btn"),
    planPlan60Btn: document.getElementById("planPlan60Btn"),
    planEyebrow: document.getElementById("planEyebrow"),
    planTitle: document.getElementById("planTitle"),
    planDescription: document.getElementById("planDescription"),
    planTimer: document.getElementById("planTimer"),
    planProgress: document.getElementById("planProgress"),
    planBlocks: document.getElementById("planBlocks"),
    prevPlanBtn: document.getElementById("prevPlanBtn"),
    nextPlanBtn: document.getElementById("nextPlanBtn"),
    timerToggleBtn: document.getElementById("timerToggleBtn"),
    timerResetBtn: document.getElementById("timerResetBtn"),
    planCloseBtn: document.getElementById("planCloseBtn"),
    cheatSheetPanel: document.getElementById("cheatSheetPanel"),
    cheatSheetSummary: document.getElementById("cheatSheetSummary"),
    cheatSheetGrid: document.getElementById("cheatSheetGrid"),
    fullscreenModal: document.getElementById("fullscreenModal"),
    fullscreenMeta: document.getElementById("fullscreenMeta"),
    fullscreenTitle: document.getElementById("fullscreenTitle"),
    fullscreenViewer: document.getElementById("fullscreenViewer"),
    fullscreenImage: document.getElementById("fullscreenImage"),
    fullscreenPdf: document.getElementById("fullscreenPdf"),
    fullscreenCloseBtn: document.getElementById("fullscreenCloseBtn"),
    fullscreenPrevBtn: document.getElementById("fullscreenPrevBtn"),
    fullscreenNextBtn: document.getElementById("fullscreenNextBtn"),
    bottomDock: document.getElementById("bottomDock"),
    dockTopicBtn: document.getElementById("dockTopicBtn"),
    dockTopicIcon: document.getElementById("dockTopicIcon"),
    dockTopicLabel: document.getElementById("dockTopicLabel"),
    dockPrevBtn: document.getElementById("dockPrevBtn"),
    dockCenterBtn: document.getElementById("dockCenterBtn"),
    dockCenterProgress: document.getElementById("dockCenterProgress"),
    dockCenterHint: document.getElementById("dockCenterHint"),
    dockNextBtn: document.getElementById("dockNextBtn"),
    dockModeBtn: document.getElementById("dockModeBtn"),
    dockModeIcon: document.getElementById("dockModeIcon"),
    dockModeLabel: document.getElementById("dockModeLabel"),
    studyInfoSheet: document.getElementById("studyInfoSheet"),
    sheetDragHandle: document.getElementById("sheetDragHandle"),
    mobileSheetBackdrop: document.getElementById("mobileSheetBackdrop"),
    zoomHud: document.getElementById("zoomHud"),
    zoomHudValue: document.getElementById("zoomHudValue")
  };

  function loadProgress() {
    try {
      return JSON.parse(localStorage.getItem("sfdc-study-progress") || "{}");
    } catch {
      return {};
    }
  }

  function loadTheme() {
    try {
      return localStorage.getItem(themeStorageKey) === "dark" ? "dark" : "light";
    } catch {
      return "light";
    }
  }

  function loadSidebarState() {
    try {
      return localStorage.getItem(sidebarStorageKey) === "collapsed";
    } catch {
      return false;
    }
  }

  function saveProgress() {
    localStorage.setItem("sfdc-study-progress", JSON.stringify(state.progress));
  }

  function resetProgress() {
    const hasProgress = Object.values(state.progress).some((item) => item.reviewed || item.starred || item.weak);
    if (!hasProgress) return;
    const confirmed = window.confirm("Reset all Reviewed, Starred, and Revise marks?");
    if (!confirmed) return;
    state.progress = {};
    state.deckComplete = false;
    saveProgress();
    render();
    showDecisionToast("Progress reset");
  }

  function saveTheme() {
    try {
      localStorage.setItem(themeStorageKey, state.theme);
    } catch {
      // Theme still works for this session if storage is unavailable.
    }
  }

  function saveSidebarState() {
    try {
      localStorage.setItem(sidebarStorageKey, state.sidebarCollapsed ? "collapsed" : "expanded");
    } catch {
      // Sidebar state can remain session-only if storage is unavailable.
    }
  }

  function triggerHaptic(type = "light") {
    if (!("vibrate" in navigator)) return;
    try {
      if (type === "light") navigator.vibrate(12);
      else if (type === "medium") navigator.vibrate(24);
      else if (type === "star") navigator.vibrate([15, 35, 18]);
      else if (type === "timer") navigator.vibrate([70, 50, 70]);
    } catch {}
  }

  function setSheetState(nextState) {
    state.sheetState = nextState;
    if (els.studyInfoSheet) {
      els.studyInfoSheet.classList.remove("peek", "half", "full");
      els.studyInfoSheet.classList.add(nextState);
    }
    if (els.mobileSheetBackdrop) {
      els.mobileSheetBackdrop.classList.toggle("hidden", nextState === "peek");
    }
    if (els.dockCenterHint) {
      els.dockCenterHint.textContent = nextState === "peek" ? "Prompt" : "Hide";
    }
  }

  function applyViewerTransform() {
    if (!els.assetImage) return;
    if (state.zoomScale <= 1.02) {
      els.assetImage.style.transform = "";
      if (els.zoomHud) els.zoomHud.classList.add("hidden");
      if (els.bottomDock) els.bottomDock.classList.remove("dock-hidden");
    } else {
      els.assetImage.style.transform = `translate3d(${state.panX}px, ${state.panY}px, 0) scale(${state.zoomScale})`;
      if (els.zoomHud) {
        els.zoomHud.classList.remove("hidden");
        if (els.zoomHudValue) els.zoomHudValue.textContent = `${Math.round(state.zoomScale * 100)}%`;
      }
      if (els.bottomDock && isMobileExperience()) {
        els.bottomDock.classList.add("dock-hidden");
      }
    }
  }

  function resetZoom() {
    state.zoomScale = 1;
    state.panX = 0;
    state.panY = 0;
    applyViewerTransform();
    triggerHaptic("light");
  }

  function assetProgress(id) {
    if (!state.progress[id]) {
      state.progress[id] = { reviewed: false, starred: false, weak: false };
    }
    normalizeProgress(state.progress[id]);
    return state.progress[id];
  }

  function normalizeProgress(progress, preferredKey = "") {
    if (!progress) return;
    if (progress.reviewed && progress.weak) {
      if (preferredKey === "weak") {
        progress.reviewed = false;
      } else {
        progress.weak = false;
      }
    }
  }

  function readableBytes(bytes) {
    if (!bytes) return "";
    const mb = bytes / 1024 / 1024;
    return `${mb.toFixed(mb >= 10 ? 0 : 1)} MB`;
  }

  function encodedPath(asset) {
    const version = asset.version || `${asset.size || 0}-${asset.modifiedMs || ""}`;
    const separator = asset.path.includes("?") ? "&" : "?";
    return `${encodeURI(asset.path)}${separator}v=${encodeURIComponent(version)}`;
  }

  function cleanTitle(asset) {
    return asset.title
      .replace(/\bVS\b/gi, "vs")
      .replace(/\bQNS\b/gi, "questions")
      .replace(/\bAPEX\b/g, "Apex")
      .replace(/\bLWC\b/g, "LWC")
      .replace(/\bSFDC\b/g, "Salesforce")
      .replace(/\s+/g, " ")
      .trim();
  }

  function uniquePrompts(prompts) {
    const seen = new Set();
    return prompts.filter((prompt) => {
      const key = prompt.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function curatedPointForAsset(asset) {
    if (!asset || !Array.isArray(window.INTERVIEW_TALKING_POINTS)) return null;
    const haystack = `${asset.title} ${asset.fileName} ${asset.topic}`.toLowerCase();
    return window.INTERVIEW_TALKING_POINTS.find((item) => {
      return item.patterns.some((pattern) => pattern.test(haystack));
    }) || null;
  }

  function promptsForAsset(asset) {
    const curated = curatedPointForAsset(asset);
    if (curated) {
      return [
        curated.question,
        `30-Second Answer: ${curated.answer30s}`,
        `Real-World Scenario: ${curated.example}`,
        `Senior Follow-Up: ${curated.followUp}`,
        `Gotcha / Trap: ${curated.gotcha}`
      ];
    }
    const title = cleanTitle(asset);
    const haystack = `${asset.title} ${asset.topic} ${asset.fileName}`.toLowerCase();
    const prompts = [
      `Explain ${title} in 60 seconds as if an interviewer asked you directly.`,
      `What are the most common mistakes or misconceptions around ${title}?`,
      `Give one real Salesforce project scenario where ${title} matters.`
    ];

    const rules = [
      [/profile|permission set|security|ols|fls|sharing/, [
        "Walk through how you would debug a user who cannot see or edit a record.",
        "How do object permissions, field permissions, sharing, and role hierarchy work together?",
        "What security checks should you mention when Apex or LWC exposes Salesforce data?"
      ]],
      [/order.of.execution|trigger|recursion|beforevsafter|before vs after/, [
        "Describe Salesforce order of execution from save to commit.",
        "When would you choose a before trigger instead of an after trigger?",
        "How would you prevent trigger recursion without breaking bulk processing?"
      ]],
      [/governor|batch|queueable|future|async|callable/, [
        "Compare Future, Queueable, Batch, and Scheduled Apex. When would you choose each?",
        "How do governor limits change your Apex design in bulk data scenarios?",
        "How would you test asynchronous Apex cleanly?"
      ]],
      [/lwc|wire|lds|lms|lifecycle|record.form|imperative/, [
        "Explain the LWC lifecycle hooks in the order they run.",
        "When would you use wire, imperative Apex, LDS, or Lightning Message Service?",
        "How would you debug an LWC that is not refreshing after record changes?"
      ]],
      [/flow|screen|autolaunched|record.triggered|platform.event/, [
        "When would you choose Flow over Apex, and when would you avoid Flow?",
        "Compare screen, record-triggered, autolaunched, and platform-event-triggered flows.",
        "What should you check before moving complex automation into Flow?"
      ]],
      [/integration|rest|http|named.cred|connected.app|inbound|outbound|external.credential/, [
        "Explain inbound vs outbound integration using a concrete Salesforce example.",
        "How do Named Credentials, External Credentials, and Connected Apps differ?",
        "How would you design a secure REST callout from Salesforce?"
      ]],
      [/approval|assignment|escalation|record.type|page.layout|audit|field.tracking/, [
        "Which admin configuration would you choose here, and what tradeoffs would you mention?",
        "What questions would you ask the business before configuring this feature?",
        "How would you troubleshoot this setup in production?"
      ]],
      [/agent|einstein|trust.layer|grounding/, [
        "Explain how grounding improves an AI agent answer in Salesforce.",
        "What risks should you discuss when an Agentforce agent can access customer data?",
        "How would you decide which type of agent to use for a business process?"
      ]],
      [/agile|scrum|ceremon|artifact|lifecycle|metric/, [
        "Explain this Agile concept using a Salesforce delivery project example.",
        "What would you say if asked about your role in this ceremony or artifact?",
        "Which Agile metric here can become misleading, and why?"
      ]]
    ];

    rules.forEach(([pattern, additions]) => {
      if (pattern.test(haystack)) prompts.push(...additions);
    });

    return uniquePrompts(prompts).slice(0, 6);
  }

  function currentPrompts(asset) {
    return asset ? promptsForAsset(asset) : ["Pick a study item to see flashcard prompts."];
  }

  function currentPrompt(asset) {
    const prompts = currentPrompts(asset);
    const index = Math.min(state.promptIndex, prompts.length - 1);
    return { prompts, index, text: prompts[index] };
  }

  function checklistForAsset(asset) {
    const title = cleanTitle(asset);
    const haystack = `${asset.title} ${asset.topic} ${asset.fileName}`.toLowerCase();
    const items = [
      `Start with a one-line definition of ${title}.`,
      "Mention when you would use it in a real Salesforce project.",
      "Call out one limitation, risk, or common interview trap.",
      "Close with a crisp example instead of only theory."
    ];

    const rules = [
      [/profile|permission set|security|ols|fls|sharing/, [
        "Separate object access, field access, record access, and UI visibility.",
        "Mention role hierarchy, sharing rules, manual sharing, and teams only where relevant.",
        "For Apex/LWC, include CRUD/FLS checks and sharing context.",
        "Use a debugging flow: user, profile, permission set, field, record, page/app."
      ]],
      [/order.of.execution|trigger|recursion|beforevsafter|before vs after/, [
        "State what happens before save, after save, workflow/flow updates, and commit.",
        "Explain before triggers for validation/defaulting and after triggers for related records.",
        "Mention bulkification, no SOQL/DML in loops, and recursion guards.",
        "Include how you test trigger behavior with multiple records."
      ]],
      [/governor|batch|queueable|future|async|callable/, [
        "Compare transaction boundaries and when each async tool is appropriate.",
        "Mention governor limits and how bulk data changes the design.",
        "For Batch Apex, include start, execute, finish, and chunking.",
        "For tests, mention Test.startTest() and Test.stopTest()."
      ]],
      [/lwc|wire|lds|lms|lifecycle|record.form|imperative/, [
        "Contrast wire, imperative Apex, LDS, and base record forms.",
        "Mention lifecycle hooks only in the order they matter.",
        "Explain parent-child, child-parent, and sibling communication options.",
        "Include refresh/debugging approaches for stale UI data."
      ]],
      [/flow|screen|autolaunched|record.triggered|platform.event/, [
        "Name the flow type and what event starts it.",
        "Explain when Flow is better than Apex and when Apex is safer.",
        "Mention limits, fault paths, transaction behavior, and debugging.",
        "Include how this automation fits order of execution."
      ]],
      [/integration|rest|http|named.cred|connected.app|inbound|outbound|external.credential/, [
        "Clarify inbound vs outbound from Salesforce's point of view.",
        "Mention authentication, Named Credentials or Connected Apps, and secret handling.",
        "Cover error handling, retry strategy, limits, and logging.",
        "Use a concrete request/response example."
      ]],
      [/agent|einstein|trust.layer|grounding/, [
        "Explain grounding as using trusted context to improve answers.",
        "Mention data access, permissions, auditability, and trust boundaries.",
        "Clarify the business action the agent can take, not just the chat answer.",
        "Include fallback or human handoff for risky actions."
      ]],
      [/interface|abstract|overloading|overriding|wrapper|oops/, [
        "Define the OOP concept in language-neutral terms first.",
        "Connect it back to Apex syntax or Salesforce use cases.",
        "Compare similar concepts directly, not separately.",
        "Give a short code-level scenario verbally."
      ]],
      [/agile|scrum|ceremon|artifact|lifecycle|metric/, [
        "Tie the concept to a Salesforce delivery example.",
        "Mention your role, inputs, output, and follow-up action.",
        "Avoid textbook-only answers; describe a real team behavior.",
        "Call out where the metric or ceremony can be misused."
      ]]
    ];

    rules.forEach(([pattern, additions]) => {
      if (pattern.test(haystack)) items.push(...additions);
    });

    return uniquePrompts(items).slice(0, 6);
  }

  function formatTime(seconds) {
    const safeSeconds = Math.max(0, seconds);
    const minutes = Math.floor(safeSeconds / 60).toString().padStart(2, "0");
    const rest = (safeSeconds % 60).toString().padStart(2, "0");
    return `${minutes}:${rest}`;
  }

  function activePlans() {
    return plans[state.planType] || plans.sprint15;
  }

  function activePlan() {
    const list = activePlans();
    return list[state.planIndex] || list[0];
  }

  function catalogSignature(items) {
    return items.map((asset) => `${asset.id}:${asset.size}:${asset.modifiedMs || ""}:${asset.version || ""}`).join("|");
  }

  function topicsSignature(items) {
    return items.join("|");
  }

  function derivedTopics(items = assets) {
    const topics = new Set(catalogTopics);
    items.forEach((asset) => topics.add(asset.topic));
    return Array.from(topics).filter(Boolean).sort((a, b) => a.localeCompare(b));
  }

  function applyCatalog(catalog) {
    const nextAssets = Array.isArray(catalog?.assets) ? catalog.assets : Array.isArray(catalog) ? catalog : [];
    if (!Array.isArray(nextAssets)) return false;
    const previousSignature = catalogSignature(assets);
    const previousTopicsSignature = topicsSignature(catalogTopics);
    const nextSignature = catalogSignature(nextAssets);
    const nextTopics = Array.isArray(catalog?.topics) ? catalog.topics : Array.from(new Set(nextAssets.map((asset) => asset.topic))).sort((a, b) => a.localeCompare(b));
    const nextTopicsSignature = topicsSignature(nextTopics);
    if (previousSignature === nextSignature && previousTopicsSignature === nextTopicsSignature) return false;

    assets = nextAssets;
    catalogTopics = nextTopics;
    window.STUDY_ASSETS = nextAssets;
    window.STUDY_TOPICS = nextTopics;
    const list = filteredAssets();
    if (!assets.some((asset) => asset.id === state.currentId)) {
      state.currentId = list[0]?.id || assets[0]?.id || "";
      state.deckComplete = false;
    }
    render();
    return true;
  }

  async function refreshCatalog(force = false) {
    if (location.protocol === "file:") return false;
    const now = Date.now();
    if (!force && now - lastCatalogRefresh < 2000) return false;
    if (catalogRefreshInFlight) return catalogRefreshInFlight;

    lastCatalogRefresh = now;
    catalogRefreshInFlight = (async () => {
      try {
        const response = await fetch(`./catalog.json?refresh=${Date.now()}`, { cache: "no-store" });
        if (!response.ok) return false;
        const catalog = await response.json();
        const changed = applyCatalog(catalog);
        if (changed && navigator.serviceWorker?.controller) {
          navigator.serviceWorker.controller.postMessage({ type: "CACHE_STUDY_ASSETS" });
        }
        return changed;
      } catch (error) {
        console.warn("Catalog refresh failed", error);
        return false;
      } finally {
        catalogRefreshInFlight = null;
      }
    })();

    return catalogRefreshInFlight;
  }

  function assetMatchesPlan(asset, plan) {
    const progress = assetProgress(asset.id);
    const haystack = `${asset.title} ${asset.topic} ${asset.fileName}`.toLowerCase();
    const topicMatch = plan.topics.includes(asset.topic);
    const termMatch = plan.terms.some((term) => haystack.includes(term));
    const flagMatch = plan.includeFlags && (progress.starred || progress.weak);
    return topicMatch || termMatch || flagMatch;
  }

  function searchScore(asset, query) {
    const title = asset.title.toLowerCase();
    const topic = asset.topic.toLowerCase();
    const fileName = asset.fileName.toLowerCase();
    let score = 0;
    if (topic === query) score += 100;
    if (topic.includes(query)) score += 70;
    if (title.startsWith(query)) score += 55;
    if (title.includes(query)) score += 35;
    if (fileName.includes(query)) score += 15;
    return score;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;"
    }[character]));
  }

  function topicIcon(topic) {
    const key = topic.toLowerCase();
    const icons = {
      all: '<path d="M7 4h4v4H7V4Zm6 0h4v4h-4V4ZM7 10h4v4H7v-4Zm6 0h4v4h-4v-4ZM7 16h4v4H7v-4Zm6 0h4v4h-4v-4Z"/>',
      admin: '<path d="M12 3 5.5 5.6v5.5c0 4.1 2.6 7.8 6.5 9.2 3.9-1.4 6.5-5.1 6.5-9.2V5.6L12 3Zm0 2.2 4.5 1.8v4.1c0 2.9-1.7 5.6-4.5 6.9-2.8-1.3-4.5-4-4.5-6.9V7l4.5-1.8Zm0 3.1a2.1 2.1 0 1 0 0 4.2 2.1 2.1 0 0 0 0-4.2Zm-3.2 7.1c.7-1.5 1.8-2.2 3.2-2.2s2.5.7 3.2 2.2c-.8.8-1.9 1.4-3.2 1.9-1.3-.5-2.4-1.1-3.2-1.9Z"/>',
      agentforce: '<path d="m12 2 1.2 4.3L17.5 5l-1.3 4.3 4.3 1.2-4.3 1.2 1.3 4.3-4.3-1.3L12 19l-1.2-4.3L6.5 16l1.3-4.3-4.3-1.2 4.3-1.2L6.5 5l4.3 1.3L12 2Zm0 5.8a2.7 2.7 0 1 0 0 5.4 2.7 2.7 0 0 0 0-5.4Z"/>',
      "agile methodology": '<path d="M6.4 7.1A7.3 7.3 0 0 1 18.7 9h-2.4l3.5 3.5L23 9h-2.1A9.3 9.3 0 0 0 4.9 5.7L6.4 7.1Zm11.2 9.8A7.3 7.3 0 0 1 5.3 15h2.4l-3.5-3.5L1 15h2.1a9.3 9.3 0 0 0 16 3.3l-1.5-1.4ZM12 8l3.3 2v4L12 16l-3.3-2v-4L12 8Z"/>',
      apex: '<path d="m8.8 7.2-4.1 4.1 4.1 4.1-1.4 1.4L1.9 11.3l5.5-5.5 1.4 1.4Zm6.4 0 1.4-1.4 5.5 5.5-5.5 5.5-1.4-1.4 4.1-4.1-4.1-4.1ZM13.7 4l1.9.6L10.3 20l-1.9-.6L13.7 4Z"/>',
      flows: '<path d="M5 4h5v5H5V4Zm9 0h5v5h-5V4ZM5 15h5v5H5v-5Zm4.5-8.5h5M16.5 9v2.5a2 2 0 0 1-2 2H9.5V15M7.5 9v2.5a2 2 0 0 0 2 2h5V15" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
      integration: '<path d="M8.3 11.3 6.9 9.9l3-3a4.3 4.3 0 0 1 6.1 0 4.3 4.3 0 0 1 0 6.1l-2.1 2.1-1.4-1.4 2.1-2.1a2.3 2.3 0 0 0-3.3-3.3l-3 3Zm7.4 1.4 1.4 1.4-3 3a4.3 4.3 0 0 1-6.1 0 4.3 4.3 0 0 1 0-6.1l2.1-2.1 1.4 1.4-2.1 2.1a2.3 2.3 0 0 0 3.3 3.3l3-3Zm-5.6 1.8 4.4-4.4 1.4 1.4-4.4 4.4-1.4-1.4Z"/>',
      lwc: '<path d="M4 5h16v11H4V5Zm2 2v7h12V7H6Zm3 11h6l1 2H8l1-2Zm1-9h2v2h-2V9Zm4 0h2v2h-2V9Zm-4 3h6v1.5h-6V12Z"/>',
      omnistudio: '<path d="M12 2 2 7l10 5 10-5-10-5ZM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
      oop: '<path d="M12 2.5 4.5 6.4v8.2L12 21.5l7.5-6.9V6.4L12 2.5Zm0 2.2 4.6 2.4L12 9.5 7.4 7.1 12 4.7ZM6.5 8.8l4.5 2.4v6.8l-4.5-4.1V8.8Zm11 0v5.1L13 18v-6.8l4.5-2.4Z"/>',
      overview: '<path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm3.9 5.1-2.2 5.6-5.6 2.2 2.2-5.6 5.6-2.2Zm-3.9 4.8a.9.9 0 1 0 0-1.8.9.9 0 0 0 0 1.8Z"/>',
      "project deliverable": '<path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2Zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1Zm-2 14-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8Z"/>',
      triggers: '<path d="M13 2 4.5 13h6L9 22l10.5-13H13l0-7Z"/>'
    };
    const path = icons[key] || icons.all;
    return `<span class="topic-icon" aria-hidden="true"><svg viewBox="0 0 24 24">${path}</svg></span>`;
  }

  function modeIcon(mode) {
    const icons = {
      browse: '<path d="M5 4h14v3H5V4Zm0 5h6v11H5V9Zm8 0h6v5h-6V9Zm0 7h6v4h-6v-4Z"/>',
      sprint: '<path d="m13 2-8 11h5l-1 9 10-13h-5l-1-7Z"/>',
      plan: '<path d="M7 3h10v2h3v16H4V5h3V3Zm0 4H6v12h12V7h-1v2h-2V7H9v2H7V7Zm1 5h8v2H8v-2Zm0 4h5v2H8v-2Z"/>',
      cheatsheet: '<path d="M6 3h9l3 3v15H6V3Zm8 2.5V7h1.5L14 5.5ZM8 9h8v2H8V9Zm0 4h8v2H8v-2Zm0 4h5v2H8v-2Z"/>'
    };
    const path = icons[mode] || icons.browse;
    return `<span class="tour-mode-icon" aria-hidden="true"><svg viewBox="0 0 24 24">${path}</svg></span>`;
  }

  function topicCounts() {
    const counts = new Map();
    derivedTopics().forEach((topic) => counts.set(topic, 0));
    assets.forEach((asset) => counts.set(asset.topic, (counts.get(asset.topic) || 0) + 1));
    return [["All", assets.length], ...Array.from(counts.entries()).sort((a, b) => a[0].localeCompare(b[0]))];
  }

  function selectableTopics() {
    return topicCounts().filter(([topic]) => topic !== "All");
  }

  function filteredAssets() {
    const query = state.query.trim().toLowerCase();
    const hasQuery = query.length > 0;
    const matches = assets.filter((asset) => {
      const progress = assetProgress(asset.id);
      const matchesProgressFilter = !state.progressFilter || Boolean(progress[state.progressFilter]);
      const haystack = `${asset.title} ${asset.topic} ${asset.fileName}`.toLowerCase();
      const matchesTopic = hasQuery || state.topic === "All" || asset.topic === state.topic;
      const matchesSearch = !query || haystack.includes(query);
      const matchesSprint = state.mode !== "sprint" || sprintTopics.some((term) => haystack.includes(term));
      const matchesPlan = state.mode !== "plan" || assetMatchesPlan(asset, activePlan());
      return matchesProgressFilter && matchesTopic && matchesSearch && matchesSprint && matchesPlan;
    });
    if (!hasQuery) return matches;
    return matches.sort((a, b) => searchScore(b, query) - searchScore(a, query) || a.title.localeCompare(b.title));
  }

  function currentAsset(list = filteredAssets()) {
    return list.find((asset) => asset.id === state.currentId) || list[0] || null;
  }

  function setCurrent(id) {
    state.currentId = id;
    state.revealed = state.mode !== "recall";
    state.promptIndex = 0;
    state.checklistVisible = false;
    state.deckComplete = false;
    state.zoom = 1;
    render();
  }

  function adjacentAsset(list, currentId, direction = 1) {
    if (!list.length) return null;
    if (list.length === 1) return list[0];
    const index = Math.max(0, list.findIndex((asset) => asset.id === currentId));
    const nextIndex = (index + direction + list.length) % list.length;
    return list[nextIndex];
  }

  function preloadAsset(asset) {
    if (!asset || asset.type !== "image") return;
    const image = new Image();
    image.src = encodedPath(asset);
  }

  function nextAssetInRound(list, currentId) {
    if (list.length <= 1) return null;
    const index = list.findIndex((asset) => asset.id === currentId);
    if (index < 0) return list[0];
    return index < list.length - 1 ? list[index + 1] : null;
  }

  function renderTopics() {
    els.topicList.innerHTML = "";
    topicCounts().forEach(([topic, count]) => {
      const btn = document.createElement("button");
      btn.dataset.topic = topic;
      btn.title = topic;
      btn.className = `topic-btn${state.topic === topic ? " active" : ""}`;
      btn.innerHTML = `${topicIcon(topic)}<strong>${escapeHtml(topic)}</strong><span class="topic-count">${count}</span>`;
      btn.addEventListener("click", () => {
        state.topic = topic;
        state.query = "";
        els.searchInput.value = "";
        state.mobileSearchOpen = false;
        state.mobileTopicsOpen = false;
        const first = filteredAssets()[0] || assets[0];
        if (first) setCurrent(first.id);
      });
      els.topicList.appendChild(btn);
    });
  }

  function renderProgressCounts() {
    const values = Object.values(state.progress);
    let cleaned = false;
    values.forEach((item) => {
      const wasBoth = item.reviewed && item.weak;
      normalizeProgress(item);
      cleaned = cleaned || wasBoth;
    });
    if (cleaned) saveProgress();
    const reviewed = values.filter((item) => item.reviewed).length;
    const starred = values.filter((item) => item.starred).length;
    const weak = values.filter((item) => item.weak).length;
    els.reviewedCount.textContent = reviewed;
    els.starredCount.textContent = starred;
    els.weakCount.textContent = weak;
    els.mobileProgressSummary.textContent = isMobileExperience() ? `${reviewed}R / ${weak} revise` : `${reviewed} reviewed - ${weak} revise`;
    els.resetProgressBtn.disabled = reviewed + starred + weak === 0;

    els.filterReviewedBtn?.classList.toggle("active", state.progressFilter === "reviewed");
    els.filterReviewedBtn?.setAttribute("aria-pressed", String(state.progressFilter === "reviewed"));
    els.filterStarredBtn?.classList.toggle("active", state.progressFilter === "starred");
    els.filterStarredBtn?.setAttribute("aria-pressed", String(state.progressFilter === "starred"));
    els.filterWeakBtn?.classList.toggle("active", state.progressFilter === "weak");
    els.filterWeakBtn?.setAttribute("aria-pressed", String(state.progressFilter === "weak"));

    if (els.activeProgressFilterBar) {
      if (state.progressFilter) {
        const labels = { reviewed: "Reviewed", starred: "Starred", weak: "Need revision" };
        const activeCount = state.progressFilter === "reviewed" ? reviewed : state.progressFilter === "starred" ? starred : weak;
        els.activeFilterLabel.textContent = `Showing: ${labels[state.progressFilter]} (${activeCount})`;
        els.activeProgressFilterBar.classList.remove("hidden");
      } else {
        els.activeProgressFilterBar.classList.add("hidden");
      }
    }
  }

  function toggleProgressFilter(filterKey) {
    state.progressFilter = state.progressFilter === filterKey ? null : filterKey;
    state.deckComplete = false;
    const first = filteredAssets()[0];
    if (first) setCurrent(first.id);
    render();
  }

  function clearProgressFilter() {
    state.progressFilter = null;
    state.deckComplete = false;
    const first = filteredAssets()[0];
    if (first) setCurrent(first.id);
    render();
  }

  function renderCompletionPanel(list) {
    const reviewed = list.filter((asset) => assetProgress(asset.id).reviewed).length;
    const weak = list.filter((asset) => assetProgress(asset.id).weak).length;
    const topics = selectableTopics();
    const currentIndex = topics.findIndex(([topic]) => topic === state.topic);
    const nextTopic = currentIndex >= 0 ? topics[(currentIndex + 1) % topics.length]?.[0] : topics[0]?.[0];
    els.completionSummary.textContent = `${list.length} sheets finished. ${reviewed} reviewed, ${weak} need revision. Start over anytime or continue to ${nextTopic || "the next topic"}.`;
    els.nextTopicBtn.disabled = !nextTopic;
    els.nextTopicBtn.textContent = nextTopic ? `Next: ${nextTopic}` : "Next topic";
    els.stageWrap.classList.toggle("deck-complete", state.deckComplete);
    els.completionPanel.classList.toggle("hidden", !state.deckComplete);
  }

  function firstAssetForTopic(topic) {
    return assets.find((asset) => topic === "All" || asset.topic === topic) || assets[0];
  }

  function goToNextTopic() {
    const topics = selectableTopics();
    if (!topics.length) return;
    const foundIndex = topics.findIndex(([topic]) => topic === state.topic);
    const currentIndex = foundIndex >= 0 ? foundIndex : -1;
    const nextTopic = topics[(currentIndex + 1) % topics.length]?.[0];
    if (!nextTopic) return;
    state.topic = nextTopic;
    state.mobileTopicsOpen = false;
    state.deckComplete = false;
    const first = firstAssetForTopic(nextTopic);
    if (first) setCurrent(first.id);
  }

  function restartCurrentTopic() {
    state.deckComplete = false;
    const first = filteredAssets()[0] || assets[0];
    if (first) setCurrent(first.id);
  }

  function renderViewer(asset, index, list) {
    if (!asset) return;
    els.emptyStage.classList.add("hidden");
    els.mobileFullscreenBtn.classList.remove("hidden");
    const progress = assetProgress(asset.id);
    const hiddenForRecall = state.mode === "recall" && !state.revealed;
    const prompt = currentPrompt(asset);
    const imageZoomed = asset.type === "image" && state.viewMode === "zoomed";
    const checklist = checklistForAsset(asset);

    els.activeTopicLabel.textContent = state.query.trim()
      ? "Search results"
      : state.mode === "sprint" ? "Priority sprint" : state.mode === "plan" ? activePlan().title : state.topic;
    els.assetTitle.textContent = asset.title;
    els.mobileAssetTitle.textContent = asset.title;
    els.mobileAssetMeta.textContent = `${asset.topic} - ${index + 1} / ${list.length}`;
    els.assetTopic.textContent = asset.topic;
    els.assetPosition.textContent = `${index + 1} / ${list.length}`;
    if (els.assetType) {
      els.assetType.textContent = asset.type === "pdf" ? "PDF" : "Image";
    }
    els.recallPromptMeta.textContent = `Flashcard ${prompt.index + 1} of ${prompt.prompts.length}`;
    els.recallQuestion.textContent = prompt.text;
    els.flashcardMeta.textContent = `Flashcard ${prompt.index + 1} of ${prompt.prompts.length}`;
    els.flashcardQuestion.textContent = prompt.text;
    els.checklistToggleBtn.textContent = state.checklistVisible ? "Hide checklist" : "Show checklist";
    els.answerChecklist.classList.toggle("hidden", !state.checklistVisible);
    els.answerChecklistItems.innerHTML = "";
    const curated = curatedPointForAsset(asset);
    if (curated) {
      const card = document.createElement("div");
      card.className = "interview-point-card";
      card.innerHTML = `
        <div class="talking-point-item point-question">
          <strong>🎯 Interview Question</strong>
          <p>${escapeHtml(curated.question)}</p>
        </div>
        <div class="talking-point-item point-answer">
          <strong>⚡ 30-Second Pitch</strong>
          <p>${escapeHtml(curated.answer30s)}</p>
        </div>
        <div class="talking-point-item point-example">
          <strong>🏢 Real-World Example</strong>
          <p>${escapeHtml(curated.example)}</p>
        </div>
        <div class="talking-point-item point-followup">
          <strong>🔍 Senior Follow-Up</strong>
          <p>${escapeHtml(curated.followUp)}</p>
        </div>
        <div class="talking-point-item point-gotcha">
          <strong>⚠️ Common Trap / Gotcha</strong>
          <p>${escapeHtml(curated.gotcha)}</p>
        </div>
      `;
      els.answerChecklistItems.appendChild(card);
    } else {
      checklist.forEach((item) => {
        const li = document.createElement("li");
        li.textContent = item;
        els.answerChecklistItems.appendChild(li);
      });
    }
    els.recallPanel.classList.toggle("hidden", state.mode !== "recall" || state.revealed);
    els.flashcardPanel.classList.toggle("hidden", state.mode === "recall" && !state.revealed);
    els.viewer.classList.toggle("hidden", hiddenForRecall);

    els.assetImage.style.display = asset.type === "image" && !hiddenForRecall ? "block" : "none";
    els.assetPdf.style.display = asset.type === "pdf" && !hiddenForRecall ? "block" : "none";
    els.viewer.classList.toggle("fit-width", asset.type === "image" && state.viewMode === "width");
    els.viewer.classList.toggle("zoomed", imageZoomed);

    if (asset.type === "image") {
      const imageSrc = encodedPath(asset);
      els.assetImage.alt = `${asset.title} infographic`;
      els.assetImage.style.transform = imageZoomed ? `scale(${state.zoom})` : "none";
      els.assetPdf.removeAttribute("src");
      if (els.assetImage.dataset.currentSrc !== imageSrc) {
        els.viewer.classList.add("loading");
        els.assetImage.style.opacity = "0";
        els.assetImage.dataset.currentSrc = imageSrc;
        els.assetImage.onload = () => {
          if (els.assetImage.dataset.currentSrc !== imageSrc) return;
          els.viewer.classList.remove("loading");
          els.assetImage.style.opacity = "1";
        };
        els.assetImage.onerror = () => {
          if (els.assetImage.dataset.currentSrc !== imageSrc) return;
          els.viewer.classList.remove("loading");
          els.assetImage.style.opacity = "1";
        };
        els.assetImage.src = transparentPixel;
        window.requestAnimationFrame(() => {
          if (els.assetImage.dataset.currentSrc === imageSrc) {
            els.assetImage.src = imageSrc;
          }
        });
      } else if (els.assetImage.complete && els.assetImage.naturalWidth > 1) {
        els.viewer.classList.remove("loading");
        els.assetImage.style.opacity = "1";
      }
      preloadAsset(adjacentAsset(list, asset.id, 1));
    } else {
      els.assetPdf.src = encodedPath(asset);
      els.assetImage.removeAttribute("src");
      delete els.assetImage.dataset.currentSrc;
      els.viewer.classList.remove("loading");
      state.zoom = 1;
    }

    els.reviewedBtn.classList.toggle("active", progress.reviewed);
    els.starBtn.classList.toggle("active", progress.starred);
    els.weakBtn.classList.toggle("active", progress.weak);
    els.assetStatusChip.classList.toggle("hidden", !progress.reviewed && !progress.weak);
    els.assetStatusChip.classList.toggle("reviewed", progress.reviewed);
    els.assetStatusChip.classList.toggle("revise", progress.weak);
    els.assetStatusChip.textContent = progress.reviewed ? "Reviewed" : progress.weak ? "Revise" : "";
    els.zoomResetBtn.textContent = `${Math.round(state.zoom * 100)}%`;
    els.fitSheetBtn.classList.toggle("active", state.viewMode === "sheet");
    els.fitWidthBtn.classList.toggle("active", state.viewMode === "width");
    els.fitSheetBtn.disabled = asset.type !== "image";
    els.fitWidthBtn.disabled = asset.type !== "image";
    els.zoomOutBtn.disabled = asset.type !== "image";
    els.zoomInBtn.disabled = asset.type !== "image";
    els.zoomResetBtn.disabled = asset.type !== "image";
    els.prevPromptBtn.disabled = prompt.prompts.length <= 1;
    els.nextPromptBtn.disabled = prompt.prompts.length <= 1;
    els.shufflePromptBtn.disabled = prompt.prompts.length <= 1;
  }

  function renderNoResults() {
    const query = state.query.trim();
    const filterDesc = state.progressFilter ? `marked as "${state.progressFilter === 'weak' ? 'Need revision' : state.progressFilter}"` : "";
    els.activeTopicLabel.textContent = query ? "Search results" : state.topic;
    els.assetTitle.textContent = query ? `No results for "${query}"` : filterDesc ? `No items ${filterDesc}` : "No matching material";
    els.mobileAssetMeta.textContent = query ? "Search" : state.topic;
    els.mobileAssetTitle.textContent = filterDesc ? `No items ${filterDesc}` : "No matching material";
    els.assetTopic.textContent = state.topic;
    els.assetPosition.textContent = "0 / 0";
    if (els.assetType) {
      els.assetType.textContent = "No results";
    }
    els.viewer.classList.add("hidden");
    els.emptyStage.classList.remove("hidden");
    const emptySub = els.emptyStage.querySelector("span");
    if (emptySub) {
      emptySub.textContent = filterDesc
        ? "Click 'Show all' above or mark materials to see them here."
        : "Try a broader search term or choose another topic.";
    }
    els.recallPanel.classList.add("hidden");
    els.flashcardPanel.classList.add("hidden");
    els.completionPanel.classList.add("hidden");
    els.stageWrap.classList.remove("deck-complete");
    els.assetStatusChip.classList.add("hidden");
    els.mobileFullscreenBtn.classList.add("hidden");
    els.assetImage.removeAttribute("src");
    els.assetPdf.removeAttribute("src");
    delete els.assetImage.dataset.currentSrc;
  }

  function renderPlan() {
    const plansList = activePlans();
    const plan = activePlan();
    const planIsOpen = state.mode === "plan";
    document.body.classList.toggle("plan-modal-open", planIsOpen);
    els.planPanel.classList.toggle("hidden", !planIsOpen);
    els.planBackdrop.classList.toggle("hidden", !planIsOpen);
    if (els.planEyebrow) {
      els.planEyebrow.textContent = state.planType === "sprint15" ? "15-minute interview sprint" : "60-minute plan";
    }
    if (els.planSprint15Btn) {
      els.planSprint15Btn.classList.toggle("active", state.planType === "sprint15");
    }
    if (els.planPlan60Btn) {
      els.planPlan60Btn.classList.toggle("active", state.planType === "plan60");
    }
    els.planTitle.textContent = plan.title;
    els.planDescription.textContent = plan.description;
    els.planTimer.textContent = formatTime(state.timerRemaining);
    els.planProgress.textContent = `Block ${state.planIndex + 1} of ${plansList.length} - ${plan.minutes} min`;
    els.timerToggleBtn.textContent = state.timerRunning ? "Pause timer" : "Start timer";
    els.prevPlanBtn.disabled = state.planIndex === 0;
    els.nextPlanBtn.disabled = state.planIndex === plansList.length - 1;

    els.planBlocks.innerHTML = "";
    plansList.forEach((block, index) => {
      const button = document.createElement("button");
      button.className = `plan-block${index === state.planIndex ? " active" : ""}`;
      button.innerHTML = `<strong>${block.title}</strong><span>${block.minutes} min</span>`;
      button.addEventListener("click", () => setPlanIndex(index));
      els.planBlocks.appendChild(button);
    });
  }

  function renderCheatSheet() {
    const list = filteredAssets();
    const groups = new Map();
    list.forEach((asset) => {
      if (!groups.has(asset.topic)) groups.set(asset.topic, []);
      groups.get(asset.topic).push(asset);
    });

    let promptCount = 0;
    els.cheatSheetGrid.innerHTML = "";
    Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0])).forEach(([topic, topicAssets]) => {
      const section = document.createElement("article");
      section.className = "cheatsheet-topic";
      const body = document.createElement("div");
      body.className = "cheatsheet-items";
      const title = document.createElement("h3");
      title.textContent = topic;
      section.appendChild(title);

      topicAssets.forEach((asset) => {
        const prompts = promptsForAsset(asset).slice(0, 3);
        promptCount += isMobileExperience() ? 1 : prompts.length;
        const item = document.createElement("button");
        item.className = "cheatsheet-item";
        item.innerHTML = `<strong>${cleanTitle(asset)}</strong>`;
        if (!isMobileExperience()) {
          const listEl = document.createElement("ul");
          prompts.forEach((promptText) => {
            const li = document.createElement("li");
            li.textContent = promptText;
            listEl.appendChild(li);
          });
          item.appendChild(listEl);
        }
        item.addEventListener("click", () => {
          state.mode = "browse";
          setCurrent(asset.id);
        });
        body.appendChild(item);
      });

      section.appendChild(body);
      els.cheatSheetGrid.appendChild(section);
    });

    els.cheatSheetSummary.textContent = isMobileExperience() ? `${promptCount} topics` : `${promptCount} prompts`;
  }

  function renderGrid(list) {
    els.assetGrid.innerHTML = "";
    els.queueSummary.textContent = `${list.length} item${list.length === 1 ? "" : "s"}`;

    if (!list.length) {
      els.assetGrid.innerHTML = `<div class="empty-state">No matching material found. Try a broader topic or search term.</div>`;
      return;
    }

    const fragment = document.createDocumentFragment();
    list.forEach((asset) => {
      const progress = assetProgress(asset.id);
      const card = document.createElement("button");
      card.className = `asset-card${asset.id === state.currentId ? " active" : ""}`;
      const thumb = asset.type === "image"
        ? `<img src="${encodedPath(asset)}" alt="">`
        : `<span class="pdf-thumb">PDF</span>`;
      const flags = [
        progress.reviewed ? `<span class="pill">Reviewed</span>` : "",
        progress.starred ? `<span class="pill hot">Starred</span>` : "",
        progress.weak ? `<span class="pill">Revise</span>` : ""
      ].join("");

      card.innerHTML = `
        <span class="thumb">${thumb}</span>
        <span class="asset-card-body">
          <strong>${asset.title}</strong>
          <span class="card-meta">
            <span class="pill">${asset.topic}</span>
            <span class="pill">${asset.type}</span>
            ${flags}
          </span>
        </span>
      `;
      card.addEventListener("click", () => setCurrent(asset.id));
      fragment.appendChild(card);
    });
    els.assetGrid.appendChild(fragment);
  }

  function ensureRevealObserver() {
    if (reducedMotionQuery.matches || !("IntersectionObserver" in window)) return null;
    if (revealObserver) return revealObserver;
    revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("revealed");
        revealObserver.unobserve(entry.target);
      });
    }, {
      rootMargin: "0px 0px -8% 0px",
      threshold: 0.08
    });
    return revealObserver;
  }

  function refreshRevealTargets() {
    const targets = Array.from(document.querySelectorAll([
      ".stage-wrap:not(.hidden)",
      "#queueSection:not(.hidden)",
      "#cheatSheetPanel:not(.hidden)",
      ".asset-card",
      ".cheatsheet-topic",
      ".cheatsheet-item",
      ".plan-block",
      ".completion-panel:not(.hidden)"
    ].join(",")));

    if (reducedMotionQuery.matches || !("IntersectionObserver" in window)) {
      targets.forEach((target) => target.classList.add("revealed"));
      return;
    }

    const observer = ensureRevealObserver();
    if (!observer) return;
    targets.forEach((target, index) => {
      if (target.classList.contains("reveal-ready")) return;
      target.style.setProperty("--reveal-delay", `${Math.min(index * 28, 168)}ms`);
      target.classList.add("reveal-ready");
      observer.observe(target);
    });
  }

  function render() {
    els.appShell.classList.toggle("sidebar-collapsed", state.sidebarCollapsed && !isMobileExperience());
    els.sidebarToggleBtn.setAttribute("aria-expanded", String(!state.sidebarCollapsed || isMobileExperience()));
    els.sidebarToggleBtn.setAttribute("aria-label", state.sidebarCollapsed ? "Expand topics panel" : "Collapse topics panel");
    document.body.classList.toggle("mobile-experience", isMobileExperience());
    document.body.classList.toggle("mobile-chrome-hidden", isMobileExperience() && state.mobileChromeHidden);
    document.body.classList.toggle("mobile-search-open", isMobileExperience() && state.mobileSearchOpen);
    document.body.classList.toggle("mobile-mode-open", isMobileExperience() && state.mobileModeOpen);
    document.body.classList.toggle("mobile-topics-open", isMobileExperience() && state.mobileTopicsOpen);
    if (isMobileExperience() && state.viewMode === "zoomed") {
      state.viewMode = "sheet";
      state.zoom = 1;
    }

    const list = filteredAssets();
    const asset = list.length ? currentAsset(list) : null;
    if (asset && !list.some((item) => item.id === state.currentId)) {
      state.currentId = asset.id;
    }
    const index = asset ? Math.max(0, list.findIndex((item) => item.id === state.currentId)) : -1;

    renderTopics();
    renderProgressCounts();
    renderPlan();
    updateMobileControls();
    els.studyLayout.classList.toggle("hidden", state.mode === "cheatsheet");
    els.cheatSheetPanel.classList.toggle("hidden", state.mode !== "cheatsheet");
    els.queueSection.classList.toggle("hidden", state.mode === "cheatsheet");
    if (state.mode === "cheatsheet") {
      state.deckComplete = false;
      renderCheatSheet();
    } else if (!asset) {
      renderNoResults();
      renderGrid(list);
    } else {
      renderViewer(asset, index, list);
      renderCompletionPanel(list);
      renderGrid(list);
    }
    if (!els.fullscreenModal.classList.contains("hidden")) {
      if (asset) {
        renderFullscreen(asset);
      } else {
        closeFullscreen();
      }
    }
    els.modeButtons.forEach((button) => button.classList.toggle("active", button.dataset.mode === state.mode));
    window.requestAnimationFrame(refreshRevealTargets);
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    if (location.protocol === "file:") return;

    window.addEventListener("load", () => {
      updateOfflineStatus("caching");
      navigator.serviceWorker.register("./service-worker.js")
        .then((registration) => {
          const worker = registration.active || registration.waiting || registration.installing;
          if (worker) worker.postMessage({ type: "CACHE_STUDY_ASSETS" });
        })
        .catch((error) => {
          console.warn("Offline app registration failed", error);
        });
    });
  }

  function isMobileExperience() {
    return mobileQuery.matches;
  }

  function updateOfflineStatus(status) {
    if (!els.offlineStatus) return;
    const online = navigator.onLine;
    const nextStatus = online ? status : "offline";
    const labels = {
      online: "Online",
      offline: "Offline",
      caching: "Caching",
      ready: "Offline ready",
      partial: "Partially cached"
    };
    els.offlineStatus.textContent = labels[nextStatus] || labels.online;
    els.offlineStatus.dataset.status = nextStatus;
  }

  function initializeMobileMenus() {
    if (isMobileExperience()) {
      els.progressMenu.removeAttribute("open");
    } else {
      els.progressMenu.setAttribute("open", "");
    }
  }

  function modeLabel() {
    if (state.mode === "recall") return "Recall";
    return state.mode === "cheatsheet" ? "Cheat" : state.mode.charAt(0).toUpperCase() + state.mode.slice(1);
  }

  function updateMobileControls() {
    els.mobileModeToggle.querySelector("strong").textContent = modeLabel();
    els.mobileModeToggle.setAttribute("aria-expanded", String(isMobileExperience() && state.mobileModeOpen));
    els.mobileTopicToggle.dataset.topic = state.topic;
    els.mobileTopicToggle.querySelector("strong").innerHTML = `${topicIcon(state.topic)}<span>${escapeHtml(state.topic)}</span>`;
    els.mobileTopicToggle.setAttribute("aria-expanded", String(isMobileExperience() && state.mobileTopicsOpen));

    if (els.dockTopicLabel) {
      els.dockTopicLabel.textContent = state.topic.toLowerCase() === "all" ? "All" : state.topic;
    }
    if (els.dockTopicIcon) {
      els.dockTopicIcon.innerHTML = topicIcon(state.topic);
    }
    if (els.dockModeLabel) {
      els.dockModeLabel.textContent = modeLabel();
    }
    const list = filteredAssets();
    const asset = list.length ? currentAsset(list) : null;
    const index = asset ? Math.max(0, list.findIndex((item) => item.id === state.currentId)) : -1;
    if (els.dockCenterProgress) {
      els.dockCenterProgress.textContent = list.length ? `${index + 1} / ${list.length}` : "0 / 0";
    }
    if (els.dockCenterHint) {
      els.dockCenterHint.textContent = state.sheetState === "peek" ? "Prompt" : "Hide";
    }
  }

  function applyTheme() {
    const isDark = state.theme === "dark";
    document.documentElement.dataset.theme = state.theme;
    els.themeToggleBtn.setAttribute("aria-pressed", String(isDark));
    els.themeToggleBtn.setAttribute("aria-label", isDark ? "Switch to light mode" : "Enable dark mode");
    els.themeToggleBtn.querySelector("span").textContent = isDark ? "Light" : "Dark";
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", isDark ? "#07111f" : "#00a1e0");
    const iconPath = isDark
      ? "M12 4.5V2h2v2.5h-2Zm0 17.5v-2.5h2V22h-2ZM4.5 13H2v-2h2.5v2Zm17.5 0h-2.5v-2H22v2ZM6.2 7.6 4.4 5.8l1.4-1.4 1.8 1.8-1.4 1.4Zm12 12-1.8-1.8 1.4-1.4 1.8 1.8-1.4 1.4Zm0-13.4 1.8-1.8 1.4 1.4-1.8 1.8-1.4-1.4ZM5.8 19.6l-1.4-1.4 1.8-1.8 1.4 1.4-1.8 1.8ZM13 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Z"
      : "M20 14.4A7.7 7.7 0 0 1 9.6 4a8.2 8.2 0 1 0 10.4 10.4Z";
    els.themeToggleBtn.querySelector("path").setAttribute("d", iconPath);
  }

  function showDecisionToast(message) {
    els.decisionToast.textContent = message;
    els.decisionToast.classList.add("show");
    window.clearTimeout(showDecisionToast.timer);
    showDecisionToast.timer = window.setTimeout(() => {
      els.decisionToast.classList.remove("show");
    }, 850);
  }

  function applyMobileDecision(decision, options = {}) {
    const asset = currentAsset();
    if (!asset) return;
    const listBeforeDecision = filteredAssets();
    const progress = assetProgress(asset.id);

    if (decision === "reviewed") {
      progress.reviewed = true;
      progress.weak = false;
      showDecisionToast("Marked reviewed");
    } else {
      progress.weak = true;
      progress.reviewed = false;
      showDecisionToast("Added to revise");
    }

    saveProgress();
    const nextAsset = nextAssetInRound(listBeforeDecision, asset.id);
    const finishDecision = () => {
      resetLiveSwipe();
      if (nextAsset) {
        setCurrent(nextAsset.id);
      } else {
        state.deckComplete = true;
        render();
      }
    };

    if (options.liveSwipe) {
      finishLiveSwipe(decision);
      window.setTimeout(finishDecision, 180);
      return;
    }
    playPageTurn(decision);
    finishDecision();
  }

  function playPageTurn(decision) {
    const className = decision === "reviewed" ? "page-turn-reviewed" : "page-turn-revise";
    els.stageWrap.classList.remove("page-turn-reviewed", "page-turn-revise", "swiping", "swipe-review", "swipe-revise", "swipe-return");
    void els.stageWrap.offsetWidth;
    els.stageWrap.classList.add(className);
    window.setTimeout(() => {
      els.stageWrap.classList.remove(className);
    }, 520);
  }

  function resetLiveSwipe() {
    swipeDragging = false;
    swipeWasHorizontal = false;
    els.stageWrap.classList.remove("swiping", "swipe-review", "swipe-revise", "swipe-return", "page-turn-reviewed", "page-turn-revise");
    els.stageWrap.style.removeProperty("--swipe-x");
    els.stageWrap.style.removeProperty("--swipe-rotate");
    els.stageWrap.style.removeProperty("--swipe-strength");
  }

  function updateLiveSwipe(dx) {
    const clampedX = Math.max(-130, Math.min(130, dx));
    const strength = Math.min(1, Math.abs(dx) / 130);
    els.stageWrap.style.setProperty("--swipe-x", `${clampedX}px`);
    els.stageWrap.style.setProperty("--swipe-rotate", `${clampedX / 16}deg`);
    els.stageWrap.style.setProperty("--swipe-strength", strength.toFixed(2));
    els.stageWrap.classList.add("swiping");
    els.stageWrap.classList.toggle("swipe-revise", dx > 0);
    els.stageWrap.classList.toggle("swipe-review", dx < 0);
  }

  function finishLiveSwipe(decision) {
    els.stageWrap.classList.remove("swiping", "swipe-return", "swipe-review", "swipe-revise");
    els.stageWrap.classList.add(decision === "reviewed" ? "page-turn-reviewed" : "page-turn-revise");
  }

  function cancelLiveSwipe() {
    els.stageWrap.classList.remove("swiping", "swipe-review", "swipe-revise");
    els.stageWrap.classList.add("swipe-return");
    window.setTimeout(resetLiveSwipe, 180);
  }

  function renderFullscreen(asset = currentAsset()) {
    if (!asset) return;
    els.fullscreenTitle.textContent = asset.title;
    els.fullscreenMeta.textContent = asset.type === "pdf" ? `${asset.topic} PDF` : `${asset.topic} image`;
    els.fullscreenImage.style.display = asset.type === "image" ? "block" : "none";
    els.fullscreenPdf.style.display = asset.type === "pdf" ? "block" : "none";

    if (asset.type === "image") {
      els.fullscreenImage.src = encodedPath(asset);
      els.fullscreenImage.alt = `${asset.title} infographic`;
      els.fullscreenPdf.removeAttribute("src");
    } else {
      els.fullscreenPdf.src = encodedPath(asset);
      els.fullscreenImage.removeAttribute("src");
    }
  }

  function openFullscreen() {
    const asset = currentAsset();
    if (!asset) return;
    renderFullscreen(asset);
    document.body.classList.add("fullscreen-open");
    els.fullscreenModal.classList.remove("hidden");
    els.fullscreenModal.setAttribute("aria-hidden", "false");
  }

  function closeFullscreen() {
    document.body.classList.remove("fullscreen-open");
    els.fullscreenModal.classList.add("hidden");
    els.fullscreenModal.setAttribute("aria-hidden", "true");
  }

  function move(direction) {
    const list = filteredAssets();
    if (!list.length) return;
    const nextAsset = adjacentAsset(list, state.currentId, direction);
    if (nextAsset) setCurrent(nextAsset.id);
  }

  function movePrompt(direction) {
    const asset = currentAsset();
    const prompts = currentPrompts(asset);
    if (!prompts.length) return;
    state.promptIndex = (state.promptIndex + direction + prompts.length) % prompts.length;
    state.revealed = state.mode !== "recall";
    state.checklistVisible = false;
    render();
  }

  function setPlanIndex(index) {
    const list = activePlans();
    state.planIndex = Math.max(0, Math.min(list.length - 1, index));
    state.timerRemaining = activePlan().minutes * 60;
    state.timerRunning = false;
    stopTimer();
    state.promptIndex = 0;
    state.checklistVisible = false;
    const first = filteredAssets()[0] || assets[0];
    if (first) state.currentId = first.id;
    state.deckComplete = false;
    render();
  }

  function switchPlanType(type) {
    if (state.planType === type) return;
    state.planType = type;
    state.planIndex = 0;
    const plan = activePlan();
    state.timerRemaining = plan.minutes * 60;
    state.timerRunning = false;
    stopTimer();
    const first = filteredAssets()[0] || assets[0];
    if (first) state.currentId = first.id;
    render();
  }

  function stopTimer() {
    if (timerId) {
      window.clearInterval(timerId);
      timerId = null;
    }
  }

  function startTimer() {
    stopTimer();
    state.timerRunning = true;
    timerId = window.setInterval(() => {
      state.timerRemaining = Math.max(0, state.timerRemaining - 1);
      if (state.timerRemaining === 0) {
        state.timerRunning = false;
        stopTimer();
      }
      renderPlan();
    }, 1000);
    renderPlan();
  }

  function activateMode(mode) {
    state.mode = mode;
    state.mobileModeOpen = false;
    state.mobileSearchOpen = false;
    state.deckComplete = false;
    state.revealed = state.mode !== "recall";
    state.promptIndex = 0;
    state.checklistVisible = false;
    if (state.mode !== "plan") {
      state.timerRunning = false;
      stopTimer();
    }
    const first = filteredAssets()[0] || assets[0];
    if (first) state.currentId = first.id;
    render();
  }

  function renderTourCards() {
    els.tourCards.innerHTML = "";
    const fragment = document.createDocumentFragment();
    modeTourItems.forEach((item) => {
      const card = document.createElement("button");
      card.className = `tour-card tour-card-${item.mode}`;
      card.type = "button";
      card.innerHTML = `
        ${modeIcon(item.mode)}
        <span class="tour-tag">${escapeHtml(item.tag)}</span>
        <strong>${escapeHtml(item.title)}</strong>
        <span>${escapeHtml(item.action)}</span>
        <small>${escapeHtml(item.result)}</small>
      `;
      card.addEventListener("click", () => {
        closeTour();
        activateMode(item.mode);
      });
      fragment.appendChild(card);
    });
    els.tourCards.appendChild(fragment);
  }

  function openTour() {
    state.tourOpen = true;
    state.mobileModeOpen = false;
    state.mobileSearchOpen = false;
    state.mobileTopicsOpen = false;
    state.mobileChromeHidden = false;
    closeFullscreen();
    renderTourCards();
    document.body.classList.add("tour-open");
    els.tourModal.classList.remove("hidden");
    els.tourModal.setAttribute("aria-hidden", "false");
  }

  function closeTour(markSeen = true) {
    state.tourOpen = false;
    document.body.classList.remove("tour-open");
    els.tourModal.classList.add("hidden");
    els.tourModal.setAttribute("aria-hidden", "true");
    if (!markSeen) return;
    try {
      localStorage.setItem(tourStorageKey, "1");
    } catch {
      // The tour can still close even if storage is unavailable.
    }
  }

  function shouldShowInitialTour() {
    try {
      return localStorage.getItem(tourStorageKey) !== "1";
    } catch {
      return true;
    }
  }

  function closePlanMode() {
    state.mode = "browse";
    state.timerRunning = false;
    stopTimer();
    state.mobileModeOpen = false;
    state.deckComplete = false;
    const first = filteredAssets()[0] || assets[0];
    if (first) state.currentId = first.id;
    render();
  }

  function toggleProgress(key) {
    const asset = currentAsset();
    if (!asset) return;
    const progress = assetProgress(asset.id);
    const nextValue = !progress[key];
    progress[key] = nextValue;
    if (nextValue && key === "reviewed") progress.weak = false;
    if (nextValue && key === "weak") progress.reviewed = false;
    normalizeProgress(progress, key);
    saveProgress();
    render();
  }

  els.searchInput.addEventListener("input", (event) => {
    state.query = event.target.value;
    if (state.query.trim()) {
      state.topic = "All";
      state.mobileTopicsOpen = false;
    }
    const first = filteredAssets()[0];
    state.currentId = first ? first.id : "";
    state.deckComplete = false;
    state.promptIndex = 0;
    state.checklistVisible = false;
    render();
  });

  els.mobileSearchToggle.addEventListener("click", () => {
    state.mobileSearchOpen = !state.mobileSearchOpen;
    state.mobileChromeHidden = false;
    state.mobileModeOpen = false;
    state.mobileTopicsOpen = false;
    render();
    if (state.mobileSearchOpen) {
      window.requestAnimationFrame(() => els.searchInput.focus());
    }
  });

  els.mobileModeToggle.addEventListener("click", () => {
    state.mobileModeOpen = !state.mobileModeOpen;
    state.mobileTopicsOpen = false;
    state.mobileSearchOpen = false;
    state.mobileChromeHidden = false;
    render();
  });

  els.mobileTopicToggle.addEventListener("click", () => {
    state.mobileTopicsOpen = !state.mobileTopicsOpen;
    state.mobileModeOpen = false;
    state.mobileSearchOpen = false;
    state.mobileChromeHidden = false;
    render();
  });

  els.sidebarToggleBtn.addEventListener("click", () => {
    state.sidebarCollapsed = !state.sidebarCollapsed;
    saveSidebarState();
    render();
  });

  els.searchInput.addEventListener("blur", () => {
    if (!isMobileExperience() || state.query.trim()) return;
    state.mobileSearchOpen = false;
    render();
  });

  els.modeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      activateMode(button.dataset.mode);
    });
  });

  els.tourBtn.addEventListener("click", () => openTour());
  els.resetProgressBtn.addEventListener("click", (event) => {
    event.preventDefault();
    resetProgress();
  });
  els.themeToggleBtn.addEventListener("click", () => {
    state.theme = state.theme === "dark" ? "light" : "dark";
    saveTheme();
    applyTheme();
  });
  els.tourCloseBtn.addEventListener("click", () => closeTour());
  els.tourLaterBtn.addEventListener("click", () => closeTour());
  els.tourStartBtn.addEventListener("click", () => {
    closeTour();
    activateMode("browse");
  });
  els.tourModal.addEventListener("click", (event) => {
    if (event.target === els.tourModal) closeTour();
  });

  els.continueRoundBtn.addEventListener("click", () => {
    restartCurrentTopic();
  });

  els.nextTopicBtn.addEventListener("click", () => {
    goToNextTopic();
  });

  els.revealBtn.addEventListener("click", () => {
    state.revealed = true;
    render();
  });

  els.prevPromptBtn.addEventListener("click", () => movePrompt(-1));
  els.nextPromptBtn.addEventListener("click", () => movePrompt(1));
  els.shufflePromptBtn.addEventListener("click", () => movePrompt(1));
  els.checklistToggleBtn.addEventListener("click", () => {
    state.checklistVisible = !state.checklistVisible;
    render();
  });
  els.startRecallBtn.addEventListener("click", () => {
    state.mode = "recall";
    state.revealed = false;
    state.checklistVisible = false;
    render();
  });

  els.filterReviewedBtn?.addEventListener("click", () => toggleProgressFilter("reviewed"));
  els.filterStarredBtn?.addEventListener("click", () => toggleProgressFilter("starred"));
  els.filterWeakBtn?.addEventListener("click", () => toggleProgressFilter("weak"));
  els.clearProgressFilterBtn?.addEventListener("click", () => clearProgressFilter());

  els.planSprint15Btn?.addEventListener("click", () => switchPlanType("sprint15"));
  els.planPlan60Btn?.addEventListener("click", () => switchPlanType("plan60"));

  els.prevPlanBtn.addEventListener("click", () => setPlanIndex(state.planIndex - 1));
  els.nextPlanBtn.addEventListener("click", () => setPlanIndex(state.planIndex + 1));
  els.planCloseBtn.addEventListener("click", closePlanMode);
  els.planBackdrop.addEventListener("click", closePlanMode);
  els.timerToggleBtn.addEventListener("click", () => {
    if (state.timerRunning) {
      state.timerRunning = false;
      stopTimer();
      renderPlan();
    } else {
      startTimer();
    }
  });
  els.timerResetBtn.addEventListener("click", () => {
    state.timerRemaining = activePlan().minutes * 60;
    state.timerRunning = false;
    stopTimer();
    renderPlan();
  });

  els.prevBtn.addEventListener("click", () => move(-1));
  els.nextBtn.addEventListener("click", () => move(1));
  els.reviewedBtn.addEventListener("click", () => toggleProgress("reviewed"));
  els.starBtn.addEventListener("click", () => toggleProgress("starred"));
  els.weakBtn.addEventListener("click", () => toggleProgress("weak"));

  els.fitSheetBtn.addEventListener("click", () => {
    state.viewMode = "sheet";
    state.zoom = 1;
    render();
  });

  els.fitWidthBtn.addEventListener("click", () => {
    state.viewMode = "width";
    state.zoom = 1;
    render();
  });

  els.zoomOutBtn.addEventListener("click", () => {
    state.viewMode = "zoomed";
    state.zoom = Math.max(0.5, state.zoom - 0.15);
    render();
  });

  els.zoomInBtn.addEventListener("click", () => {
    state.viewMode = "zoomed";
    state.zoom = Math.min(2.5, state.zoom + 0.15);
    render();
  });

  els.zoomResetBtn.addEventListener("click", () => {
    state.viewMode = "sheet";
    state.zoom = 1;
    render();
  });

  els.openBtn.addEventListener("click", (event) => {
    event.preventDefault();
  });

  els.mobileFullscreenBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    openFullscreen();
  });

  els.fullscreenCloseBtn.addEventListener("click", closeFullscreen);
  els.fullscreenPrevBtn.addEventListener("click", () => {
    move(-1);
    renderFullscreen();
  });
  els.fullscreenNextBtn.addEventListener("click", () => {
    move(1);
    renderFullscreen();
  });

  els.fullscreenModal.addEventListener("click", (event) => {
    if (event.target === els.fullscreenModal) closeFullscreen();
  });

  [els.assetImage, els.fullscreenImage].forEach((image) => {
    image.draggable = false;
    image.setAttribute("draggable", "false");
  });

  document.addEventListener("contextmenu", (event) => {
    if (event.target.closest("#viewer, #fullscreenViewer, #assetGrid")) {
      event.preventDefault();
    }
  });

  document.addEventListener("dragstart", (event) => {
    if (event.target.closest("#assetImage, #fullscreenImage, .thumb img")) {
      event.preventDefault();
    }
  });

  els.fullscreenViewer.addEventListener("touchstart", (event) => {
    if (event.touches.length !== 1) return;
    touchStartX = event.touches[0].clientX;
    touchStartY = event.touches[0].clientY;
    touchStartTime = Date.now();
  }, { passive: true });

  els.fullscreenViewer.addEventListener("touchend", (event) => {
    if (!touchStartTime || event.changedTouches.length !== 1) return;
    const dx = event.changedTouches[0].clientX - touchStartX;
    const dy = event.changedTouches[0].clientY - touchStartY;
    const elapsed = Date.now() - touchStartTime;
    touchStartTime = 0;

    if (elapsed > 700 || Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.25) return;
    if (isMobileExperience()) {
      applyMobileDecision(dx > 0 ? "weak" : "reviewed");
      renderFullscreen();
      return;
    }
    move(dx < 0 ? 1 : -1);
    renderFullscreen();
  }, { passive: true });

  let touchStartDist = 0;
  let touchStartScale = 1;
  let isPinching = false;

  els.viewer.addEventListener("click", (event) => {
    if (!isMobileExperience() || event.target.closest("button")) return;
    if (Date.now() - lastSwipeTime < 320) return;
    if (state.zoomScale > 1.05) return;
    if (state.sheetState !== "peek") {
      setSheetState("peek");
      return;
    }
    openFullscreen();
  });

  els.viewer.addEventListener("touchstart", (event) => {
    if (event.touches.length === 2) {
      isPinching = true;
      const dx = event.touches[0].clientX - event.touches[1].clientX;
      const dy = event.touches[0].clientY - event.touches[1].clientY;
      touchStartDist = Math.hypot(dx, dy);
      touchStartScale = state.zoomScale;
      cancelLiveSwipe();
      return;
    }

    if (event.touches.length !== 1) return;
    isPinching = false;
    touchStartX = event.touches[0].clientX;
    touchStartY = event.touches[0].clientY;
    touchStartTime = Date.now();
    if (state.zoomScale <= 1.05) {
      resetLiveSwipe();
    }
  }, { passive: true });

  els.viewer.addEventListener("touchmove", (event) => {
    if (!isMobileExperience() || !touchStartTime) return;

    if (isPinching && event.touches.length === 2) {
      const dx = event.touches[0].clientX - event.touches[1].clientX;
      const dy = event.touches[0].clientY - event.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      if (touchStartDist > 0) {
        state.zoomScale = Math.min(4.0, Math.max(1.0, touchStartScale * (dist / touchStartDist)));
        applyViewerTransform();
      }
      event.preventDefault();
      return;
    }

    if (event.touches.length !== 1) return;

    if (state.zoomScale > 1.05) {
      const dx = event.touches[0].clientX - touchStartX;
      const dy = event.touches[0].clientY - touchStartY;
      touchStartX = event.touches[0].clientX;
      touchStartY = event.touches[0].clientY;
      state.panX += dx;
      state.panY += dy;
      applyViewerTransform();
      event.preventDefault();
      return;
    }

    const dx = event.touches[0].clientX - touchStartX;
    const dy = event.touches[0].clientY - touchStartY;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (!swipeWasHorizontal && absX < 10) return;
    if (!swipeWasHorizontal && absX < absY * 1.15) return;
    swipeWasHorizontal = true;
    swipeDragging = true;
    event.preventDefault();
    updateLiveSwipe(dx);
  }, { passive: false });

  els.viewer.addEventListener("touchend", (event) => {
    if (isPinching) {
      if (event.touches.length < 2) {
        isPinching = false;
        if (state.zoomScale < 1.05) resetZoom();
      }
      return;
    }

    if (!touchStartTime || event.changedTouches.length !== 1) return;
    const dx = event.changedTouches[0].clientX - touchStartX;
    const dy = event.changedTouches[0].clientY - touchStartY;
    const elapsed = Date.now() - touchStartTime;
    touchStartTime = 0;

    // Check double tap to zoom in or reset zoom
    if (Math.abs(dx) < 15 && Math.abs(dy) < 15 && elapsed < 300) {
      const now = Date.now();
      if (now - lastTapTime < 320) {
        lastTapTime = 0;
        cancelLiveSwipe();
        if (state.zoomScale > 1.2) {
          resetZoom();
        } else {
          state.zoomScale = 2.2;
          state.panX = 0;
          state.panY = 0;
          applyViewerTransform();
          triggerHaptic("medium");
        }
        return;
      }
      lastTapTime = now;
    }

    if (state.zoomScale > 1.05) {
      return;
    }

    // Swipe up to star
    if (isMobileExperience() && elapsed < 600 && dy < -70 && Math.abs(dy) > Math.abs(dx) * 1.5) {
      toggleProgress("starred");
      triggerHaptic("star");
      const cur = currentAsset();
      const isStarred = cur ? assetProgress(cur.id).starred : false;
      showDecisionToast(isStarred ? "Starred item ⭐" : "Unstarred item");
      cancelLiveSwipe();
      return;
    }

    if (isMobileExperience() && swipeDragging) {
      const fastSwipe = elapsed < 420 && Math.abs(dx) > 48;
      const committedSwipe = Math.abs(dx) > Math.max(72, els.viewer.clientWidth * 0.22);
      if ((fastSwipe || committedSwipe) && Math.abs(dx) > Math.abs(dy) * 1.15) {
        lastSwipeTime = Date.now();
        applyMobileDecision(dx > 0 ? "weak" : "reviewed", { liveSwipe: true });
        return;
      }
      cancelLiveSwipe();
      return;
    }

    if (elapsed > 700 || Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.25) return;
    lastSwipeTime = Date.now();
    if (isMobileExperience()) {
      applyMobileDecision(dx > 0 ? "weak" : "reviewed");
      return;
    }
    move(dx < 0 ? 1 : -1);
  }, { passive: true });

  els.viewer.addEventListener("touchcancel", () => {
    touchStartTime = 0;
    isPinching = false;
    cancelLiveSwipe();
  }, { passive: true });

  if (els.sheetDragHandle) {
    let sheetTouchStartY = 0;
    els.sheetDragHandle.addEventListener("click", () => {
      triggerHaptic("light");
      setSheetState(state.sheetState === "peek" ? "half" : "peek");
      updateMobileControls();
    });

    els.sheetDragHandle.addEventListener("touchstart", (e) => {
      if (e.touches.length === 1) {
        sheetTouchStartY = e.touches[0].clientY;
      }
    }, { passive: true });

    els.sheetDragHandle.addEventListener("touchend", (e) => {
      if (sheetTouchStartY === 0 || e.changedTouches.length !== 1) return;
      const dy = e.changedTouches[0].clientY - sheetTouchStartY;
      sheetTouchStartY = 0;
      if (Math.abs(dy) < 25) return;
      triggerHaptic("light");
      if (dy < -25) {
        if (state.sheetState === "peek") setSheetState("half");
        else if (state.sheetState === "half") setSheetState("full");
      } else if (dy > 25) {
        if (state.sheetState === "full") setSheetState("half");
        else if (state.sheetState === "half") setSheetState("peek");
      }
      updateMobileControls();
    }, { passive: true });
  }

  if (els.mobileSheetBackdrop) {
    els.mobileSheetBackdrop.addEventListener("click", () => {
      triggerHaptic("light");
      setSheetState("peek");
      updateMobileControls();
    });
  }

  if (els.zoomHud) {
    els.zoomHud.addEventListener("click", () => {
      resetZoom();
    });
  }

  if (els.dockTopicBtn) {
    els.dockTopicBtn.addEventListener("click", () => {
      triggerHaptic("light");
      state.mobileTopicsOpen = !state.mobileTopicsOpen;
      state.mobileModeOpen = false;
      state.mobileSearchOpen = false;
      render();
    });
  }

  if (els.dockPrevBtn) {
    els.dockPrevBtn.addEventListener("click", () => {
      triggerHaptic("light");
      move(-1);
    });
  }

  if (els.dockNextBtn) {
    els.dockNextBtn.addEventListener("click", () => {
      triggerHaptic("light");
      move(1);
    });
  }

  if (els.dockCenterBtn) {
    els.dockCenterBtn.addEventListener("click", () => {
      triggerHaptic("light");
      setSheetState(state.sheetState === "peek" ? "half" : "peek");
      updateMobileControls();
    });
  }

  if (els.dockModeBtn) {
    els.dockModeBtn.addEventListener("click", () => {
      triggerHaptic("light");
      state.mobileModeOpen = !state.mobileModeOpen;
      state.mobileTopicsOpen = false;
      state.mobileSearchOpen = false;
      render();
    });
  }

  window.addEventListener("keydown", (event) => {
    if (state.tourOpen && event.key === "Escape") {
      closeTour();
      return;
    }
    if (event.target.matches("input")) return;
    if (event.key === "ArrowRight") move(1);
    if (event.key === "ArrowLeft") move(-1);
    if (event.key.toLowerCase() === "r") toggleProgress("reviewed");
    if (event.key.toLowerCase() === "s") toggleProgress("starred");
    if (event.key.toLowerCase() === "w") toggleProgress("weak");
    if (event.key.toLowerCase() === "q") movePrompt(1);
    if (event.key === " " && state.mode === "recall" && !state.revealed) {
      event.preventDefault();
      state.revealed = true;
      render();
    }
  });

  window.addEventListener("online", () => updateOfflineStatus("online"));
  window.addEventListener("offline", () => updateOfflineStatus("offline"));
  window.addEventListener("focus", () => {
    refreshCatalog();
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) refreshCatalog();
  });

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data?.type === "CACHE_STATUS") {
        updateOfflineStatus(event.data.status);
      }
    });
  }

  mobileQuery.addEventListener("change", () => {
    initializeMobileMenus();
    if (!isMobileExperience()) {
      state.mobileSearchOpen = false;
      state.mobileModeOpen = false;
      state.mobileTopicsOpen = false;
    }
    render();
  });

  updateOfflineStatus("online");
  applyTheme();
  initializeMobileMenus();
  registerServiceWorker();
  render();
  refreshCatalog(true);
  if (shouldShowInitialTour()) {
    window.setTimeout(() => openTour(), 500);
  }
})();
