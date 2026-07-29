/* =========================================================================
   VoiceForge dashboard prototype
   Motion budget: ONE signature moment per view. Everything else is quiet.
   All durations/eases resolve to the tokens in styles.css.
   ========================================================================= */

const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

gsap.registerPlugin(window.SplitText);
gsap.defaults({ ease: "power3.out", duration: 0.5 }); // ≈ var(--ease)

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* =========================================================================
   Data
   ========================================================================= */

const DAYS = 30;

// Deterministic pseudo-random so the prototype looks the same on every load.
let seed = 20260729;
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

const series = {
  conversations: Array.from({ length: DAYS }, (_, i) => {
    const trend = 60 + i * 3.4;                       // steady growth
    const week = i % 7 >= 5 ? -18 : 0;                // weekend dip
    return Math.max(12, Math.round(trend + week + (rnd() - 0.5) * 26));
  }),
};
series.calls = series.conversations.map((v) => Math.round(v * (0.28 + rnd() * 0.12)));

const heatData = Array.from({ length: 7 }, (_, d) =>
  Array.from({ length: 24 }, (_, h) => {
    const business = Math.exp(-Math.pow(h - 14, 2) / 34);       // peak early afternoon
    const weekend = d >= 5 ? 0.35 : 1;
    return Math.min(1, business * weekend * (0.72 + rnd() * 0.5));
  })
);

const channels = [
  { name: "WhatsApp", v: 1486, c: "var(--d-violet)" },
  { name: "Web widget", v: 1122, c: "var(--d-blue)" },
  { name: "Phone", v: 864, c: "var(--d-magenta)" },
  { name: "Telegram", v: 401, c: "var(--d-cyan)" },
  { name: "Instagram", v: 209, c: "var(--text-3)" },
  { name: "Slack", v: 100, c: "var(--text-3)" },
];

const agents = [
  { name: "Master Agent", v: 2740, c: "var(--d-violet)" },
  { name: "Billing specialist", v: 806, c: "var(--d-blue)" },
  { name: "Tech support", v: 448, c: "var(--d-magenta)" },
  { name: "Scheduler", v: 188, c: "var(--d-cyan)" },
];

const costs = [
  { name: "LLM", v: 196, c: "var(--d-violet)" },
  { name: "Text to speech", v: 118, c: "var(--d-blue)" },
  { name: "Speech to text", v: 71, c: "var(--d-cyan)" },
  { name: "Telephony", v: 43, c: "var(--d-magenta)" },
];

/* =========================================================================
   Chart builders — pure DOM, no library
   ========================================================================= */

/** Catmull-Rom style smoothing so the line reads as a curve, not a zigzag. */
function smoothPath(pts) {
  if (pts.length < 2) return "";
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2[0]} ${p2[1]}`;
  }
  return d;
}

const toPoints = (data, w, h, pad, max) =>
  data.map((v, i) => [
    (i / (data.length - 1)) * w,
    h - pad - (v / max) * (h - pad * 2),
  ]);

const NS = "http://www.w3.org/2000/svg";
const el = (tag, attrs = {}) => {
  const n = document.createElementNS(NS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  return n;
};

function buildArea() {
  const svg = $("#area");
  if (!svg || svg.dataset.built) return;
  svg.dataset.built = "1";

  const W = 1180, H = 236, PAD = 16;
  const max = Math.max(...series.conversations) * 1.12;

  const defs = el("defs");
  const grad = el("linearGradient", { id: "gConv", x1: "0", y1: "0", x2: "0", y2: "1" });
  grad.append(
    el("stop", { offset: "0%", "stop-color": "var(--d-violet)", "stop-opacity": ".26" }),
    el("stop", { offset: "100%", "stop-color": "var(--d-violet)", "stop-opacity": "0" })
  );
  defs.append(grad);
  svg.append(defs);

  // Horizontal guides — quiet, they orient without competing.
  for (let i = 1; i <= 3; i++) {
    svg.append(el("line", {
      x1: 0, x2: W, y1: (H / 4) * i, y2: (H / 4) * i,
      stroke: "var(--border)", "stroke-width": "1",
    }));
  }

  const convPts = toPoints(series.conversations, W, H, PAD, max);
  const callPts = toPoints(series.calls, W, H, PAD, max);
  const convD = smoothPath(convPts);

  svg.append(el("path", {
    class: "area-fill",
    d: `${convD} L ${W} ${H} L 0 ${H} Z`,
    fill: "url(#gConv)",
    opacity: "0",
  }));
  svg.append(el("path", {
    class: "area-line",
    d: convD, fill: "none",
    stroke: "var(--d-violet)", "stroke-width": "2",
    "stroke-linecap": "round", "stroke-linejoin": "round",
  }));
  svg.append(el("path", {
    class: "area-line",
    d: smoothPath(callPts), fill: "none",
    stroke: "var(--d-cyan)", "stroke-width": "1.75",
    "stroke-linecap": "round", "stroke-linejoin": "round", opacity: ".9",
  }));

  const xs = $("#area-x");
  ["30d ago", "24d", "18d", "12d", "6d", "Today"].forEach((t) => {
    const s = document.createElement("span");
    s.textContent = t;
    xs.append(s);
  });
}

function buildSpark() {
  const svg = $("#spark");
  if (!svg || svg.dataset.built) return;
  svg.dataset.built = "1";
  const W = 560, H = 54, PAD = 7;
  const d = series.conversations;

  // A sparkline normalises to its own min/max, not to zero. Anchoring at zero
  // flattens a gentle trend into a straight line and says nothing.
  const lo = Math.min(...d), hi = Math.max(...d), span = hi - lo || 1;
  const pts = d.map((v, i) => [
    (i / (d.length - 1)) * W,
    H - PAD - ((v - lo) / span) * (H - PAD * 2),
  ]);

  svg.append(el("path", {
    class: "spark-line",
    d: smoothPath(pts),
    fill: "none", stroke: "var(--d-violet)", "stroke-width": "2",
    "stroke-linecap": "round", "stroke-linejoin": "round",
  }));
}

function buildHeat() {
  const wrap = $("#heat");
  if (!wrap || wrap.dataset.built) return;
  wrap.dataset.built = "1";
  const names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  heatData.forEach((row, d) => {
    const lbl = document.createElement("span");
    lbl.className = "heat__day";
    lbl.textContent = names[d];
    wrap.append(lbl);
    row.forEach((v) => {
      const c = document.createElement("span");
      c.className = "heat__c";
      c.style.opacity = (0.06 + v * 0.94).toFixed(3);
      wrap.append(c);
    });
  });
}

/** Name the hottest cell in the heat grid — a summary beats an empty card. */
function heatSummary() {
  const names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  let best = { v: -1 };
  heatData.forEach((row, d) => row.forEach((v, h) => { if (v > best.v) best = { v, d, h }; }));
  const pad = (n) => String(n).padStart(2, "0");
  return `${names[best.d]} ${pad(best.h)}:00–${pad((best.h + 1) % 24)}:00 UTC`;
}

function buildRanks(target, rows, unit = "") {
  const host = $(target);
  if (!host || host.dataset.built) return;
  host.dataset.built = "1";
  const total = rows.reduce((a, b) => a + b.v, 0);
  rows.forEach((r) => {
    const pct = (r.v / total) * 100;
    const node = document.createElement("div");
    node.className = "rank";
    node.innerHTML = `
      <div class="rank__top">
        <span class="rank__name">${r.name}</span>
        <span class="rank__v num">${unit}${r.v.toLocaleString()}</span>
        <span class="rank__pct">${pct.toFixed(1)}%</span>
      </div>
      <div class="rank__track"><div class="rank__fill" style="background:${r.c}" data-pct="${pct}"></div></div>`;
    host.append(node);
  });
}

/* =========================================================================
   Motion
   ========================================================================= */

/** Count a number up into the DOM. Quiet: 0.9s, no bounce. */
function countUp(node, tl, at) {
  const target = +node.dataset.count;
  const prefix = node.dataset.prefix || "";
  const obj = { v: 0 };
  tl.to(obj, {
    v: target,
    duration: REDUCED ? 0 : 0.9,
    ease: "power2.out",
    onUpdate: () => { node.textContent = prefix + Math.round(obj.v).toLocaleString(); },
  }, at);
}

/** SIGNATURE MOMENT — the launch hero assembles once. */
function playLaunch() {
  const ctx = gsap.context(() => {
    const tl = gsap.timeline();

    if (REDUCED) {
      gsap.set(".rail__fill[data-on='1']", { scaleX: 1 });
      return;
    }

    // Headline rises out of a line mask.
    let words = null;
    try {
      const split = new SplitText("#hero-title", { type: "lines,words", linesClass: "split-line" });
      words = split.words;
    } catch (e) { /* fall through to a plain fade */ }

    tl.from("#wash", { opacity: 0, scale: 0.86, duration: 1.1, ease: "power2.out" }, 0)
      .from(".eyebrow", { y: 10, opacity: 0, duration: 0.45 }, 0.05);

    if (words) {
      tl.from(words, { yPercent: 110, opacity: 0, duration: 0.72, stagger: 0.018 }, 0.1);
    } else {
      tl.from("#hero-title", { y: 24, opacity: 0, duration: 0.7 }, 0.1);
    }

    tl.from(".hero__sub", { y: 14, opacity: 0, duration: 0.55 }, 0.34)
      .from(".hero__cta > *", { y: 12, opacity: 0, duration: 0.45, stagger: 0.07 }, 0.42)
      // Progress rail fills left to right.
      .to(".rail__fill[data-on='1']", { scaleX: 1, duration: 0.62, stagger: 0.11 }, 0.5)
      .from(".rail__meta > *", { opacity: 0, duration: 0.4, stagger: 0.06 }, 0.66)
      // Steps cascade.
      .from(".step", { y: 16, opacity: 0, duration: 0.5, stagger: 0.062 }, 0.28);

    // Everything below the fold is quiet: small distance, short duration.
    tl.from("#band .band__cell", { opacity: 0, y: 8, duration: 0.4, stagger: 0.028 }, 0.62)
      .from(".awaiting__copy > *", { y: 12, opacity: 0, duration: 0.45, stagger: 0.06 }, 0.78)
      .from(".grid-2 > .card", { y: 18, opacity: 0, duration: 0.5, stagger: 0.08 }, 0.86);

    // Ghost trend draws itself once, then rests. It hints at what will appear.
    const gp = $("#ghost-path");
    if (gp) {
      const len = gp.getTotalLength();
      tl.fromTo(gp,
        { strokeDasharray: `${len}`, strokeDashoffset: len },
        { strokeDashoffset: 0, duration: 1.5, ease: "power1.inOut" }, 0.8)
        .set(gp, { strokeDasharray: "4 6" });
    }

    tl.from(".quota", { opacity: 0, x: -6, duration: 0.4, stagger: 0.05 }, 0.98);
  }, "[data-view='launch']");

  return ctx;
}

/** Operating view: numbers arrive, chart draws, bars grow. */
function playLive() {
  buildArea(); buildSpark(); buildHeat();
  buildRanks("#channels", channels);
  buildRanks("#agents", agents);
  buildRanks("#costs", costs, "$");

  const peak = $("#heat-peak");
  if (peak && !peak.textContent) peak.textContent = heatSummary();

  const ctx = gsap.context(() => {
    const tl = gsap.timeline();

    if (REDUCED) {
      gsap.set(".rank__fill", { scaleX: (i, t) => +t.dataset.pct / 100 });
      gsap.set(".heat__c", { scale: 1 });
      gsap.set(".area-fill", { opacity: 1 });
      $$("[data-count]").forEach((n) => {
        n.textContent = (n.dataset.prefix || "") + (+n.dataset.count).toLocaleString();
      });
      return;
    }

    tl.from(".kpi__lead > .label, .kpi__side > div", { y: 12, opacity: 0, duration: 0.45, stagger: 0.06 }, 0);
    $$("[data-count]").forEach((n, i) => countUp(n, tl, 0.1 + i * 0.05));
    tl.from(".delta", { opacity: 0, x: -6, duration: 0.4 }, 0.5);

    // Sparkline + area lines draw in.
    $$(".spark-line, .area-line").forEach((p, i) => {
      const len = p.getTotalLength();
      tl.fromTo(p,
        { strokeDasharray: len, strokeDashoffset: len },
        { strokeDashoffset: 0, duration: 1.1, ease: "power2.inOut" }, 0.25 + i * 0.09);
    });
    tl.to(".area-fill", { opacity: 1, duration: 0.7 }, 0.8);

    // Heat cells bloom from the centre of the working day outward.
    tl.to(".heat__c", {
      scale: 1, duration: 0.5,
      stagger: { each: 0.004, from: "start" },
    }, 0.5);

    tl.to(".rank__fill", {
      scaleX: (i, t) => +t.dataset.pct / 100,
      duration: 0.7, stagger: 0.05,
    }, 0.55);

    tl.from(".card", { y: 16, opacity: 0, duration: 0.5, stagger: 0.05 }, 0.15);
  }, "[data-view='live']");

  return ctx;
}

/* =========================================================================
   View switching
   ========================================================================= */

let activeCtx = null;

const SUBS = {
  launch: "Setup is 40% complete. Finish the last three steps to start taking traffic.",
  live: "4,182 conversations across 6 channels in the last 30 days.",
};

function show(view) {
  if (activeCtx) { activeCtx.revert(); activeCtx = null; }

  $$("[data-view]").forEach((n) => n.classList.toggle("is-shown", n.dataset.view === view));
  $$(".switcher__set button").forEach((b) => b.classList.toggle("is-on", b.dataset.go === view));
  $("#page-sub").textContent = SUBS[view];

  activeCtx = view === "launch" ? playLaunch() : playLive();
}

$$(".switcher__set button").forEach((b) =>
  b.addEventListener("click", () => show(b.dataset.go))
);

/* Theme ------------------------------------------------------------------ */

const root = document.documentElement;
const params = new URLSearchParams(location.search);

if (params.get("theme")) root.dataset.theme = params.get("theme");
else if (window.matchMedia("(prefers-color-scheme: dark)").matches) root.dataset.theme = "dark";

$("#theme").addEventListener("click", () => {
  root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
});

/* Range control ---------------------------------------------------------- */

$$(".segmented button").forEach((b) =>
  b.addEventListener("click", () => {
    $$(".segmented button").forEach((x) => x.classList.remove("is-on"));
    b.classList.add("is-on");
  })
);

/* Boot ------------------------------------------------------------------- */

document.fonts.ready.then(() => show(params.get("view") === "live" ? "live" : "launch"));
