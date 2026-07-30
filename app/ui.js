/* =========================================================================
   UI primitives. A tiny hyperscript plus the components every screen shares,
   so a new screen is assembly rather than design.
   ========================================================================= */

export function h(tag, props = {}, ...kids) {
  const [name, ...classes] = tag.split(".");
  const el = document.createElement(name || "div");
  if (classes.length) el.className = classes.join(" ");

  for (const [k, v] of Object.entries(props || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === "class") el.className = [el.className, v].filter(Boolean).join(" ");
    else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
    else if (k === "html") el.innerHTML = v;
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === "value") el.value = v;
    else if (k === "checked") el.checked = !!v;
    else el.setAttribute(k, v === true ? "" : v);
  }

  const add = (kid) => {
    if (kid === null || kid === undefined || kid === false) return;
    if (Array.isArray(kid)) return kid.forEach(add);
    el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  };
  kids.forEach(add);
  return el;
}

export const frag = (...kids) => {
  const f = document.createDocumentFragment();
  kids.flat().forEach((k) => k && f.append(k instanceof Node ? k : document.createTextNode(String(k))));
  return f;
};

/** Inline sprite reference. size is px. */
export function icon(id, size = 16, extra = {}) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "icon");
  svg.style.width = size + "px";
  svg.style.height = size + "px";
  Object.assign(svg.style, extra);
  const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
  use.setAttribute("href", "#i-" + id);
  svg.append(use);
  return svg;
}

/** The PXO brand mark. A white-label workspace that has set its own initials
    gets the gradient-square fallback instead. */
export function logoMark(workspace) {
  if (!workspace.officialMark) {
    return h("div.brand__mark", {}, workspace.logo || "PX");
  }
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "logo");
  svg.setAttribute("viewBox", "0 0 197 122");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "Pixorama");
  const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
  use.setAttribute("href", "#i-pxo");
  svg.append(use);
  return svg;
}

/* --- Formatting --------------------------------------------------------- */

export const n = (v) => (v ?? 0).toLocaleString();
export const money = (v) => "$" + (v ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function ago(ts) {
  if (!ts) return "never";
  const s = Math.max(1, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} minute${m === 1 ? "" : "s"} ago`;
  const hr = Math.round(m / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? "" : "s"} ago`;
  const d = Math.round(hr / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

/* --- Shared blocks ------------------------------------------------------ */

/** Eyebrow pill + weight-mixed statement + supporting line. Every page opens
    with this, which is what makes the product feel like one product. */
export function pageHead({ eyebrowIcon = "dash", eyebrow, accentWord, rest, sub, actions }) {
  return h("div.khead", {},
    h("div", {},
      h("span.eyebrow-pill", {},
        icon(eyebrowIcon, 13, { color: "var(--accent)" }),
        h("span.label", { style: { color: "var(--text-2)" } }, eyebrow)),
      h("h1.kstatement", {},
        accentWord ? h("em", {}, h("strong", {}, accentWord)) : null,
        accentWord ? " " : null,
        rest),
      sub ? h("p.ksub", {}, sub) : null),
    actions ? h("div", { style: { display: "flex", gap: "var(--s-3)" } }, actions) : null);
}

/** The one-line empty state that replaces the 380px grey box.
    Most empty states are information, not alarms — "no sources yet" on a new
    account is normal. Only pass tone:"warn" when something is actually wrong. */
export function empty(title, desc, action, { tone = "info", icon: ic } = {}) {
  return h(`div.empty.empty--${tone}`, {},
    icon(ic || (tone === "warn" ? "warn" : "info"), 18, { flex: "none" }),
    h("div", {}, h("p.empty__t", {}, title), h("p.empty__d", {}, desc)),
    action || null);
}

export function pill(text, kind = "mute", withDot = false) {
  return h(`span.pill.pill--${kind}`, {}, withDot ? h("span.dot") : null, text);
}

export function btn(label, { kind = "ghost", size = "", icon: ic, onClick, style } = {}) {
  // A forward arrow reads as "and then"; it belongs after the label, not before.
  const trailing = ic === "arrow" || ic === "check";
  const glyph = ic ? icon(ic, size === "sm" ? 13 : 15) : null;
  return h(`button.btn.btn--${kind}` + (size ? `.btn--${size}` : ""), { onclick: onClick, style },
    trailing ? null : glyph, label, trailing ? glyph : null);
}

export function field(label, input, hint) {
  return h("div.formrow", {},
    h("label.formrow__l", {}, label),
    input,
    hint ? h("p.formrow__h", {}, hint) : null);
}

export function input({ value = "", placeholder = "", type = "text", onInput, mono } = {}) {
  return h("input.inp" + (mono ? ".is-mono" : ""), {
    type, value, placeholder,
    oninput: (e) => onInput && onInput(e.target.value),
  });
}

export function textarea({ value = "", rows = 8, onInput } = {}) {
  return h("textarea.inp.is-mono.is-area", { rows, oninput: (e) => onInput && onInput(e.target.value) }, value);
}

export function select(options, value, onChange) {
  return h("select.inp.is-select", { onchange: (e) => onChange(e.target.value) },
    ...options.map((o) => h("option", { value: o, selected: o === value }, o)));
}

export function toggle(on, onChange) {
  return h("button.switch" + (on ? ".is-on" : ""), {
    role: "switch", "aria-checked": on ? "true" : "false",
    onclick: () => onChange(!on),
  }, h("span.switch__k"));
}

/** Selectable card, the pattern the agent wizard already got right. */
export function choice({ title, desc, selected, onSelect }) {
  return h("button.choice" + (selected ? ".is-on" : ""), { onclick: onSelect },
    selected ? h("span.choice__tick", {}, icon("check", 11)) : null,
    h("span.choice__t", {}, title),
    h("span.choice__d", {}, desc));
}

export function tabs(items, active, onPick) {
  return h("div.tabs", {},
    ...items.map((t) => h("button" + (t.id === active ? ".is-on" : ""), { onclick: () => onPick(t.id) },
      t.icon ? icon(t.icon, 14) : null,
      t.label,
      t.count !== undefined ? h("span.tabs__n", {}, String(t.count)) : null)));
}

export function statStrip(items) {
  return h("div.kstrip", {},
    ...items.map((s) => h("div.kstat" + (s.value === 0 || s.value === "0" ? ".is-zero" : ""), {},
      h("span.kstat__v.num", {}, String(s.value)),
      h("span.label", {}, s.label))),
  );
}

export function group(title, desc, count, body) {
  return h("section.group", {},
    h("div.group__head", {},
      h("h2.group__t", {}, title),
      desc ? h("p.group__d", {}, desc) : null,
      count !== undefined ? h("span.group__n", {}, `${count} AVAILABLE`) : null),
    body);
}

export function card(title, note, body, tools) {
  return h("section.card", {},
    title ? h("div.card__head", {},
      h("h2.card__title", {}, title),
      note ? h("span.card__note", {}, note) : null,
      tools ? h("div.card__tools", {}, tools) : null) : null,
    h("div.card__body", {}, body));
}

/* --- Modal -------------------------------------------------------------- */

let openModal = null;

export function modal({ title, desc, body, footer, wide }) {
  close();
  const panel = h("div.modal__panel" + (wide ? ".is-wide" : ""), {},
    h("div.modal__head", {},
      h("div", {}, h("h2.modal__t", {}, title), desc ? h("p.modal__d", {}, desc) : null),
      h("button.iconbtn", { onclick: close, "aria-label": "Close" }, icon("close", 16))),
    h("div.modal__body", {}, body),
    footer ? h("div.modal__foot", {}, footer) : null);

  const back = h("div.modal", { onclick: (e) => { if (e.target === back) close(); } }, panel);
  document.body.append(back);
  document.body.style.overflow = "hidden";
  openModal = back;

  const esc = (e) => { if (e.key === "Escape") close(); };
  document.addEventListener("keydown", esc);
  back._esc = esc;

  requestAnimationFrame(() => back.classList.add("is-open"));
  const focusable = panel.querySelector("input, select, textarea, button.btn");
  if (focusable) focusable.focus();
  return { close };
}

export function close() {
  if (!openModal) return;
  document.removeEventListener("keydown", openModal._esc);
  openModal.remove();
  openModal = null;
  document.body.style.overflow = "";
}

/* --- Toast -------------------------------------------------------------- */

export function toast(text, kind = "ok") {
  let host = document.querySelector(".toasts");
  if (!host) { host = h("div.toasts"); document.body.append(host); }
  const t = h(`div.toast.toast--${kind}`, {}, icon(kind === "ok" ? "check" : "alert", 14), text);
  host.append(t);
  requestAnimationFrame(() => t.classList.add("is-in"));
  setTimeout(() => { t.classList.remove("is-in"); setTimeout(() => t.remove(), 260); }, 2600);
}

/* --- Motion ------------------------------------------------------------- */

export const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Every view entrance uses this, so the whole app moves with one rhythm. */
export function enter(root) {
  if (REDUCED || !window.gsap) return;
  const bits = root.querySelectorAll(
    ".khead > *, .empty, .pick, .card, .group, .src, .tile, .kstrip, .ktools, .corpus, .kpi, .band, .hero, .wizard, .split"
  );
  gsap.fromTo(bits, { y: 12, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.44, ease: "power3.out", stagger: 0.035, overwrite: true, clearProps: "transform,opacity" });
}
