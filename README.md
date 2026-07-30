# VoiceForge dashboard — redesign prototype

Self-contained, no build step. Serve the folder and open `index.html`:

```bash
python -m http.server 4780
```

Then http://127.0.0.1:4780/index.html

Query params (used by the verification scripts, handy for review):
`?view=launch|live` and `?theme=light|dark`.

The floating control bottom-right switches between the two states. The sun icon
in the topbar toggles the theme.

---

## The core idea

The current dashboard renders nine analytics sections regardless of whether any
data exists. On a new account that produces six identical empty states and eight
zeroed stat tiles across roughly 2000px of scroll, which reads as broken rather
than new.

But the page already knows the account's exact state: 1 agent, 0 channels, 2
knowledge sources that have never synced, no plan assigned. That is a setup
checklist being rendered as empty charts.

So the dashboard has **two states**, and it decides which to show:

**Launch** — until traffic exists. A setup hero owns the page: headline, progress
rail, and five steps derived from real system state. The eight metrics collapse
into one quiet band where zeros recede in grey and real values step forward in
full contrast. Six empty chart cards collapse into one honest placeholder. The
only sections that keep full weight are the ones with real data and real actions
(knowledge sources, plan).

**Operating** — once data exists. One dominant KPI with a sparkline, a
full-height volume chart, and dense compact widgets (a 7×24 heat grid, ranked
bars) instead of half-empty cards.

---

## Design tokens

Everything resolves to custom properties at the top of `styles.css`. No raw hex,
px, or ad-hoc duration appears below that block.

| Group | Notes |
|---|---|
| Color | Pure white base, one violet accent (`#7c3aed`). Light and dark are full peers. |
| Data palette | The PXO logo colors: blue `#3a33c9`, violet `#7c3aed`, magenta `#b23fc9`, cyan `#18bccf`. |
| Type | Manrope (display and body) + JetBrains Mono (micro labels only, never below 11px). |
| Space | 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 56 / 72 — real jumps, not uniform 16. |
| Shape | 4 / 6 / 8 / 10 / 12 / pill — sharpened to match the references. |
| Motion | `--ease: cubic-bezier(.22,1,.36,1)`, durations 150 / 300 / 600ms. GSAP reads the same scale. |

The brand gradient appears in exactly three places: the logo mark, the avatar,
and the hero wash. It is a focal cue, not decoration.

---

## Motion budget

One signature moment per view, everything else quiet.

**Launch (signature)** — the hero assembles once: gradient wash fades up, the
headline rises out of a line mask (GSAP SplitText), the progress rail fills left
to right, the five steps cascade. Below the fold, everything is 8–18px of travel
over 400–500ms.

**Operating** — numbers count up, chart paths draw via `strokeDashoffset`, heat
cells bloom, ranked bars grow with `scaleX`.

Guardrails held throughout: only `transform` and `opacity` animate (bars use
`scaleX` with a left origin, never `width`), and `prefers-reduced-motion` skips
straight to the final state with every value present.

---

## Verification

```bash
node verify.mjs
```

Drives headless Chrome over CDP and checks: no console or page errors, the
launch timeline completes, state switching reverts the GSAP context cleanly,
reduced motion lands on final values, and no horizontal overflow at 390px. Also
writes full-page screenshots to `shots/`.

```bash
node probe.mjs [launch|live]
```

Lists any element overflowing a 390px viewport.

---

## Notes for porting into the React app

- The token block is drop-in. Map it onto the existing Tailwind theme by pointing
  `tailwind.config.js` at these custom properties, which the codebase already
  does via `hsl(var(--primary))`.
- Two fixes here are worth carrying over regardless of the redesign:
  1. Manrope's word space is unusually narrow. Small bold UI text needs
     `word-spacing: 0.09em` or spaces visually collapse ("Deploy achannel").
  2. Any grid track holding the main column needs `minmax(0, 1fr)` plus
     `min-width: 0`, or a single wide child pushes the whole page sideways on
     mobile.
- The icon sprite uses `<symbol viewBox>`, not `<g>`. A `<g>` has no viewBox, so
  a 24px artboard gets cropped to the top-left 16px.

---

## Knowledge page (`knowledge.html`)

Redesigned against the user's own visual references (two Cloudflare screens and
a dark FlowBank landing page). The shared language across all three:
near-monochrome high-contrast base, a single saturated accent used sparingly,
heavy display type dropping hard to quiet body text, modest radii, hairline
borders, almost no shadow, and one large saturated graphic.

That pulled the token system in a specific direction:

- Background moved from `#f6f6f9` to **pure white**; surfaces separate by
  hairline border rather than a grey wash.
- Radii **sharpened** from 6/9/12/16/22 to 4/6/8/10/12. Pills are now reserved
  for the uppercase eyebrow badge only.
- Shadows went **near-flat**.
- Added `--t-4xl: 60px` for editorial display type.

Both pages share these tokens, so the dashboard moved with it.

### What changed on the page itself

The original showed four stat cards (two of them zero), a thin two-row list, and
~250px of empty space below. The redesign leads with an eyebrow pill and a
weight-mixed statement line (FlowBank's device), then gives the page one large
saturated graphic: a corpus bar where segment width is each source's real share
of the 462 chunks.

The substantive addition is a **density metric**. India_Wiki produced 310 chunks
from 25 pages (12.4/page); PROP EQUITY produced 152 from 65 (2.3/page). It
crawled 2.6x more pages for half the chunks, which is the signature of a
client-rendered site where the static fetcher saw an empty shell. The page now
names that and offers the fix inline, next to the diagnosis rather than in a
far corner of the card.

```bash
node kverify.mjs
```

Verifies the Knowledge page: console errors, counter, corpus segments, share
bars, reduced motion, and 390px overflow.
