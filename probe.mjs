/* Finds elements that overflow a narrow viewport. Usage: node probe.mjs [launch|live] */
import { spawn } from "node:child_process";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe", PORT = 9346;
const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--hide-scrollbars",
  `--remote-debugging-port=${PORT}`,
  "--user-data-dir=C:/Users/udesh/AppData/Local/Temp/claude/cdp-probe3", "about:blank"], { stdio: "ignore" });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let url;
for (let i = 0; i < 40; i++) {
  try {
    const l = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
    const p = l.find((t) => t.type === "page");
    if (p) { url = p.webSocketDebuggerUrl; break; }
  } catch {}
  await sleep(250);
}

const ws = new WebSocket(url);
await new Promise((r) => (ws.onopen = r));
let id = 0; const pend = new Map();
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); } };
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });

await send("Runtime.enable");
await send("Page.enable");
await send("Page.navigate", { url: "http://127.0.0.1:4780/index.html?theme=light&view=" + (process.argv[2] || "launch") });
await sleep(2500);
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await sleep(800);

const probe = () => {
  const vw = document.documentElement.clientWidth;
  const out = [];
  for (const e of document.querySelectorAll("body *")) {
    const r = e.getBoundingClientRect();
    if (r.right > vw + 1) {
      const cn = typeof e.className === "string" ? e.className : "svg";
      out.push(e.tagName.toLowerCase() + " [" + cn.slice(0, 38) + "] w=" + Math.round(r.width) + " right=" + Math.round(r.right));
    }
  }
  return "vw=" + vw + " scrollW=" + document.documentElement.scrollWidth + " :: " + out.slice(0, 18).join(" :: ");
};

const r = await send("Runtime.evaluate", { expression: "(" + probe.toString() + ")()", returnByValue: true });
console.log((r.result?.value || JSON.stringify(r).slice(0, 300)).split(" :: ").join("\n"));

ws.close(); chrome.kill(); process.exit(0);
