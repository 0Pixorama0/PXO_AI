/* =========================================================================
   Admin screens: Providers, Users, Plans, Usage & Billing, Settings
   ========================================================================= */

import * as S from "./store.js";
import {
  h, frag, icon, n, money, ago, pageHead, empty, pill, btn, field, input,
  select, toggle, choice, tabs, statStrip, group, card, modal, close, toast,
} from "./ui.js";
import { rerender } from "./views-core.js";

const go = (hash) => { location.hash = hash; };

/* =========================================================================
   PROVIDERS
   ========================================================================= */

let provFilter = "all";

export function Providers() {
  const s = S.get();
  const all = s.providers;
  const list = provFilter === "all" ? all : all.filter((p) => p.kind === provFilter);

  const counts = Object.fromEntries(S.PROVIDER_KINDS.map((k) => [k.id, all.filter((p) => p.kind === k.id).length]));
  const missing = S.PROVIDER_KINDS.filter((k) => !counts[k.id]);

  const filters = h("div.tabs", {},
    h("button" + (provFilter === "all" ? ".is-on" : ""), { onclick: () => { provFilter = "all"; rerender(); } },
      "All", h("span.tabs__n", {}, String(all.length))),
    ...S.PROVIDER_KINDS.map((k) =>
      h("button" + (provFilter === k.id ? ".is-on" : ""), { onclick: () => { provFilter = k.id; rerender(); } },
        k.name, h("span.tabs__n", {}, String(counts[k.id])))));

  return frag(
    pageHead({
      eyebrowIcon: "key", eyebrow: `Providers · ${all.length} configured`,
      accentWord: all.length ? String(all.length) : "No",
      rest: all.length ? "credentials powering every agent." : "credentials stored yet.",
      sub: "Speech, voice, language and embedding keys live here, encrypted at rest. Agents reference them rather than holding their own copies.",
      actions: btn("Add provider", { kind: "accent", icon: "plus", onClick: () => addProviderModal() }),
    }),
    missing.length
      ? empty(
          `${missing.length} of 4 capabilities have no provider`,
          "Missing " + missing.map((m) => m.name.toLowerCase()).join(", ") + ". Agents cannot run a full turn until each one resolves.",
          btn("Add provider", { kind: "accent", size: "sm", onClick: () => addProviderModal() }),
          { tone: "warn" })
      : null,
    h("div.ktools", {}, filters),
    list.length
      ? h("div.sources", {}, ...list.map(providerRow))
      : h("div.tiles", {}, ...S.PROVIDER_KINDS.filter((k) => provFilter === "all" || k.id === provFilter).map((k) =>
          h("button.tile", { onclick: () => addProviderModal(k.id) },
            h("span.tile__mark", { style: { background: "var(--accent)" } }, k.name.split(" ").map((w) => w[0]).join("").slice(0, 2)),
            h("span", {}, h("span.tile__n", {}, k.name), h("span.tile__r", {}, k.blurb)),
            h("span.tile__go", {}, icon("plus", 14))))));
}

function providerRow(p) {
  const kind = S.PROVIDER_KINDS.find((k) => k.id === p.kind);
  return h("article.src", {},
    h("span.src__mark", {}, icon("key", 18)),
    h("div", {},
      h("div.src__top", {}, h("h2.src__name", {}, p.name), pill(kind.name, "accent"), pill("Verified", "ok")),
      h("p.src__url", {}, "sk_live_" + "•".repeat(28)),
      h("div.src__facts", {},
        h("div", {}, h("p.label", {}, "Capability"), h("p.fact__v", {}, kind.name)),
        h("div", {}, h("p.label", {}, "Added"), h("p.fact__v", {}, ago(p.created))),
        h("div", {}, h("p.label", {}, "Used by"), h("p.fact__v", {}, `${S.get().agents.length} agents`)))),
    h("div.src__side", {}, h("span.label", {}, "Encrypted at rest"),
      h("div.src__acts", {},
        btn("Verify", { size: "sm", onClick: () => toast("Credential verified") }),
        btn("Remove", { size: "sm", onClick: () => { S.actions.removeProvider(p.id); toast("Removed " + p.name); } }))));
}

function addProviderModal(preset) {
  let kind = preset || "llm";
  let name = S.PROVIDER_KINDS.find((k) => k.id === kind).options[0];
  let key = "";

  const nameHost = h("div");
  const drawNames = () => {
    nameHost.replaceChildren(field("Provider",
      select(S.PROVIDER_KINDS.find((k) => k.id === kind).options, name, (v) => (name = v)),
      "The service that will handle this capability."));
  };
  drawNames();

  const body = h("div", {},
    h("div.pickrow", {}, ...S.PROVIDER_KINDS.map((k) =>
      h("button.pickrow__i" + (k.id === kind ? ".is-on" : ""), { onclick: (e) => {
          kind = k.id; name = k.options[0];
          [...e.currentTarget.parentElement.children].forEach((c) => c.classList.remove("is-on"));
          e.currentTarget.classList.add("is-on");
          drawNames();
        } },
        icon({ stt: "msg", tts: "radio", llm: "server", embed: "db" }[k.id], 18),
        h("span.pickrow__t", {}, k.name),
        h("span.pickrow__d", {}, k.blurb)))),
    nameHost,
    field("API key", input({ placeholder: "sk-…", mono: true, type: "password", onInput: (v) => (key = v) }),
      "Encrypted with AES-256-GCM before it touches the database. It is never returned to the browser again."));

  modal({ title: "Add a provider", desc: "Credentials are stored once and referenced by every agent.", body,
    footer: frag(
      btn("Cancel", { kind: "quiet", onClick: close }),
      btn("Add provider", { kind: "accent", onClick: () => {
        if (!key.trim()) return toast("Paste an API key", "warn");
        S.actions.addProvider(kind, name); close(); toast(name + " connected");
      } })) });
}

/* =========================================================================
   USERS
   ========================================================================= */

export function Users() {
  const s = S.get();
  const admins = s.users.filter((u) => u.role === "Admin").length;

  return frag(
    pageHead({
      eyebrowIcon: "users", eyebrow: `Team · ${s.users.length} member${s.users.length === 1 ? "" : "s"}`,
      accentWord: String(s.users.length), rest: "people with access to this workspace.",
      sub: "Admins configure providers, plans and connectors. Members build agents and manage knowledge inside the quota assigned to them.",
      actions: btn("Invite member", { kind: "accent", icon: "plus", onClick: inviteModal }),
    }),
    statStrip([
      { label: "Members", value: s.users.length },
      { label: "Admins", value: admins },
      { label: "Deactivated", value: s.users.filter((u) => !u.active).length },
    ]),
    h("div.tablewrap", {},
      h("table.table", {},
        h("thead", {},
          h("tr", {},
            h("th", {}, "Member"),
            h("th", {}, "Role"),
            h("th", {}, "Plan"),
            h("th", {}, "Status"),
            h("th", { style: { textAlign: "right" } }, "Actions"))),
        h("tbody", {}, ...s.users.map(userRow)))));
}

function userRow(u) {
  return h("tr", {},
    h("td", {},
      h("div.tcell", {},
        h("span.avatar.is-sm", {}, u.name.slice(0, 1)),
        h("div", {},
          h("p.row__name", {}, u.name),
          h("p.row__meta", {}, u.email)))),
    h("td", {}, pill(u.role, u.role === "Admin" ? "accent" : "mute")),
    h("td", {}, h("span.mono", {}, u.tier)),
    h("td", {}, pill(u.active ? "Active" : "Deactivated", u.active ? "ok" : "warn", true)),
    h("td", { style: { textAlign: "right" } },
      h("div.tacts", {},
        btn(u.active ? "Deactivate" : "Reactivate", {
          size: "sm",
          onClick: () => { S.actions.toggleUser(u.id); rerender(); },
        }),
        btn("Remove", {
          size: "sm",
          onClick: () => { S.actions.removeUser(u.id); toast("Removed " + u.name); },
        }))));
}

function inviteModal() {
  let name = "", email = "", role = "Member";
  const body = h("div", {},
    field("Full name", input({ placeholder: "Priya Nair", onInput: (v) => (name = v) })),
    field("Email address", input({ placeholder: "priya@company.com", type: "email", onInput: (v) => (email = v) }),
      "They receive a magic link. No password is ever set by you."),
    field("Role", select(["Member", "Admin"], role, (v) => (role = v)),
      "Admins can configure providers, plans and connectors for everyone."));

  modal({ title: "Invite a member", desc: "They join this workspace and inherit the plan you assign.", body,
    footer: frag(
      btn("Cancel", { kind: "quiet", onClick: close }),
      btn("Send invite", { kind: "accent", onClick: () => {
        if (!name.trim() || !email.includes("@")) return toast("Name and a valid email are required", "warn");
        S.actions.inviteUser(name.trim(), email.trim(), role); close(); toast("Invite sent to " + email.trim());
      } })) });
}

/* =========================================================================
   PLANS
   ========================================================================= */

export function Plans() {
  const s = S.get();
  const cap = (v) => (v === 0 ? "Unlimited" : n(v));

  return frag(
    pageHead({
      eyebrowIcon: "card", eyebrow: s.activePlan ? "Plan · assigned" : "Plan · unassigned",
      accentWord: s.activePlan ? s.plans.find((p) => p.id === s.activePlan).name : "No",
      rest: s.activePlan ? "is the active plan." : "plan is assigned.",
      sub: "Plans cap agents, channels, tool servers, storage and monthly chats. Until one is assigned nothing is metered and nothing is capped.",
    }),
    s.activePlan ? null : empty("Quotas are not being enforced",
      "Any user can create unlimited agents, channels and sources right now. Assign a plan before this workspace goes to production.",
      null, { tone: "warn" }),
    h("div.plans", {}, ...s.plans.map((p) => {
      const on = s.activePlan === p.id;
      return h("article.plan" + (on ? ".is-on" : ""), {},
        on ? h("span.plan__flag", {}, "Active") : null,
        h("p.label", {}, p.name),
        h("p.plan__p", {}, p.price === 0 ? "Free" : money(p.price), p.price ? h("span.plan__per", {}, "/month") : null),
        h("ul.plan__l", {},
          ...[["Agents", cap(p.agents)], ["Channels", cap(p.channels)], ["Tool servers", cap(p.mcp)],
              ["Knowledge storage", p.storageMb ? n(p.storageMb) + " MB" : "Unlimited"], ["Monthly chats", cap(p.chats)]]
            .map(([k, v]) => h("li", {}, icon("check", 12), h("span", {}, k), h("span.plan__v", {}, v)))),
        btn(on ? "Current plan" : "Assign this plan", { kind: on ? "ghost" : "accent",
          style: { marginTop: "auto", justifyContent: "center" },
          onClick: () => { if (!on) { S.actions.assignPlan(p.id); toast(p.name + " assigned"); } } }));
    })));
}

/* =========================================================================
   USAGE & BILLING
   ========================================================================= */

export function Usage() {
  const s = S.get();
  const u = S.derive.usage();
  const rows = [
    ["Language model", 0.46, "llm"], ["Text to speech", 0.27, "tts"],
    ["Speech to text", 0.17, "stt"], ["Telephony", 0.10, "tel"],
  ];
  const palette = ["var(--d-violet)", "var(--d-blue)", "var(--d-cyan)", "var(--d-magenta)"];

  if (!u.conversations) {
    return frag(
      pageHead({ eyebrowIcon: "receipt", eyebrow: "Usage · this period", accentWord: money(0), rest: "spent so far.",
        sub: "Every unit of speech, language model, telephony and embedding work is metered per request." }),
      empty("Nothing has been metered yet", "Costs appear the moment a channel takes its first conversation.",
        btn("Deploy a channel", { kind: "accent", size: "sm", onClick: () => go("#/channels") })));
  }

  return frag(
    pageHead({ eyebrowIcon: "receipt", eyebrow: `Usage · ${u.conversations} conversations`,
      accentWord: money(u.cost), rest: "spent this period.",
      sub: "Metered per request across speech, language model, telephony and embedding calls. No plan is applied to these figures unless one is assigned." }),
    statStrip([
      { label: "Conversations", value: n(u.conversations) }, { label: "Calls", value: n(u.calls) },
      { label: "Tokens", value: n(u.tokens) }, { label: "Unique users", value: n(u.users) },
    ]),
    h("div.grid-2", {},
      card("Cost by service", "This period", frag(...rows.map(([name, share], i) =>
        h("div.rank", {},
          h("div.rank__top", {},
            h("span.rank__name", {}, name),
            h("span.rank__v.num", {}, money(u.cost * share)),
            h("span.rank__pct", {}, (share * 100).toFixed(0) + "%")),
          h("div.rank__track", {}, h("div.rank__fill", { style: { background: palette[i], transform: `scaleX(${share})` } })))))),
      card("Cost per conversation", "Blended", frag(
        h("p.label", {}, "Average"),
        h("p.kpi__sv.num", {}, money(u.conversations ? u.cost / u.conversations : 0)),
        h("p.kpi__sm", {}, "Across every channel and both voice and text."),
        h("div.cardfoot", {}, h("span.label", {}, "Billing"),
          h("span.cardfoot__v", {}, s.activePlan ? s.plans.find((p) => p.id === s.activePlan).name : "No plan assigned"))))));
}

/* =========================================================================
   SETTINGS
   ========================================================================= */

let setTab = "models";

export function Settings() {
  const s = S.get();

  const panels = {
    models: modelsPanel, branding: brandingPanel, channels: channelsPanel,
    connectors: connectorsPanel, composio: composioPanel,
  };

  return frag(
    pageHead({ eyebrowIcon: "gear", eyebrow: "Workspace", accentWord: s.workspace.name, rest: "settings.",
      sub: "Model defaults, branding and integration credentials. Changes here apply to every agent and every channel in the workspace." }),
    h("div.ktools", {}, tabs([
      { id: "models", label: "Models", icon: "zap" }, { id: "branding", label: "Branding", icon: "gear" },
      { id: "channels", label: "Channels", icon: "phone" }, { id: "connectors", label: "Connectors", icon: "plug" },
      { id: "composio", label: "Composio", icon: "db" },
    ], setTab, (id) => { setTab = id; rerender(); })),
    panels[setTab]());
}

function modelsPanel() {
  const s = S.get();
  const rows = [
    ["llm", "Language model", "Does the reasoning and every tool call.", S.PROVIDER_KINDS[2].options],
    ["embed", "Embedding model", "Indexes knowledge and retrieves it at query time.", S.PROVIDER_KINDS[3].options],
    ["stt", "Speech to text", "Transcribes caller audio in real time.", S.PROVIDER_KINDS[0].options],
    ["tts", "Text to speech", "Gives the agent its voice on calls.", S.PROVIDER_KINDS[1].options],
  ];
  return card("Workspace defaults", "Applied to any agent that does not override them",
    frag(...rows.map(([slot, title, desc, opts]) =>
      h("div.setrow", {},
        h("div", {}, h("p.row__name", {}, title), h("p.row__meta", {}, desc)),
        select(opts, s.models[slot], (v) => { S.actions.setModel(slot, v); toast(title + " set to " + v); })))));
}

function brandingPanel() {
  const s = S.get();
  const swatches = ["#7c3aed", "#3a33c9", "#b23fc9", "#18bccf", "#12a150", "#e0562c"];
  return card("White-label branding", "Seen by every user in this workspace", frag(
    field("Workspace name", input({ value: s.workspace.name, onInput: (v) => S.actions.setBranding({ name: v }) }),
      "Appears in the sidebar, the breadcrumb and every transactional email."),
    field("Logo initials", input({ value: s.workspace.logo, onInput: (v) => S.actions.setBranding({ logo: v.slice(0, 2).toUpperCase() }) }),
      "Two characters, shown in the gradient mark."),
    h("p.label", { style: { marginTop: "var(--s-6)" } }, "Accent colour"),
    h("p.row__meta", { style: { marginBottom: "var(--s-4)" } }, "Applied live across the entire interface."),
    h("div.swatches", {}, ...swatches.map((c) =>
      h("button.swatch" + (c === s.workspace.accent ? ".is-on" : ""), {
        style: { background: c }, "aria-label": c,
        onclick: () => { S.actions.setBranding({ accent: c }); toast("Accent updated"); } })))));
}

function channelsPanel() {
  const live = S.derive.liveChannels();
  return card("Deployed channels", `${live.length} live`,
    live.length
      ? frag(...live.map((c) => {
          const def = S.CHANNEL_TYPES.find((t) => t.id === c.type);
          return h("div.row", {},
            h("span.row__icon", { style: { background: def.colour, color: "#fff", borderColor: "transparent" } }, def.mark),
            h("div", {}, h("p.row__name", {}, def.name), h("p.row__meta", {}, "Deployed " + ago(c.created))),
            h("div.row__end", {}, pill("Live", "ok", true),
              btn("Disconnect", { size: "sm", onClick: () => { S.actions.removeChannel(c.id); toast(def.name + " disconnected"); } })));
        }))
      : empty("No channels deployed", "Connect one and it appears here with its binding and status.",
          btn("Go to Channels", { kind: "accent", size: "sm", onClick: () => go("#/channels") })));
}

function connectorsPanel() {
  const list = ["Google Drive", "OneDrive", "SharePoint", "Notion", "Confluence", "Dropbox", "Slack", "Gmail", "Airtable", "Zendesk"];
  return card("Knowledge connectors", "OAuth apps available to every member",
    h("div.tiles", {}, ...list.map((name) =>
      h("button.tile", { onclick: () => toast(name + " OAuth app configured") },
        h("span.tile__mark", { style: { background: "var(--accent)" } }, name.slice(0, 2).toUpperCase()),
        h("span", {}, h("span.tile__n", {}, name), h("span.tile__r", {}, "Not configured")),
        h("span.tile__go", {}, icon("arrow", 14))))));
}

function composioPanel() {
  const c = S.get().composio;
  return card("Composio integration", "Hosts MCP servers and handles OAuth per provider", frag(
    h("p", { style: { fontSize: "var(--t-sm)", color: "var(--text-2)", lineHeight: "1.6", marginBottom: "var(--s-5)" } },
      "Add the workspace keys once and every member can connect their own accounts in one click."),
    field("MCP consumer key", input({ value: c.mcpKey, type: "password", mono: true, placeholder: "ck_…", onInput: (v) => S.actions.setComposio({ mcpKey: v }) }),
      "Powers tool calls at runtime."),
    field("Platform API key", input({ value: c.platformKey, type: "password", mono: true, placeholder: "ak_…", onInput: (v) => S.actions.setComposio({ platformKey: v }) }),
      "Syncs the catalogue and handles connection setup."),
    field("MCP URL", input({ value: c.url, mono: true, onInput: (v) => S.actions.setComposio({ url: v }) }),
      "Leave the default unless Composio gave you a different endpoint."),
    h("div", { style: { display: "flex", gap: "var(--s-3)", marginTop: "var(--s-5)" } },
      btn("Save keys", { kind: "accent", onClick: () => toast("Composio keys saved") }),
      btn("Remove keys", { kind: "quiet", onClick: () => { S.actions.setComposio({ mcpKey: "", platformKey: "" }); rerender(); toast("Keys removed"); } }))));
}
