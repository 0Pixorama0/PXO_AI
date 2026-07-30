/* =========================================================================
   Core product screens: Dashboard, Knowledge, MCP Tools, Agents, Channels, Inbox
   ========================================================================= */

import * as S from "./store.js";
import {
  h, frag, icon, n, money, ago, pageHead, empty, pill, btn, field, input, textarea,
  select, toggle, choice, tabs, statStrip, group, card, modal, close, toast,
} from "./ui.js";

const go = (hash) => { location.hash = hash; };

/* =========================================================================
   DASHBOARD — two states, chosen by whether traffic exists
   ========================================================================= */

export function Dashboard() {
  return S.derive.hasTraffic() ? dashLive() : dashLaunch();
}

function dashLaunch() {
  const steps = S.derive.setup();
  const { done, total } = S.derive.progress();
  const left = total - done;
  const pct = Math.round((done / total) * 100);
  const u = S.derive.usage();

  const rail = h("div.rail", {},
    h("div.rail__track", {}, ...steps.map((s, i) =>
      h("div.rail__seg", { style: { "--i": i } }, h("div.rail__fill", { "data-on": s.done ? "1" : "0" })))),
    h("div.rail__meta", {},
      h("span.label", {}, "Setup progress"),
      h("span.label", { style: { color: "var(--accent)" } }, pct + "%")));

  const active = steps.find((s) => !s.done);

  const hero = h("section.hero", {},
    h("div.hero__wash"),
    h("div.hero__main", {},
      h("p.eyebrow", {}, pill("Setup", "accent", true), h("span.label", {}, `${done} of ${total} complete`)),
      h("h1.hero__title", {}, left === 0
        ? "Everything is ready. Deploy and start talking."
        : `${["Zero", "One", "Two", "Three", "Four", "Five"][left]} step${left === 1 ? "" : "s"} left before your agent answers its first call.`),
      h("p.hero__sub", {}, "Your master agent is built. Finish the remaining steps and every channel you deploy starts answering with the same identity."),
      h("div.hero__cta", {},
        active ? btn(active.cta, { kind: "primary", icon: "arrow", onClick: () => go(active.go) }) : null,
        btn("Skip setup", { kind: "quiet", onClick: () => toast("Setup hidden for this session") })),
      rail),
    h("ol.steps", {}, ...steps.map((s, i) =>
      h("li.step" + (s.done ? ".is-done" : s === active ? ".is-active" : ""), {},
        h("span.step__mark" + (s.done ? "" : ".num"), {}, s.done ? icon("check", 12) : String(i + 1)),
        h("div", {}, h("p.step__name", {}, s.name), h("p.step__meta", {}, s.meta)),
        h("div.step__action", {}, btn(s.cta, { kind: s === active ? "primary" : "ghost", size: "sm", onClick: () => go(s.go) }))))));

  const cells = [
    ["Conversations", u.conversations], ["Calls", u.calls], ["Users", u.users], ["Avg time", "—"],
    ["Channels", S.derive.liveChannels().length], ["Agents", S.get().agents.length],
    ["Live now", 0], ["Tokens", u.tokens],
  ];
  const band = h("section.band", {}, ...cells.map(([label, v]) =>
    h("div.band__cell" + (v && v !== "—" ? ".has-value" : ""), {},
      h("p.label", {}, label), h("p.band__val", {}, n(v)))));

  const awaiting = card(null, null, h("div.awaiting", {},
    h("div.awaiting__copy", {},
      h("h3", {}, "Nothing to plot yet"),
      h("p", {}, "Volume trends, peak hours, channel mix, agent leaderboards and returning-user rates all populate from one source: live traffic. Deploy a channel and this page fills itself."),
      h("div.awaiting__list", {}, ...["Volume", "Peak hours", "Channels", "Agents", "Retention"].map((t) => pill(t)))),
    ghostChart()));

  return frag(
    pageHead({
      eyebrowIcon: "dash", eyebrow: `Setup · ${pct}% complete`,
      accentWord: null, rest: "Dashboard",
      sub: `Overview of your voice agent platform. ${left} step${left === 1 ? "" : "s"} remain before traffic can arrive.`,
    }),
    hero, band, awaiting,
    h("div.grid-2", {}, knowledgeCard(), planCard()));
}

function ghostChart() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "ghost");
  svg.setAttribute("viewBox", "0 0 620 168");
  svg.setAttribute("preserveAspectRatio", "none");
  svg.innerHTML = `<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 6" stroke-linecap="round" opacity=".34"
    d="M0 132 C 52 132, 78 106, 118 108 S 186 76, 226 84 S 300 118, 340 96 S 410 40, 452 52 S 528 26, 570 18 L 620 22"/>`;
  return svg;
}

function knowledgeCard() {
  const k = S.get().knowledge;
  const pending = k.filter((x) => x.status !== "ready");
  return card("Knowledge base", `${k.length} source${k.length === 1 ? "" : "s"}`,
    frag(
      h("div.stat-inline", {},
        h("div", {}, h("p.label", {}, "Total"), h("p.stat-inline__v", {}, String(k.length))),
        h("div", {}, h("p.label", {}, "Pending"), h("p.stat-inline__v" + (pending.length ? ".is-warn" : ""), {}, String(pending.length))),
        h("div", {}, h("p.label", {}, "Chunks"), h("p.stat-inline__v", {}, n(S.derive.chunks())))),
      ...k.map((s) => h("div.row", {},
        h("span.row__icon", {}, icon("globe", 14)),
        h("div", {}, h("p.row__name", {}, s.name), h("p.row__meta", {}, `${s.type === "web" ? "Web crawl" : "File"} · ${ago(s.synced)}`)),
        h("div.row__end", {},
          pill(s.status === "ready" ? "Ready" : "Indexing", s.status === "ready" ? "ok" : "warn"),
          btn("Open", { size: "sm", onClick: () => go("#/knowledge") })))),
      h("div.cardfoot", {}, h("span.label", {}, "Attached to"), h("span.cardfoot__v", {}, "Master Agent"))),
    btn("Manage", { size: "sm", icon: "arrow", onClick: () => go("#/knowledge") }));
}

function planCard() {
  const s = S.get();
  const plan = s.plans.find((p) => p.id === s.activePlan);
  const cap = (v) => (v === 0 ? "∞" : n(v));
  return card("Plan & quotas", plan ? plan.name : "Unassigned",
    frag(
      h("p", { style: { fontSize: "var(--t-sm)", color: "var(--text-2)", lineHeight: "1.6" } },
        plan ? `${plan.name} is active. Quotas below are enforced on every request.`
             : "No plan is assigned, so nothing is metered and nothing is capped. Assign one before you deploy to production."),
      h("div.nudge__quota", {},
        quotaRow("Agents", s.agents.length, plan ? cap(plan.agents) : "∞"),
        quotaRow("Channels", S.derive.liveChannels().length, plan ? cap(plan.channels) : "∞"),
        quotaRow("MCP servers", s.mcpServers.length, plan ? cap(plan.mcp) : "∞"),
        quotaRow("Monthly chats", s.conversations.length, plan ? cap(plan.chats) : "∞")),
      btn(plan ? "Change plan" : "Assign a plan", { style: { marginTop: "auto", justifyContent: "center" }, onClick: () => go("#/plans") })));
}

const quotaRow = (name, used, cap) =>
  h("div.quota", {}, h("span.quota__name", {}, name), h("span.quota__v", {}, `${n(used)} / ${cap}`));

function dashLive() {
  const s = S.get();
  const u = S.derive.usage();
  const byChannel = {};
  s.conversations.forEach((c) => { byChannel[c.channel] = (byChannel[c.channel] || 0) + 1; });
  const ranked = Object.entries(byChannel).sort((a, b) => b[1] - a[1]);
  const total = s.conversations.length || 1;
  const palette = ["var(--d-violet)", "var(--d-blue)", "var(--d-magenta)", "var(--d-cyan)", "var(--text-3)"];

  const kpi = h("section.kpi", {},
    h("div.kpi__lead", {},
      h("p.label", {}, "Conversations · all channels"),
      h("div.kpi__value", {}, h("span.kpi__big.num", {}, n(u.conversations)),
        h("span.delta.delta--up", {}, "▲ live")),
      sparkline(s.conversations.length)),
    h("div.kpi__side", {},
      kpiCell("Calls", n(u.calls), `${Math.round((u.calls / total) * 100)}% of volume`),
      kpiCell("Unique users", n(u.users), "across all channels"),
      kpiCell("Spend", money(u.cost), "metered this period")));

  const channelCard = card("Busiest channels", "By conversation count",
    ranked.length
      ? frag(...ranked.map(([type, v], i) => {
          const def = S.CHANNEL_TYPES.find((t) => t.id === type);
          const pct = (v / total) * 100;
          return h("div.rank", {},
            h("div.rank__top", {},
              h("span.rank__name", {}, def ? def.name : type),
              h("span.rank__v.num", {}, n(v)),
              h("span.rank__pct", {}, pct.toFixed(1) + "%")),
            h("div.rank__track", {}, h("div.rank__fill", {
              style: { background: palette[i % palette.length], transform: `scaleX(${pct / 100})` } })));
        }))
      : empty("No channel traffic", "Deploy a channel to see the split."));
  channelCard.querySelector(".card__body").append(
    h("div.cardfoot", {},
      h("span.label", {}, "Across"),
      h("span.cardfoot__v", {}, `${ranked.length} channel${ranked.length === 1 ? "" : "s"}`)));

  const agentsCard = card("Agents", `${s.agents.length} configured`,
    frag(...s.agents.map((a) => h("div.row", {},
      h("span.row__icon", {}, icon("bot", 14)),
      h("div", {}, h("p.row__name", {}, a.name), h("p.row__meta", {}, `${a.tone} · ${a.len} · ${a.mode}`)),
      h("div.row__end", {}, a.master ? pill("Master", "accent") : null,
        btn("Edit", { size: "sm", onClick: () => go("#/agents/" + a.id) }))))));

  return frag(
    pageHead({
      eyebrowIcon: "activity", eyebrow: `${S.derive.liveChannels().length} channel${S.derive.liveChannels().length === 1 ? "" : "s"} live`,
      accentWord: n(u.conversations), rest: "conversations handled so far.",
      sub: "Every channel runs the same master agent, so these numbers describe one identity rather than a fleet of bots.",
    }),
    kpi,
    h("div.grid-2.mb-6", {}, channelCard, agentsCard),
    h("div.grid-3", {}, knowledgeCard(), planCard(), costCard(u)));
}

const kpiCell = (label, v, meta) => h("div", {},
  h("p.label", {}, label), h("p.kpi__sv.num", {}, v), h("p.kpi__sm", {}, meta));

function costCard(u) {
  const rows = [["LLM", 0.46], ["Text to speech", 0.27], ["Speech to text", 0.17], ["Telephony", 0.10]];
  const palette = ["var(--d-violet)", "var(--d-blue)", "var(--d-cyan)", "var(--d-magenta)"];
  return card("Cost", "This period", frag(
    h("p.label", {}, "Total spend"),
    h("p.kpi__sv.num", {}, money(u.cost)),
    h("div", { style: { marginTop: "var(--s-5)", display: "grid", gap: "var(--s-3)" } },
      ...rows.map(([name, share], i) => h("div.rank", {},
        h("div.rank__top", {},
          h("span.rank__name", {}, name),
          h("span.rank__v.num", {}, money(u.cost * share)),
          h("span.rank__pct", {}, (share * 100).toFixed(0) + "%")),
        h("div.rank__track", {}, h("div.rank__fill", { style: { background: palette[i], transform: `scaleX(${share})` } })))))));
}

function sparkline(count) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "kpi__spark");
  svg.setAttribute("viewBox", "0 0 560 54");
  svg.setAttribute("preserveAspectRatio", "none");
  const pts = Array.from({ length: 24 }, (_, i) => {
    const v = 0.35 + 0.45 * Math.sin(i / 3.1) * Math.random() + i / 40;
    return [(i / 23) * 560, 47 - Math.min(0.95, Math.max(0.05, v)) * 40];
  });
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  pts.slice(1).forEach(([x, y]) => { d += ` L ${x} ${y}`; });
  svg.innerHTML = `<path d="${d}" fill="none" stroke="var(--d-violet)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
  return count ? svg : h("div");
}

/* =========================================================================
   KNOWLEDGE
   ========================================================================= */

export function Knowledge() {
  const s = S.get();
  const list = s.knowledge;
  const totalChunks = S.derive.chunks();
  const ready = list.filter((k) => k.status === "ready").length;
  const processing = list.filter((k) => k.status === "processing").length;

  const segs = list.map((k, i) => ({
    k, pct: totalChunks ? (k.chunks / totalChunks) * 100 : 0,
    grad: [`linear-gradient(135deg,var(--d-blue),var(--d-violet))`,
           `linear-gradient(135deg,var(--d-violet),var(--d-magenta))`,
           `linear-gradient(135deg,var(--d-magenta),var(--d-cyan))`,
           `linear-gradient(135deg,var(--d-cyan),var(--d-blue))`][i % 4],
    sw: ["var(--d-blue)", "var(--d-magenta)", "var(--d-cyan)", "var(--d-violet)"][i % 4],
  }));

  const corpus = h("section.corpus", {},
    h("div.corpus__top", {}, h("span.label", {}, "Corpus composition"),
      h("span.corpus__total", {}, `${n(totalChunks)} CHUNKS INDEXED`)),
    h("div.corpus__bar", {},
      ...segs.map((g) => h("div.corpus__seg", {
        style: { flex: String(Math.max(g.k.chunks, 1)), background: g.grad, transform: "scaleX(1)" },
        title: `${g.k.name} — ${g.k.chunks} chunks` })),
      h("div.corpus__seg.corpus__seg--rest", { style: { flex: "0 0 72px", transform: "scaleX(1)" }, title: "Add another source",
        onclick: addSourceModal })),
    h("div.corpus__legend", {},
      ...segs.map((g) => h("div.clg", {},
        h("span.clg__sw", { style: { background: g.sw } }),
        h("span.clg__n", {}, g.k.name),
        h("span.clg__m", {}, `${n(g.k.chunks)} · ${g.pct.toFixed(1)}%`))),
      h("div.clg", { style: { marginLeft: "auto" } },
        h("span.clg__m", {}, `Embedded with ${s.models.embed}`))));

  return frag(
    pageHead({
      eyebrowIcon: "db", eyebrow: `Corpus · ${list.length} source${list.length === 1 ? "" : "s"}`,
      accentWord: n(totalChunks), rest: "chunks ready to ground every answer.",
      sub: "Everything your agents can search and cite. Sources attached to the Master Agent are reachable from every channel.",
      actions: btn("Add source", { kind: "accent", icon: "plus", onClick: addSourceModal }),
    }),
    list.length ? corpus : null,
    statStrip([
      { label: "Ready", value: ready }, { label: "Processing", value: processing },
      { label: "Failed", value: 0 }, { label: "Pages crawled", value: S.derive.pages() },
    ]),
    h("div.ktools", {},
      tabs([{ id: "sources", label: "Sources", icon: "book" }, { id: "conn", label: "My connections", icon: "plug" }],
        "sources", () => toast("Connections are configured in Settings")),
      h("label.field", {}, icon("search", 15),
        h("input", { type: "search", placeholder: "Search by URL, filename, or label", oninput: (e) => filterSources(e.target.value) })),
      btn("Sync all", { size: "sm", icon: "sync", onClick: () => { list.forEach((k) => S.actions.resync(k.id)); toast("Re-syncing every source"); } })),
    list.length
      ? h("div.sources#sources", {}, ...list.map(sourceCard))
      : empty("No knowledge sources yet", "Agents fall back to the model's own training without them, which is where wrong answers come from.",
              btn("Add your first source", { kind: "accent", onClick: addSourceModal })));
}

function filterSources(q) {
  const host = document.querySelector("#sources");
  if (!host) return;
  const needle = q.trim().toLowerCase();
  [...host.children].forEach((el) => {
    el.style.display = !needle || el.textContent.toLowerCase().includes(needle) ? "" : "none";
  });
}

function sourceCard(k) {
  const total = S.derive.chunks() || 1;
  const pct = (k.chunks / total) * 100;
  const density = k.pages ? k.chunks / k.pages : 0;
  const thin = k.status === "ready" && k.pages >= 10 && density < 4;

  return h("article.src" + (thin ? ".is-flagged" : ""), {},
    h("span.src__mark", {}, icon(k.type === "web" ? "globe" : "book", 18)),
    h("div", {},
      h("div.src__top", {},
        h("h2.src__name", {}, k.name),
        k.status === "ready" ? pill("Ready", "ok") : pill("Indexing", "warn"),
        pill(k.type === "web" ? "Web crawl" : "File"),
        thin ? pill("Thin extraction", "warn") : null),
      h("p.src__url", {}, k.url || "—"),
      h("div.src__facts", {},
        fact("Chunks", n(k.chunks)),
        fact("Pages", n(k.pages)),
        fact("Density", k.pages ? density.toFixed(1) + " / page" : "—", thin),
        fact("Last synced", ago(k.synced)),
        fact("Attached to", "Master Agent")),
      thin ? h("div.flag", {},
        icon("alert", 15),
        h("div", {},
          h("p.flag__t", {}, `${density.toFixed(1)} chunks per page is low`),
          h("p.flag__d", {}, "This crawl covered a lot of pages for very few chunks. That usually means the content is rendered client-side and the static fetch saw an empty shell.")),
        btn("Recrawl with browser", { kind: "primary", size: "sm", onClick: () => { S.actions.resync(k.id); toast("Recrawling with the headless browser"); } })) : null,
      h("div.src__share", {}, h("div.src__track", {},
        h("div.src__fill", { style: { transform: `scaleX(${pct / 100})`, background: "linear-gradient(90deg,var(--d-blue),var(--d-violet))" } })))),
    h("div.src__side", {},
      h("span.label", {}, pct.toFixed(1) + "% of corpus"),
      h("div.src__acts", {},
        btn("Resync", { size: "sm", onClick: () => { S.actions.resync(k.id); toast("Re-syncing " + k.name); } }),
        btn("Remove", { size: "sm", onClick: () => { S.actions.removeKnowledge(k.id); toast("Removed " + k.name); } }))));
}

const fact = (label, v, warn) => h("div", {}, h("p.label", {}, label), h("p.fact__v.num" + (warn ? ".is-warn" : ""), {}, v));

function addSourceModal() {
  let kind = "web", name = "", url = "";
  const body = h("div", {},
    h("div.pickrow", {},
      ...[["web", "globe", "Website", "Crawl a public URL"],
          ["file", "book", "File", "PDF, DOCX, TXT or MD"],
          ["conn", "plug", "Connector", "Drive, Notion, Slack…"]].map(([id, ic, t, d]) =>
        h("button.pickrow__i" + (id === "web" ? ".is-on" : ""), {
          onclick: (e) => {
            kind = id;
            [...e.currentTarget.parentElement.children].forEach((c) => c.classList.remove("is-on"));
            e.currentTarget.classList.add("is-on");
          } }, icon(ic, 18), h("span.pickrow__t", {}, t), h("span.pickrow__d", {}, d)))),
    field("Name", input({ placeholder: "Product docs", onInput: (v) => (name = v) }), "How it appears in the source list."),
    field("URL", input({ placeholder: "https://example.com/docs", mono: true, onInput: (v) => (url = v) }),
      "The crawler follows links on the same domain, up to the page cap."));

  modal({
    title: "Add a source", desc: "Give your agents something to ground answers in.", body,
    footer: frag(
      btn("Cancel", { kind: "quiet", onClick: close }),
      btn("Add source", { kind: "accent", onClick: () => {
        if (!name.trim()) return toast("Give the source a name", "warn");
        S.actions.addKnowledge(name.trim(), url.trim() || "https://example.com", kind);
        close(); toast("Indexing started");
      } })),
  });
}

/* =========================================================================
   MCP TOOLS
   ========================================================================= */

let mcpTab = "catalog";
let mcpQuery = "";
let mcpCat = "All";

export function Mcp() {
  const s = S.get();
  const cats = ["All", ...new Set(S.MCP_CATALOG.map((t) => t.cat))];
  const list = S.MCP_CATALOG.filter((t) =>
    (mcpCat === "All" || t.cat === mcpCat) &&
    (!mcpQuery || (t.name + t.desc + t.cat).toLowerCase().includes(mcpQuery.toLowerCase())));

  const mine = s.mcpServers;

  const body = mcpTab === "mine"
    ? (mine.length
        ? h("div.tiles", {}, ...mine.map((m) => h("div.tile.is-live", {},
            h("span.tile__mark", { style: { background: "var(--accent)" } }, m.name.slice(0, 2).toUpperCase()),
            h("span", {}, h("span.tile__n", {}, m.name, pill("Active", "ok")),
              h("span.tile__r", {}, `${m.tools} tools available`)),
            h("button.tile__go", { onclick: () => { S.actions.removeMcp(m.id); toast("Disconnected " + m.name); } }, icon("close", 14)))))
        : empty("No tool servers connected", "Agents can still answer from knowledge, but they cannot take actions in other systems.",
                btn("Browse the catalog", { kind: "accent", onClick: () => { mcpTab = "catalog"; rerender(); } })))
    : frag(
        h("div.ktools", {},
          h("label.field", {}, icon("search", 15),
            h("input", { type: "search", value: mcpQuery, placeholder: "Search tools",
              oninput: (e) => { mcpQuery = e.target.value; rerender(); } })),
          select(cats, mcpCat, (v) => { mcpCat = v; rerender(); })),
        list.length
          ? h("div.tiles", {}, ...list.map((t) => {
              const on = mine.some((m) => m.name === t.name);
              return h("button.tile" + (on ? ".is-live" : ""), {
                onclick: () => { on ? toast(t.name + " already connected", "warn") : (S.actions.connectMcp(t.name), toast("Connected " + t.name)); } },
                h("span.tile__mark", { style: { background: t.colour } }, t.mark),
                h("span", {}, h("span.tile__n", {}, t.name, on ? pill("On", "ok") : null),
                  h("span.tile__r", {}, t.desc)),
                h("span.tile__go", {}, icon(on ? "check" : "arrow", 14)));
            }))
          : empty("Nothing matches that search", "Try a different term or clear the category filter."));

  return frag(
    pageHead({
      eyebrowIcon: "zap", eyebrow: `MCP · ${mine.length} connected`,
      accentWord: String(S.MCP_CATALOG.length), rest: "tools your agents can call.",
      sub: "Model Context Protocol servers let an agent take real actions: open a ticket, look up an order, post a message. Connect once and attach per agent.",
    }),
    h("div.ktools", {},
      tabs([{ id: "mine", label: "My servers", icon: "plug", count: mine.length },
            { id: "catalog", label: "Tool catalog", icon: "zap", count: S.MCP_CATALOG.length }],
        mcpTab, (id) => { mcpTab = id; rerender(); })),
    body);
}

/* =========================================================================
   AGENTS
   ========================================================================= */

export function Agents() {
  const s = S.get();
  return frag(
    pageHead({
      eyebrowIcon: "bot", eyebrow: `Agents · ${s.agents.length}`,
      accentWord: "One", rest: "identity, every channel.",
      sub: "The master agent is what customers meet. Sub-agents are specialists it calls as tools, not separate bots you deploy.",
      actions: btn("Create agent", { kind: "accent", icon: "plus", onClick: () => go("#/agents/new") }),
    }),
    h("div.sources", {}, ...s.agents.map(agentRow)));
}

function agentRow(a) {
  const kn = S.get().knowledge.filter((k) => a.knowledge.includes(k.id));
  return h("article.src", {},
    h("span.src__mark", {}, icon("bot", 18)),
    h("div", {},
      h("div.src__top", {},
        h("h2.src__name", {}, a.name),
        a.master ? pill("Master", "accent") : pill("Sub-agent"),
        pill(a.status === "active" ? "Active" : "Paused", a.status === "active" ? "ok" : "warn")),
      h("p.src__url", {}, a.desc),
      h("div.src__facts", {},
        fact("Tone", a.tone), fact("Length", a.len), fact("Mode", a.mode),
        fact("Knowledge", kn.length ? kn.map((k) => k.name).join(", ") : "None"),
        fact("Tools", a.tools.length ? String(a.tools.length) : "None"))),
    h("div.src__side", {},
      h("span.label", {}, "Created " + ago(a.created)),
      h("div.src__acts", {},
        btn("Test", { size: "sm", onClick: () => testModal(a) }),
        btn("Edit", { size: "sm", onClick: () => go("#/agents/" + a.id) }),
        a.master ? null : btn("Delete", { size: "sm", onClick: () => { S.actions.removeAgent(a.id); toast("Deleted " + a.name); } }))));
}

/* --- The 6-step wizard --------------------------------------------------- */

let draft = null;
let step = 0;

export function AgentEditor(id) {
  const s = S.get();
  const existing = id && id !== "new" ? s.agents.find((a) => a.id === id) : null;

  if (!draft || (existing && draft.id !== existing.id) || (!existing && draft.id)) {
    draft = existing
      ? JSON.parse(JSON.stringify(existing))
      : { name: "", desc: "", mode: "Hybrid", lang: "English (US)", tone: "Friendly", len: "Balanced",
          prompt: "", knowledge: [], tools: [], status: "active", master: false };
    step = 0;
  }

  if (!existing && !draft.name && step === 0) return templatePicker();

  const stepper = h("div.stepper", {}, ...S.WIZARD_STEPS.map((label, i) =>
    frag(
      h("button.stepper__i" + (i === step ? ".is-on" : i < step ? ".is-done" : ""), { onclick: () => { step = i; rerender(); } },
        h("span.stepper__n", {}, i < step ? icon("check", 12) : String(i + 1)),
        h("span.stepper__l", {}, label)),
      i < S.WIZARD_STEPS.length - 1 ? h("span.stepper__bar" + (i < step ? ".is-done" : "")) : null)));

  const panels = [identityStep, personaStep, knowledgeStep, abilitiesStep, engagementStep, testStep];

  return frag(
    h("div.wizard", {},
      stepper,
      h("div.wizard__body", {}, panels[step]()),
      h("div.wizard__foot", {},
        step > 0 ? btn("Back", { kind: "quiet", onClick: () => { step--; rerender(); } }) : btn("Cancel", { kind: "quiet", onClick: () => { draft = null; go("#/agents"); } }),
        h("div.wizard__hint", {}, icon("msg", 16),
          h("div", {}, h("p.wizard__ht", {}, S.WIZARD_STEPS[step]), h("p.wizard__hd", {}, HINTS[step]))),
        step < 5
          ? btn("Next: " + S.WIZARD_STEPS[step + 1], { kind: "accent", icon: "arrow", onClick: () => {
              if (step === 0 && !draft.name.trim()) return toast("Give the agent a name", "warn");
              step++; rerender();
            } })
          : btn("Save agent", { kind: "accent", icon: "check", onClick: () => {
              S.actions.saveAgent(draft); const nm = draft.name; draft = null; go("#/agents"); toast("Saved " + nm);
            } }))));
}

const HINTS = [
  "What is it called and how does it talk to people?",
  "How does your agent sound when it talks?",
  "Which documents may it cite?",
  "What actions can it take in other systems?",
  "When does it speak first, and what does it do when stuck?",
  "Try it before anyone else does.",
];

function templatePicker() {
  return h("div.tpl", {},
    h("span.eyebrow-pill", {}, icon("bot", 13, { color: "var(--accent)" }), h("span.label", { style: { color: "var(--text-2)" } }, "New agent")),
    h("h1.tpl__t", {}, "How do you want to start?"),
    h("p.tpl__d", {}, "Pick a template to skip the boilerplate. Everything stays editable, and you can change anything in the next steps."),
    h("div.tpl__grid", {}, ...S.TEMPLATES.map((t) =>
      h("button.tplcard", { onclick: () => {
          Object.assign(draft, { name: t.name, desc: t.desc, tone: t.tone, len: t.len,
            prompt: `You are ${t.name.toLowerCase()}.\n\nGoals\n- ${t.desc}\n- Ask clarifying questions before guessing.\n- Escalate to a human when you cannot help.` });
          step = 0; rerender();
        } },
        h("span.tplcard__i", {}, icon("bot", 16)),
        h("span.tplcard__t", {}, t.name),
        h("span.tplcard__d", {}, t.desc))),
    ),
    h("div.tpl__foot", {},
      btn("Cancel", { kind: "quiet", onClick: () => { draft = null; go("#/agents"); } }),
      btn("Start from scratch", { kind: "accent", onClick: () => { draft.name = "Untitled agent"; step = 0; rerender(); } })));
}

const stepHead = (t, d) => frag(h("h2.wz__t", {}, t), h("p.wz__d", {}, d));

function identityStep() {
  return h("div.wz", {},
    stepHead("Identity", "What the agent is called, and how people reach it."),
    field("Agent name", input({ value: draft.name, placeholder: "Support Agent", onInput: (v) => (draft.name = v) })),
    field("Description", input({ value: draft.desc, placeholder: "Handles billing questions for existing customers", onInput: (v) => (draft.desc = v) }),
      "Internal only. Helps the master agent decide when to route here."),
    h("p.label", { style: { marginTop: "var(--s-6)" } }, "How will it interact?"),
    h("div.choices", {}, ...[["Text", "Chat and messaging only"], ["Voice", "Phone calls only"], ["Hybrid", "Both, sharing one persona"]]
      .map(([id, d]) => choice({ title: id, desc: d, selected: draft.mode === id, onSelect: () => { draft.mode = id; rerender(); } }))),
    field("Language", select(["English (US)", "English (UK)", "Hindi", "Spanish", "French", "German", "Japanese"], draft.lang, (v) => (draft.lang = v)),
      "Primary language. The model still answers in whatever language the customer writes."));
}

function personaStep() {
  return h("div.wz", {},
    stepHead("Persona", "Behaviour, goals and constraints. Tone and length below style it automatically."),
    field("System prompt", textarea({ value: draft.prompt, rows: 12, onInput: (v) => (draft.prompt = v) }),
      "Focus this on goals and rules rather than voice. The controls below handle voice."),
    h("p.label", { style: { marginTop: "var(--s-6)" } }, "Tone"),
    h("p.wz__sub", {}, "The overall vibe. Pick what fits your audience."),
    h("div.choices", {}, ...S.TONES.map((t) =>
      choice({ title: t.id, desc: t.desc, selected: draft.tone === t.id, onSelect: () => { draft.tone = t.id; rerender(); } }))),
    h("p.label", { style: { marginTop: "var(--s-6)" } }, "Response length"),
    h("p.wz__sub", {}, "How verbose should answers be?"),
    h("div.choices", {}, ...S.LENGTHS.map((t) =>
      choice({ title: t.id, desc: t.desc, selected: draft.len === t.id, onSelect: () => { draft.len = t.id; rerender(); } }))));
}

function knowledgeStep() {
  const list = S.get().knowledge;
  return h("div.wz", {},
    stepHead("Knowledge", "Which sources this agent may search and cite."),
    list.length
      ? h("div.checklist", {}, ...list.map((k) => {
          const on = draft.knowledge.includes(k.id);
          return h("button.checkrow" + (on ? ".is-on" : ""), { onclick: () => {
              draft.knowledge = on ? draft.knowledge.filter((x) => x !== k.id) : [...draft.knowledge, k.id];
              rerender();
            } },
            h("span.checkrow__b", {}, on ? icon("check", 12) : null),
            h("span.row__icon", {}, icon("globe", 14)),
            h("span", {}, h("span.row__name", {}, k.name), h("span.row__meta", {}, `${n(k.chunks)} chunks · ${k.pages} pages`)),
            on ? pill("Attached", "ok") : null);
        }))
      : empty("No knowledge sources yet", "Without one the agent answers from the model's training alone.",
              btn("Add a source", { kind: "accent", size: "sm", onClick: () => go("#/knowledge") })));
}

function abilitiesStep() {
  const mine = S.get().mcpServers;
  return h("div.wz", {},
    stepHead("Abilities", "Tools this agent may call while it reasons."),
    mine.length
      ? h("div.checklist", {}, ...mine.map((m) => {
          const on = draft.tools.includes(m.id);
          return h("button.checkrow" + (on ? ".is-on" : ""), { onclick: () => {
              draft.tools = on ? draft.tools.filter((x) => x !== m.id) : [...draft.tools, m.id];
              rerender();
            } },
            h("span.checkrow__b", {}, on ? icon("check", 12) : null),
            h("span.row__icon", {}, icon("zap", 14)),
            h("span", {}, h("span.row__name", {}, m.name), h("span.row__meta", {}, `${m.tools} tools`)),
            on ? pill("Attached", "ok") : null);
        }))
      : empty("No tool servers connected", "The agent can answer questions but cannot act in other systems.",
              btn("Browse catalog", { kind: "accent", size: "sm", onClick: () => go("#/mcp") })));
}

function engagementStep() {
  draft.engage = draft.engage || { greet: true, proactive: false, escalate: true, collectEmail: true };
  const row = (key, title, desc) => h("div.switchrow", {},
    h("div", {}, h("p.row__name", {}, title), h("p.row__meta", {}, desc)),
    toggle(draft.engage[key], (v) => { draft.engage[key] = v; rerender(); }));

  return h("div.wz", {},
    stepHead("Engagement", "When it speaks first, and what it does when it gets stuck."),
    h("div.switchlist", {},
      row("greet", "Greet first", "Opens with a greeting instead of waiting to be spoken to."),
      row("proactive", "Proactive prompts", "Offers help after a period of silence on the widget."),
      row("escalate", "Escalate to a human", "Offers a handoff when it cannot resolve the issue."),
      row("collectEmail", "Collect an email on escalation", "Captures a contact so someone can follow up.")));
}

function testStep() {
  return h("div.wz", {},
    stepHead("Test", "Talk to it exactly as a customer would, before anyone else does."),
    chatPanel(draft));
}

function chatPanel(agent) {
  const log = h("div.chat__log", {},
    h("div.bubble.is-agent", {}, `Hi, I'm ${agent.name || "your agent"}. How can I help?`));
  const send = () => {
    const v = box.value.trim();
    if (!v) return;
    log.append(h("div.bubble.is-user", {}, v));
    box.value = "";
    log.scrollTop = log.scrollHeight;
    const typing = h("div.bubble.is-agent.is-typing", {}, h("span"), h("span"), h("span"));
    log.append(typing);
    setTimeout(() => {
      typing.remove();
      const kn = S.get().knowledge.filter((k) => agent.knowledge.includes(k.id));
      const cite = kn.length ? ` (from ${kn[0].name})` : "";
      const style = agent.len === "Short" ? "Short answer: " : agent.len === "Detailed" ? "Here is the full picture. " : "";
      log.append(h("div.bubble.is-agent", {}, `${style}I would answer that using the attached knowledge${cite}. Tone is set to ${agent.tone.toLowerCase()}, so I keep it ${agent.tone === "Formal" ? "precise" : "warm"}.`));
      log.scrollTop = log.scrollHeight;
    }, 700);
  };
  const box = h("input.inp", { placeholder: "Ask something a customer would ask", onkeydown: (e) => e.key === "Enter" && send() });
  return h("div.chat", {}, log, h("div.chat__bar", {}, box, btn("Send", { kind: "accent", onClick: send })));
}

function testModal(agent) {
  modal({ title: "Test " + agent.name, desc: `${agent.tone} · ${agent.len} · ${agent.mode}`, body: chatPanel(agent), wide: true,
    footer: btn("Close", { kind: "quiet", onClick: close }) });
}

/* =========================================================================
   CHANNELS
   ========================================================================= */

export function Channels() {
  const s = S.get();
  const live = S.derive.liveChannels();
  const liveTypes = new Set(live.map((c) => c.type));
  const website = S.CHANNEL_TYPES.find((t) => t.id === "website");
  const websiteLive = liveTypes.has("website");

  const pick = h("section.pick", {},
    h("div.pick__wash"),
    h("div.pick__body", {},
      h("span.label", { style: { color: "var(--accent)" } }, websiteLive ? "Live" : "Start here"),
      h("h2.pick__t", {}, "Website widget"),
      h("p.pick__d", {}, "An embeddable chat widget for your own site. No third-party account, no tokens, no approval queue. Paste one iframe and your agent is answering."),
      h("div.pick__meta", {}, pill("2 minutes", "accent"), pill("No account needed"), pill("Live preview styling"), pill("Origin allowlist"))),
    h("div.pick__act", {},
      websiteLive
        ? btn("Open widget settings", { kind: "ghost", icon: "arrow", onClick: () => toast("Widget settings") })
        : btn("Deploy the widget", { kind: "accent", icon: "arrow", onClick: () => { S.actions.connectChannel("website"); toast("Website widget deployed"); } }),
      websiteLive ? btn("Disconnect", { kind: "quiet", onClick: () => { S.actions.removeChannel(live.find((c) => c.type === "website").id); toast("Disconnected"); } })
                  : btn("Preview it first", { kind: "quiet", style: { justifyContent: "center" }, onClick: () => toast("Opening preview") })));

  const groups = S.CHANNEL_GROUPS.map((g) => {
    const items = S.CHANNEL_TYPES.filter((t) => t.group === g.id);
    return group(g.title, g.desc, items.length,
      h("div.tiles", {}, ...items.map((t) => {
        const on = liveTypes.has(t.id);
        return h("button.tile" + (on ? ".is-live" : ""), {
          onclick: () => {
            if (on) { S.actions.removeChannel(live.find((c) => c.type === t.id).id); toast(t.name + " disconnected"); }
            else { S.actions.connectChannel(t.id); toast(t.name + " connected"); }
          } },
          h("span.tile__mark", { style: { background: t.colour } }, t.mark),
          h("span", {}, h("span.tile__n", {}, t.name, on ? pill("Live", "ok") : null), h("span.tile__r", {}, on ? "Answering with Master Agent" : t.req)),
          h("span.tile__go", {}, icon(on ? "check" : "arrow", 14)));
      })));
  });

  return frag(
    pageHead({
      eyebrowIcon: "radio", eyebrow: `Channels · ${live.length} of ${S.CHANNEL_TYPES.length} live`,
      accentWord: live.length ? String(live.length) : "Nowhere",
      rest: live.length ? `channel${live.length === 1 ? "" : "s"} carrying your agent.` : "to answer yet.",
      sub: live.length
        ? "Each live channel runs the same master agent, so a customer gets the same answer whichever one they use."
        : "Your agent is built and its knowledge is indexed. It just has no way to reach anyone. Connecting one channel is all that stands between here and a first conversation.",
    }),
    live.length ? null : empty("No channel is deployed, so nothing reaches your agent",
      "Calls, chats and messages all arrive through a channel. Until one is live the dashboard stays empty."),
    pick, ...groups);
}

/* =========================================================================
   INBOX
   ========================================================================= */

let selected = null;

export function Inbox() {
  const s = S.get();
  const list = s.conversations;
  if (!list.length) {
    return frag(
      pageHead({ eyebrowIcon: "inbox", eyebrow: "Inbox · 0", accentWord: "No", rest: "conversations yet.",
        sub: "Every chat, call and message across every channel lands here." }),
      empty("Nothing has come in", "Deploy a channel and real conversations appear here automatically.",
        btn("Deploy a channel", { kind: "accent", onClick: () => go("#/channels") })));
  }

  if (!selected || !list.some((c) => c.id === selected)) selected = list[0].id;
  const convo = list.find((c) => c.id === selected);

  const items = h("div.split__list", {}, ...list.map((c) => {
    const def = S.CHANNEL_TYPES.find((t) => t.id === c.channel);
    return h("button.convo" + (c.id === selected ? ".is-on" : ""), { onclick: () => { selected = c.id; rerender(); } },
      h("span.convo__mark", { style: { background: def ? def.colour : "var(--accent)" } }, def ? def.mark : "?"),
      h("span.convo__b", {},
        h("span.convo__top", {}, h("span.convo__n", {}, c.contact), h("span.convo__t", {}, ago(c.at))),
        h("span.convo__p", {}, c.messages[c.messages.length - 1].text)));
  }));

  const def = S.CHANNEL_TYPES.find((t) => t.id === convo.channel);
  const thread = h("div.split__pane", {},
    h("div.thread__head", {},
      h("span.convo__mark", { style: { background: def ? def.colour : "var(--accent)" } }, def ? def.mark : "?"),
      h("div", {}, h("p.row__name", {}, convo.contact), h("p.row__meta", {}, `${def ? def.name : convo.channel} · ${ago(convo.at)}`)),
      h("div.row__end", {}, pill("Resolved", "ok"), btn("Delete", { size: "sm", onClick: () => { S.update((st) => { st.conversations = st.conversations.filter((x) => x.id !== convo.id); }); selected = null; rerender(); } }))),
    h("div.thread__log", {}, ...convo.messages.map((m) => h("div.bubble" + (m.from === "user" ? ".is-user" : ".is-agent"), {}, m.text))),
    h("div.chat__bar", {},
      h("input.inp", { placeholder: "Reply as the agent", onkeydown: (e) => {
        if (e.key !== "Enter" || !e.target.value.trim()) return;
        S.actions.reply(convo.id, e.target.value.trim()); e.target.value = ""; rerender();
      } }),
      btn("Send", { kind: "accent", onClick: () => toast("Press Enter to send") })));

  return frag(
    pageHead({ eyebrowIcon: "inbox", eyebrow: `Inbox · ${list.length}`,
      accentWord: String(list.length), rest: "conversations across every channel.",
      sub: "Voice calls, widget chats and messaging threads in one list, because to your customer they were all the same agent." }),
    h("div.split", {}, items, thread));
}

/* Router hook, wired in main.js */
export let rerender = () => {};
export function bindRerender(fn) { rerender = fn; }
