/* Walks every route, exercises the real interactions, screenshots the lot. */
import { spawn } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9360;
const BASE = "http://127.0.0.1:4780/index.html";

mkdirSync("shots/app", { recursive: true });

const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--hide-scrollbars",
  `--remote-debugging-port=${PORT}`,
  "--user-data-dir=C:/Users/udesh/AppData/Local/Temp/claude/cdp-app",
  "--window-size=1440,1000", "about:blank"], { stdio: "ignore" });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let url;
for (let i = 0; i < 50; i++) {
  try {
    const l = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
    const p = l.find((t) => t.type === "page");
    if (p) { url = p.webSocketDebuggerUrl; break; }
  } catch {}
  await sleep(250);
}

const ws = new WebSocket(url);
await new Promise((r) => (ws.onopen = r));

let id = 0;
const pend = new Map();
const errors = [];
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); }
  if (m.method === "Runtime.exceptionThrown")
    errors.push("EXC " + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text).split("\n")[0]);
  if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error")
    errors.push("CONSOLE " + m.params.args.map((a) => a.value ?? a.description).join(" ").split("\n")[0]);
  if (m.method === "Log.entryAdded" && m.params.entry.level === "error" && !/favicon/.test(m.params.entry.text))
    errors.push("LOG " + m.params.entry.text);
};
const send = (method, params = {}) =>
  new Promise((res) => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) =>
  (await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true })).result?.value;

async function shot(name, theme = "light") {
  const { cssContentSize } = await send("Page.getLayoutMetrics");
  const hgt = Math.min(Math.ceil(cssContentSize.height), 2600);
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: hgt, deviceScaleFactor: 1, mobile: false });
  await sleep(320);
  const { data } = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(`shots/app/${name}.png`, Buffer.from(data, "base64"));
  await send("Emulation.clearDeviceMetricsOverride");
}

async function goTo(hash) {
  await ev(`location.hash = ${JSON.stringify(hash)}`);
  await sleep(950);
}

await send("Runtime.enable");
await send("Log.enable");
await send("Page.enable");

console.log("\n=== boot ===");
await send("Page.navigate", { url: BASE + "?theme=light&reset=1" });
await sleep(2600);
console.log("  shell rendered :", await ev(`!!document.querySelector('.sidebar') && !!document.querySelector('.topbar')`));
console.log("  nav items      :", await ev(`document.querySelectorAll('.nav__item').length`));

const ROUTES = [
  ["#/",          "dashboard"],
  ["#/knowledge", "knowledge"],
  ["#/mcp",       "mcp"],
  ["#/agents",    "agents"],
  ["#/channels",  "channels"],
  ["#/inbox",     "inbox"],
  ["#/providers", "providers"],
  ["#/users",     "users"],
  ["#/plans",     "plans"],
  ["#/usage",     "usage"],
  ["#/settings",  "settings"],
];

console.log("\n=== every route renders ===");
for (const [hash, name] of ROUTES) {
  await goTo(hash);
  const ok = await ev(`(() => {
    const c = document.querySelector('.canvas');
    return c && c.children.length > 0 && !c.textContent.includes('failed to render');
  })()`);
  const active = await ev(`document.querySelector('.nav__item.is-active')?.textContent.trim()`);
  console.log(`  ${name.padEnd(10)} ${ok ? "ok" : "FAILED"}   nav=${active}`);
  await shot(name);
}

console.log("\n=== interactions ===");

// 1. Connect a channel -> should create traffic and flip the dashboard
await goTo("#/channels");
await ev(`[...document.querySelectorAll('.tile')].find(t => t.textContent.includes('Telegram')).click()`);
await sleep(700);
console.log("  channel connected :", await ev(`__vf.store.derive.liveChannels().length`));
console.log("  traffic seeded    :", await ev(`__vf.store.get().conversations.length > 0`));

await goTo("#/");
console.log("  dashboard flipped :", await ev(`!!document.querySelector('.kpi')`), "(operating state)");
await shot("dashboard-operating");

await goTo("#/inbox");
console.log("  inbox populated   :", await ev(`document.querySelectorAll('.convo').length`));
await shot("inbox-populated");

// 2. Knowledge: add a source, watch it index
await goTo("#/knowledge");
await ev(`[...document.querySelectorAll('.btn')].find(b => b.textContent.includes('Add source')).click()`);
await sleep(500);
console.log("  modal open        :", await ev(`!!document.querySelector('.modal.is-open')`));
await shot("knowledge-modal");
await ev(`(() => {
  const i = document.querySelectorAll('.modal input');
  const set = (el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); };
  set(i[0], 'Product Docs'); set(i[1], 'https://docs.example.com');
  [...document.querySelectorAll('.modal .btn')].find(b => b.textContent.includes('Add source')).click();
})()`);
await sleep(3400);
console.log("  source added      :", await ev(`__vf.store.get().knowledge.length`));
console.log("  it finished index :", await ev(`__vf.store.get().knowledge.every(k => k.status === 'ready')`));

// 3. MCP: connect a tool
await goTo("#/mcp");
await ev(`[...document.querySelectorAll('.tile')].find(t => t.textContent.includes('GitHub')).click()`);
await sleep(600);
console.log("  mcp connected     :", await ev(`__vf.store.get().mcpServers.length`));

// 4. Providers: add one through the modal
await goTo("#/providers");
await ev(`[...document.querySelectorAll('.btn')].find(b => b.textContent.includes('Add provider')).click()`);
await sleep(450);
await ev(`(() => {
  const k = document.querySelector('.modal input[type=password]');
  k.value = 'sk-test-key'; k.dispatchEvent(new Event('input', { bubbles: true }));
  [...document.querySelectorAll('.modal .btn')].find(b => b.textContent.includes('Add provider')).click();
})()`);
await sleep(600);
console.log("  provider added    :", await ev(`__vf.store.get().providers.length`));

// 5. Agent wizard, all six steps
await goTo("#/agents/new");
await sleep(500);
console.log("  template picker   :", await ev(`!!document.querySelector('.tpl')`));
await shot("agent-templates");
await ev(`[...document.querySelectorAll('.tplcard')].find(c => c.textContent.includes('Customer Support')).click()`);
await sleep(600);
console.log("  wizard step 1     :", await ev(`document.querySelector('.stepper__i.is-on .stepper__l')?.textContent`));
await shot("agent-wizard-identity");
for (let i = 0; i < 5; i++) {
  await ev(`[...document.querySelectorAll('.wizard__foot .btn')].find(b => b.textContent.startsWith('Next')).click()`);
  await sleep(520);
  if (i === 0) await shot("agent-wizard-persona");
}
console.log("  wizard step 6     :", await ev(`document.querySelector('.stepper__i.is-on .stepper__l')?.textContent`));
await shot("agent-wizard-test");
await ev(`(() => {
  const box = document.querySelector('.chat input');
  box.value = 'Do you ship to Pune?';
  box.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
})()`);
await sleep(1200);
console.log("  test chat replied :", await ev(`document.querySelectorAll('.chat__log .bubble').length`), "bubbles");
await ev(`[...document.querySelectorAll('.wizard__foot .btn')].find(b => b.textContent.includes('Save agent')).click()`);
await sleep(800);
console.log("  agent saved       :", await ev(`__vf.store.get().agents.length`), "agents");
await shot("agents-list");

// 6. Users + Plans
await goTo("#/users");
await ev(`[...document.querySelectorAll('.btn')].find(b => b.textContent.includes('Invite member')).click()`);
await sleep(420);
await ev(`(() => {
  const i = document.querySelectorAll('.modal input');
  const set = (el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); };
  set(i[0], 'Ravi Menon'); set(i[1], 'ravi@pixoramagroup.com');
  [...document.querySelectorAll('.modal .btn')].find(b => b.textContent.includes('Send invite')).click();
})()`);
await sleep(600);
console.log("  user invited      :", await ev(`__vf.store.get().users.length`), "users");

await goTo("#/plans");
await ev(`[...document.querySelectorAll('.plan .btn')][1].click()`);
await sleep(600);
console.log("  plan assigned     :", await ev(`__vf.store.get().activePlan`));
await shot("plans");

// 7. Branding changes the accent live
await goTo("#/settings");
await ev(`[...document.querySelectorAll('.tabs button')].find(b => b.textContent.includes('Branding')).click()`);
await sleep(500);
await ev(`document.querySelectorAll('.swatch')[3].click()`);
await sleep(600);
const accent = await ev(`getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()`);
console.log("  accent live       :", accent);
await shot("settings-branding");
await ev(`document.querySelectorAll('.swatch')[0].click()`);
await sleep(400);

// 8. Persistence across reload
await send("Page.navigate", { url: BASE + "?theme=light" });
await sleep(2400);
console.log("  survives reload   :", await ev(`__vf.store.get().agents.length`), "agents,",
  await ev(`__vf.store.derive.liveChannels().length`), "channels");

// 9. Dark + mobile
await goTo("#/");
await ev(`document.documentElement.dataset.theme = 'dark'`);
await sleep(500);
await shot("dashboard-dark", "dark");
await goTo("#/knowledge"); await shot("knowledge-dark");
await goTo("#/channels"); await shot("channels-dark");
await ev(`document.documentElement.dataset.theme = 'light'`);

/* Stale-state boot. Every earlier run started with ?reset=1, so a browser
   holding state older than the current seed was never exercised — that gap let
   a crash on #/knowledge reach the user. Strip newer keys, then walk the routes. */
console.log("\n=== stale persisted state ===");
await ev(`(() => {
  const s = JSON.parse(localStorage.getItem("voiceforge.v1"));
  delete s.connections; delete s.composio; delete s.models;
  delete s.workspace.officialMark; delete s.workspace.accent;
  localStorage.setItem("voiceforge.v1", JSON.stringify(s));
})()`);
await send("Page.navigate", { url: BASE + "?theme=light" });
await sleep(2600);
const broken = [];
for (const [hash, name] of ROUTES) {
  await goTo(hash);
  const ok = await ev(`!document.querySelector('.canvas').textContent.includes('failed to render')`);
  if (!ok) broken.push(`${name}: ${await ev(`document.querySelector('.empty__d')?.textContent`)}`);
}
console.log(broken.length
  ? "  BROKEN -> " + broken.join(" | ")
  : "  every route survives state older than the seed");
console.log("  keys healed :", await ev(`(() => {
  const s = JSON.parse(localStorage.getItem("voiceforge.v1"));
  return ["connections", "composio", "models"].filter((k) => k in s).join(", ");
})()`));

console.log("\n=== responsive ===");
for (const [hash, name] of ROUTES) {
  await goTo(hash);
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await sleep(420);
  const ovf = await ev(`document.documentElement.scrollWidth > document.documentElement.clientWidth
    ? document.documentElement.scrollWidth : 0`);
  if (ovf) console.log(`  ${name}: OVERFLOW ${ovf}px`);
  await send("Emulation.clearDeviceMetricsOverride");
}
console.log("  (no lines above means every route fits 390px)");

console.log("\n=== errors:", errors.length ? "\n" + [...new Set(errors)].join("\n") : "none");
ws.close(); chrome.kill(); process.exit(0);
