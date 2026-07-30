import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
const CHROME="C:/Program Files/Google/Chrome/Application/chrome.exe", PORT=9350;
const chrome=spawn(CHROME,["--headless=new","--disable-gpu","--hide-scrollbars",`--remote-debugging-port=${PORT}`,"--user-data-dir=C:/Users/udesh/AppData/Local/Temp/claude/cdp-k","--window-size=1440,1000","about:blank"],{stdio:"ignore"});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let u; for(let i=0;i<40;i++){try{const l=await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();const p=l.find(t=>t.type==="page");if(p){u=p.webSocketDebuggerUrl;break}}catch{} await sleep(250);}
const ws=new WebSocket(u); await new Promise(r=>ws.onopen=r);
let id=0; const pend=new Map(); const errs=[];
ws.onmessage=e=>{const m=JSON.parse(e.data);
  if(m.id&&pend.has(m.id)){pend.get(m.id)(m.result);pend.delete(m.id);}
  if(m.method==="Runtime.exceptionThrown")errs.push("EXC: "+(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text));
  if(m.method==="Log.entryAdded"&&m.params.entry.level==="error"&&!/favicon/.test(m.params.entry.text))errs.push("LOG: "+m.params.entry.text);};
const send=(method,params={})=>new Promise(res=>{const i=++id;pend.set(i,res);ws.send(JSON.stringify({id:i,method,params}))});
const ev=async x=>(await send("Runtime.evaluate",{expression:x,returnByValue:true,awaitPromise:true})).result?.value;
async function full(name,theme){
  await send("Page.navigate",{url:`http://127.0.0.1:4780/knowledge.html?theme=${theme}`});
  await sleep(3800);
  const {cssContentSize}=await send("Page.getLayoutMetrics");
  const h=Math.ceil(cssContentSize.height);
  await send("Emulation.setDeviceMetricsOverride",{width:1440,height:h,deviceScaleFactor:1,mobile:false});
  await sleep(300);
  const {data}=await send("Page.captureScreenshot",{format:"png"});
  writeFileSync(`shots/${name}.png`,Buffer.from(data,"base64"));
  await send("Emulation.clearDeviceMetricsOverride");
  console.log(`  ${name}.png 1440x${h}`);
}
await send("Runtime.enable"); await send("Log.enable"); await send("Page.enable");
await full("knowledge-light","light");
console.log("  counter    :", await ev(`document.querySelector('[data-count]').textContent`));
console.log("  segs grown :", await ev(`[...document.querySelectorAll('.corpus__seg')].filter(e=>getComputedStyle(e).transform.startsWith('matrix(1,')).length+' / '+document.querySelectorAll('.corpus__seg').length`));
console.log("  share bars :", await ev(`[...document.querySelectorAll('.src__fill')].filter(e=>!getComputedStyle(e).transform.includes('matrix(0,')).length+' / '+document.querySelectorAll('.src__fill').length`));
console.log("  flagged CTA:", await ev(`getComputedStyle(document.querySelector('.is-flagged .src__acts')).opacity`));
console.log("  accent num :", await ev(`getComputedStyle(document.querySelector('.kstatement em')).color`));
await full("knowledge-dark","dark");
await send("Emulation.setEmulatedMedia",{features:[{name:"prefers-reduced-motion",value:"reduce"}]});
await send("Page.navigate",{url:"http://127.0.0.1:4780/knowledge.html?theme=light"}); await sleep(2200);
console.log("  reduced ctr:", await ev(`document.querySelector('[data-count]').textContent`));
console.log("  reduced seg:", await ev(`[...document.querySelectorAll('.corpus__seg')].filter(e=>getComputedStyle(e).transform.startsWith('matrix(1,')).length+' / 3'`));
await send("Emulation.setEmulatedMedia",{features:[]});
await send("Page.navigate",{url:"http://127.0.0.1:4780/knowledge.html?theme=light"}); await sleep(2200);
await send("Emulation.setDeviceMetricsOverride",{width:390,height:844,deviceScaleFactor:2,mobile:true}); await sleep(700);
console.log("  mobile ovf :", await ev(`document.documentElement.scrollWidth>document.documentElement.clientWidth?'YES '+document.documentElement.scrollWidth:'none'`));
const {data}=await send("Page.captureScreenshot",{format:"png",captureBeyondViewport:true});
writeFileSync("shots/knowledge-mobile.png",Buffer.from(data,"base64"));
console.log("\nerrors:", errs.length?errs.join("\n"):"none");
ws.close(); chrome.kill(); process.exit(0);
