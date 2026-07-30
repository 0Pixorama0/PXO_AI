/* =========================================================================
   Shell + router. One nav, one header, one render path for every screen.
   ========================================================================= */

import * as S from "./store.js";
import { h, frag, icon, btn, pill, ago, modal, close, toast, enter, logoMark } from "./ui.js";
import * as Core from "./views-core.js";
import * as Admin from "./views-admin.js";

const NAV = [
  { group: "Generic", items: [
    { id: "dashboard", label: "Dashboard", icon: "dash",  route: "#/" },
    { id: "knowledge", label: "Knowledge", icon: "book",  route: "#/knowledge" },
    { id: "mcp",       label: "MCP Tools", icon: "blocks",    route: "#/mcp" },
    { id: "agents",    label: "Agents",    icon: "bot",   route: "#/agents" },
    { id: "channels",  label: "Channels",  icon: "waypoints", route: "#/channels" },
    { id: "inbox",     label: "Inbox",     icon: "inbox", route: "#/inbox" },
  ]},
  { group: "Admin", items: [
    { id: "providers", label: "Providers",      icon: "key",     route: "#/providers" },
    { id: "users",     label: "Users",          icon: "users", route: "#/users" },
    { id: "plans",     label: "Plans",          icon: "card",  route: "#/plans" },
    { id: "usage",     label: "Usage & Billing",icon: "receipt", route: "#/usage" },
    { id: "settings",  label: "Settings",       icon: "gear",  route: "#/settings" },
  ]},
];

const ROUTES = {
  "":           { id: "dashboard", crumb: "Dashboard",      view: Core.Dashboard },
  "knowledge":  { id: "knowledge", crumb: "Knowledge",      view: Core.Knowledge },
  "mcp":        { id: "mcp",       crumb: "MCP Tools",      view: Core.Mcp },
  "agents":     { id: "agents",    crumb: "Agents",         view: Core.Agents },
  "channels":   { id: "channels",  crumb: "Channels",       view: Core.Channels },
  "inbox":      { id: "inbox",     crumb: "Inbox",          view: Core.Inbox },
  "providers":  { id: "providers", crumb: "Providers",      view: Admin.Providers },
  "users":      { id: "users",     crumb: "Users",          view: Admin.Users },
  "plans":      { id: "plans",     crumb: "Plans",          view: Admin.Plans },
  "usage":      { id: "usage",     crumb: "Usage & Billing",view: Admin.Usage },
  "settings":   { id: "settings",  crumb: "Settings",       view: Admin.Settings },
};

/* --- Theme + accent ------------------------------------------------------ */

const root = document.documentElement;
const params = new URLSearchParams(location.search);
if (params.get("theme")) root.dataset.theme = params.get("theme");
else if (localStorage.getItem("voiceforge.theme")) root.dataset.theme = localStorage.getItem("voiceforge.theme");
else if (window.matchMedia("(prefers-color-scheme: dark)").matches) root.dataset.theme = "dark";

function applyBranding() {
  const w = S.get().workspace;
  root.style.setProperty("--accent", w.accent);
  root.style.setProperty("--accent-soft", w.accent + "18");
  root.style.setProperty("--accent-line", w.accent + "38");
}

/* --- Shell --------------------------------------------------------------- */

function currentRoute() {
  const raw = location.hash.replace(/^#\/?/, "");
  const [head, tail] = raw.split("/");
  return { key: head || "", param: tail, def: ROUTES[head || ""] };
}

function sidebar(activeId) {
  const w = S.get().workspace;
  return h("aside.sidebar", {},
    h("a.brand", { href: "#/" },
      logoMark(w),
      h("span.brand__name", {}, w.name)),
    h("nav", {}, ...NAV.map((g) =>
      h("div.nav__group", {},
        h("p.label.nav__title", {}, g.group),
        ...g.items.map((it) =>
          h("a.nav__item" + (it.id === activeId ? ".is-active" : ""), { href: it.route },
            icon(it.icon), it.label,
            it.id === activeId ? h("span.nav__dot") : null))))),
    h("div.sidebar__foot", {},
      h("button.collapse", { onclick: () => document.body.classList.toggle("is-narrow") },
        icon("panel"), "Collapse")));
}

function topbar(crumb) {
  const s = S.get();
  const unread = s.notifications.filter((x) => !x.read).length;
  return h("header.topbar", {},
    h("div.crumbs", {},
      h("span", {}, s.workspace.name),
      h("span.crumbs__sep", {}, "/"),
      h("span.crumbs__here", {}, crumb)),
    h("div.topbar__actions", {},
      h("button.iconbtn", { "aria-label": "Notifications", onclick: notificationsModal },
        icon("bell"),
        unread ? h("span.iconbtn__badge.num", {}, String(unread)) : null),
      // Show the mode you would switch to, not the one you are in.
      h("button.iconbtn", { "aria-label": "Toggle theme", onclick: () => {
          const next = root.dataset.theme === "dark" ? "light" : "dark";
          root.dataset.theme = next;
          localStorage.setItem("voiceforge.theme", next);
          render();
        } }, icon(root.dataset.theme === "dark" ? "sun" : "moon")),
      h("div.avatar", {}, s.users[0]?.name.slice(0, 1) || "U")));
}

function notificationsModal() {
  const list = S.get().notifications;
  modal({
    title: "Notifications", desc: list.length ? `${list.length} recent events` : "Nothing yet",
    body: list.length
      ? h("div.notes", {}, ...list.map((nt) => h("div.note" + (nt.read ? "" : ".is-new"), {},
          h("span.note__d"),
          h("div", {}, h("p.row__name", {}, nt.text), h("p.row__meta", {}, ago(nt.when))))))
      : h("p.ksub", {}, "Ingestion results, channel deployments and plan changes appear here."),
    footer: frag(
      btn("Mark all read", { kind: "quiet", onClick: () => { S.actions.readNotifications(); close(); } }),
      btn("Done", { kind: "accent", onClick: close })),
  });
}

/* --- Render -------------------------------------------------------------- */

let mounted = false;

function render() {
  applyBranding();
  const { key, param, def } = currentRoute();

  // Agent editor is a sub-route of Agents.
  let view, activeId, crumb;
  if (key === "agents" && param) {
    view = () => Core.AgentEditor(param);
    activeId = "agents";
    crumb = param === "new" ? "New agent" : "Edit agent";
  } else if (def) {
    view = def.view; activeId = def.id; crumb = def.crumb;
  } else {
    location.hash = "#/"; return;
  }

  const app = document.querySelector("#app");
  const canvas = h("main.canvas");
  try {
    canvas.append(view());
  } catch (err) {
    console.error(err);
    canvas.append(h("div.empty", {}, icon("alert", 18, { color: "var(--warn)" }),
      h("div", {}, h("p.empty__t", {}, "This screen failed to render"), h("p.empty__d", {}, String(err.message)))));
  }

  app.replaceChildren(
    sidebar(activeId),
    h("div", {}, topbar(crumb), canvas));

  document.title = `VoiceForge · ${crumb}`;
  window.scrollTo(0, 0);
  enter(canvas);
  mounted = true;
}

Core.bindRerender(render);
S.subscribe(() => { if (mounted) render(); });
window.addEventListener("hashchange", render);

/* Dev helper: ?reset=1 wipes the store back to seed. */
if (params.get("reset")) { S.reset(); history.replaceState(null, "", location.pathname + location.hash); }

if (!location.hash) location.hash = "#/";
document.fonts.ready.then(render);

/* Expose for the verification script. */
window.__vf = { store: S, render, reset: S.reset };
