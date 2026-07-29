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
| Color | Near-monochrome greys, one violet accent (`#7c3aed`). Light and dark are full peers. |
| Data palette | The PXO logo colors: blue `#3a33c9`, violet `#7c3aed`, magenta `#b23fc9`, cyan `#18bccf`. |
| Type | Manrope (display and body) + JetBrains Mono (micro labels only, never below 11px). |
| Space | 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 56 / 72 — real jumps, not uniform 16. |
| Shape | 6 / 9 / 12 / 16 / 22 / pill. |
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
