/* =========================================================================
   Knowledge page.
   Signature moment: the corpus bar builds left to right while the chunk
   count counts up to meet it. Everything else stays quiet.
   ========================================================================= */

const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

gsap.registerPlugin(window.SplitText);
gsap.defaults({ ease: "power3.out", duration: 0.5 });

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* Theme ------------------------------------------------------------------ */

const root = document.documentElement;
const params = new URLSearchParams(location.search);
if (params.get("theme")) root.dataset.theme = params.get("theme");
else if (window.matchMedia("(prefers-color-scheme: dark)").matches) root.dataset.theme = "dark";

$("#theme").addEventListener("click", () => {
  root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
});

/* Tabs ------------------------------------------------------------------- */

$$(".tabs button").forEach((b) =>
  b.addEventListener("click", () => {
    $$(".tabs button").forEach((x) => x.classList.remove("is-on"));
    b.classList.add("is-on");
  })
);

/* Motion ----------------------------------------------------------------- */

function play() {
  const counter = $("[data-count]");
  const target = +counter.dataset.count;

  if (REDUCED) {
    counter.textContent = target.toLocaleString();
    gsap.set(".corpus__seg", { scaleX: 1 });
    gsap.set(".src__fill", { scaleX: (i, t) => +t.dataset.pct / 100 });
    return;
  }

  const tl = gsap.timeline();

  // Headline rises out of a line mask; the number counts up inside it.
  let words = null;
  try {
    const split = new SplitText(".kstatement", { type: "lines,words", linesClass: "split-line" });
    words = split.words;
  } catch (e) { /* plain fade below */ }

  tl.from(".eyebrow-pill", { y: 10, opacity: 0, duration: 0.45 }, 0);

  if (words) tl.from(words, { yPercent: 110, opacity: 0, duration: 0.7, stagger: 0.016 }, 0.06);
  else tl.from(".kstatement", { y: 22, opacity: 0, duration: 0.65 }, 0.06);

  const obj = { v: 0 };
  tl.to(obj, {
    v: target, duration: 1.1, ease: "power2.out",
    onUpdate: () => { counter.textContent = Math.round(obj.v).toLocaleString(); },
  }, 0.2);

  tl.from(".ksub", { y: 12, opacity: 0, duration: 0.5 }, 0.3)
    .from(".btn--accent", { y: 10, opacity: 0, duration: 0.45 }, 0.36)
    .from(".corpus__top > *", { opacity: 0, duration: 0.4, stagger: 0.05 }, 0.4);

  // SIGNATURE: segments grow left to right, widest first.
  tl.to(".corpus__seg", { scaleX: 1, duration: 0.85, stagger: 0.09 }, 0.46)
    .from(".clg", { y: 10, opacity: 0, duration: 0.45, stagger: 0.06 }, 0.72)
    .from(".kstat", { y: 10, opacity: 0, duration: 0.42, stagger: 0.05 }, 0.8)
    .from(".ktools > *", { y: 10, opacity: 0, duration: 0.42, stagger: 0.05 }, 0.88)
    .from(".src", { y: 18, opacity: 0, duration: 0.5, stagger: 0.09 }, 0.94)
    .to(".src__fill", {
      scaleX: (i, t) => +t.dataset.pct / 100,
      duration: 0.7, stagger: 0.08,
    }, 1.15);
}

document.fonts.ready.then(play);
