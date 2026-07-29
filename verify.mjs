/* Headless verification over CDP: console errors, state switching, full-page shots. */
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9333;
const URL = "http://127.0.0.1:4780/index.html";

const chrome = spawn(CHROME, [
  "--headless=new", "--disable-gpu", "--hide-scrollbars",
  `--remote-debugging-port=${PORT}`,
  "--user-data-dir=C:/Users/udesh/AppData/Local/Temp/claude/cdp-profile",
  "--window-size=1440,1000", "about:blank",
], { stdio: "ignore" });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function target() {
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const list = await r.json();
      const page = list.find((t) => t.type === "page");
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(250);
  }
  throw new Error("no CDP target");
}

const ws = new WebSocket(await target());
await new Promise((r) => (ws.onopen = r));

let id = 0;
const pending = new Map();
const errors = [];

ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); }
  if (m.method === "Runtime.exceptionThrown") {
    errors.push("EXCEPTION: " + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));
  }
  if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") {
    errors.push("CONSOLE: " + m.params.args.map((a) => a.value ?? a.description).join(" "));
  }
  if (m.method === "Log.entryAdded" && m.params.entry.level === "error") {
    errors.push("LOG: " + m.params.entry.text + " " + (m.params.entry.url || ""));
  }
};

const send = (method, params = {}) =>
  new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });

const evaluate = async (expr) =>
  (await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true })).result?.value;

async function fullShot(name) {
  const { cssContentSize } = await send("Page.getLayoutMetrics");
  const h = Math.ceil(cssContentSize.height);
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1440, height: h, deviceScaleFactor: 1, mobile: false,
  });
  await sleep(250);
  const { data } = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(`shots/${name}.png`, Buffer.from(data, "base64"));
  await send("Emulation.clearDeviceMetricsOverride");
  console.log(`  shot ${name}.png  (${1440}x${h})`);
}

await send("Runtime.enable");
await send("Log.enable");
await send("Page.enable");

console.log("\n1. Load launch state");
await send("Page.navigate", { url: `${URL}?theme=light&view=launch` });
await sleep(3500);
console.log("   hero headline:", await evaluate(`document.querySelector('#hero-title').textContent.trim().slice(0,42)`));
console.log("   rail filled  :", await evaluate(`[...document.querySelectorAll(".rail__fill[data-on='1']")].map(e=>getComputedStyle(e).transform.includes('matrix(1,')).join()`));
console.log("   steps visible:", await evaluate(`[...document.querySelectorAll('.step')].filter(e=>getComputedStyle(e).opacity==='1').length + ' / ' + document.querySelectorAll('.step').length`));
await fullShot("launch-light-full");

console.log("\n2. Click switcher -> operating");
await evaluate(`document.querySelector('[data-go="live"]').click()`);
await sleep(3500);
console.log("   live shown   :", await evaluate(`document.querySelector('[data-view="live"]').classList.contains('is-shown')`));
console.log("   launch hidden:", await evaluate(`!document.querySelector('[data-view="launch"]').classList.contains('is-shown')`));
console.log("   KPI counted  :", await evaluate(`document.querySelector('.kpi__big').textContent`));
console.log("   rank bars    :", await evaluate(`[...document.querySelectorAll('.rank__fill')].filter(e=>!getComputedStyle(e).transform.includes('matrix(0,')).length + ' / ' + document.querySelectorAll('.rank__fill').length`));
console.log("   heat cells   :", await evaluate(`document.querySelectorAll('.heat__c').length`));
console.log("   chart paths  :", await evaluate(`document.querySelectorAll('#area path').length`));
await fullShot("live-light-full");

console.log("\n3. Switch back to launch (context revert)");
await evaluate(`document.querySelector('[data-go="launch"]').click()`);
await sleep(2500);
console.log("   headline opacity:", await evaluate(`getComputedStyle(document.querySelector('#hero-title')).opacity`));
console.log("   rail still full :", await evaluate(`getComputedStyle(document.querySelector(".rail__fill[data-on='1']")).transform`));

console.log("\n4. Reduced motion");
await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
await send("Page.navigate", { url: `${URL}?theme=light&view=live` });
await sleep(2500);
console.log("   KPI final    :", await evaluate(`document.querySelector('.kpi__big').textContent`));
console.log("   bars final   :", await evaluate(`[...document.querySelectorAll('.rank__fill')].filter(e=>!getComputedStyle(e).transform.includes('matrix(0,')).length + ' / ' + document.querySelectorAll('.rank__fill').length`));
console.log("   heat visible :", await evaluate(`getComputedStyle(document.querySelector('.heat__c')).transform`));

console.log("\n5. Mobile 390px");
await send("Emulation.setEmulatedMedia", { features: [] });
await send("Page.navigate", { url: `${URL}?theme=light&view=launch` });
await sleep(2500);
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await sleep(600);
console.log("   h-overflow   :", await evaluate(`document.documentElement.scrollWidth > document.documentElement.clientWidth ? 'YES ('+document.documentElement.scrollWidth+'px)' : 'none'`));
const { data } = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
writeFileSync("shots/launch-mobile.png", Buffer.from(data, "base64"));

console.log("\n=== console/page errors:", errors.length ? "\n" + errors.join("\n") : "none");
ws.close();
chrome.kill();
process.exit(0);
