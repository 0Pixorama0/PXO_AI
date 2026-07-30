/* Channels. Signature moment: the recommended path resolves first, then the
   grouped tiles settle in behind it. */

const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

gsap.registerPlugin(window.SplitText);
gsap.defaults({ ease: "power3.out", duration: 0.5 });

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const root = document.documentElement;
const params = new URLSearchParams(location.search);
if (params.get("theme")) root.dataset.theme = params.get("theme");
else if (window.matchMedia("(prefers-color-scheme: dark)").matches) root.dataset.theme = "dark";

$("#theme").addEventListener("click", () => {
  root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
});

function play() {
  if (REDUCED) return;

  const tl = gsap.timeline();

  let words = null;
  try {
    const split = new SplitText(".kstatement", { type: "lines,words", linesClass: "split-line" });
    words = split.words;
  } catch (e) { /* plain fade below */ }

  tl.from(".eyebrow-pill", { y: 10, opacity: 0, duration: 0.45 }, 0);
  if (words) tl.from(words, { yPercent: 110, opacity: 0, duration: 0.7, stagger: 0.02 }, 0.06);
  else tl.from(".kstatement", { y: 22, opacity: 0, duration: 0.65 }, 0.06);

  tl.from(".ksub", { y: 12, opacity: 0, duration: 0.5 }, 0.26)
    .from(".empty", { y: 12, opacity: 0, duration: 0.45 }, 0.34)
    // SIGNATURE: the recommended path arrives with its wash.
    .from(".pick", { y: 20, opacity: 0, duration: 0.6 }, 0.42)
    .from(".pick__wash", { opacity: 0, duration: 0.9, ease: "power2.out" }, 0.46)
    .from(".pick__body > *", { y: 12, opacity: 0, duration: 0.45, stagger: 0.06 }, 0.54)
    .from(".pick__act > *", { y: 10, opacity: 0, duration: 0.4, stagger: 0.06 }, 0.64);

  // Groups settle in behind it, quietly.
  $$(".group").forEach((g, gi) => {
    tl.from(g.querySelector(".group__head"), { y: 10, opacity: 0, duration: 0.4 }, 0.78 + gi * 0.1)
      .from(g.querySelectorAll(".tile"), { y: 14, opacity: 0, duration: 0.45, stagger: 0.035 }, 0.82 + gi * 0.1);
  });
}

document.fonts.ready.then(play);
