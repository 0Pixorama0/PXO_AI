# VoiceForge — redesigned platform

A complete, working front end for the VoiceForge / Pixorama platform. Every
screen from the live product, rebuilt on one design system, merged into a single
app with real routing, real state and real interactions.

```bash
python -m http.server 4780
```

Then http://127.0.0.1:4780/index.html

`?theme=light|dark` forces a theme. `?reset=1` wipes the store back to seed.

---

## What "working" means here

Everything in the interface works: routing, forms, modals, the six-step wizard,
search and filters, the test chat, live theming. State lives in one store,
persists to localStorage, and propagates across screens — connect a channel and
the dashboard changes state, the inbox fills, usage starts metering and the
setup checklist ticks over.

What it does **not** do is talk to your backend. There is no Node gateway, no
Python services, no Supabase, Twilio or Composio behind it. The store simulates
them. Swapping `app/store.js` for real API calls is the porting job.

---

## Screens

| Route | Screen |
|---|---|
| `#/` | Dashboard — launch state until traffic exists, operating state after |
| `#/knowledge` | Corpus bar, source cards, thin-extraction diagnosis, add-source modal |
| `#/mcp` | My servers + 24-tool catalogue with search and category filter |
| `#/agents` | Agent list |
| `#/agents/new` | Template picker, then the six-step wizard |
| `#/agents/:id` | Edit an existing agent through the same wizard |
| `#/channels` | 13 channels grouped by setup cost |
| `#/inbox` | Split list and thread, reply as the agent |
| `#/providers` | Capability coverage, provider records, add-provider modal |
| `#/users` | Team table, invite modal, activate/deactivate |
| `#/plans` | Plan cards, assignment, quota enforcement |
| `#/usage` | Cost by service, cost per conversation |
| `#/settings` | Models, branding (live accent), channels, connectors, Composio |

---

## Architecture

```
index.html          shell + icon sprite
styles.css          design tokens + page patterns
app/components.css  shared components
app/store.js        state, seed data, derived readings, actions
app/ui.js           hyperscript + shared blocks (pageHead, empty, card, modal, toast)
app/views-core.js   Dashboard, Knowledge, MCP, Agents, Channels, Inbox
app/views-admin.js  Providers, Users, Plans, Usage, Settings
app/main.js         shell, nav, hash router
```

No build step, no framework. ES modules and one vendored copy of GSAP.

**Icons are [Lucide](https://lucide.dev) (ISC)** — the same set shadcn/ui uses, so
they match the real app. The sprite in `index.html` is generated, never hand-drawn:

```bash
node build-icons.mjs
```

Add an entry to `MAP` in that script and re-run it to pull a new icon straight from
`lucide-static`. Licence in `vendor/LICENSE.lucide`. The PXO brand mark lives in the
same generator — it carries its own gradient, so it is defined there rather than
pulled from the icon set.

Icons are chosen for meaning, not convenience: MCP Tools is `blocks` because tool
servers are plugins, Providers is `key-round` because it is a credential store,
Channels is `waypoints` because it is distribution across thirteen destinations.

The rule that keeps it coherent: **no screen holds its own copy of anything.**
Every number is derived from the store, so the dashboard, the plan card and the
usage page cannot disagree.

---

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

---

## Channels page (`channels.html`)

Built from a screen recording of the live product (extracted to frames with
`framegrab.py`). The original Channels screen is thirteen full-width rows, each
about 100px tall, each carrying three data points and the sentence "No agent
connected yet".

The redesign uses information the current screen hides: **channels differ
enormously in setup cost**, and that is the only thing a user picking one
actually cares about. Grouped accordingly:

- **One click** (5) — WhatsApp, Messenger, Instagram via Meta signup; Gmail and
  Outlook via OAuth
- **Bring a token** (6) — Telegram, LINE, Discord, Teams, Slack, WeChat
- **Needs a phone number** (1) — Phone, via Twilio

The website widget is pulled out above them as the recommended path, because it
is the only channel requiring no third-party account at all.

### The empty-state component

The single highest-leverage fix in the product. Providers, MCP Tools, Channels,
Usage & Billing and the Dashboard all currently render the same ~380px bordered
box with a centred grey icon. `.empty` replaces it with a one-line, left-aligned
row that states the consequence and carries the action. Fixing it once fixes
five screens.

## Working from a screen recording

```bash
python framegrab.py <video> [outdir] [--motion=SECONDS]
```

Writes a contact sheet of ~30 evenly spaced frames, full-resolution frames at
each detected scene change, and optionally a dense burst around one timestamp
for reading a single transition. Requires ffmpeg on PATH.
