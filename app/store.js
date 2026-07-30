/* =========================================================================
   Store — the single source of truth for the whole app.
   Persists to localStorage, notifies subscribers, and derives the numbers
   every screen reads. No screen holds its own copy of anything.
   ========================================================================= */

const KEY = "voiceforge.v1";
const listeners = new Set();

const uid = () => Math.random().toString(36).slice(2, 10);
const now = () => Date.now();

/* --- Static catalogues (not user state) --------------------------------- */

/* brand: a simple-icons slug rendered as #b-<slug>.
   fb: a Lucide fallback for brands simple-icons no longer carries (Microsoft,
   Slack and Twilio all had their marks removed at their own request). We show a
   functional glyph in the brand colour rather than redrawing someone's logo. */
export const CHANNEL_TYPES = [
  { id: "website",   name: "Website",         group: "instant", fb: "globe",  colour: "#0EA5A5", req: "Embeddable widget, no account needed", setup: "2 minutes" },
  { id: "whatsapp",  name: "WhatsApp",        group: "one",  brand: "whatsapp",  colour: "#25D366", req: "Meta Embedded Signup" },
  { id: "messenger", name: "Messenger",       group: "one",  brand: "messenger", colour: "#0866FF", req: "Facebook Login" },
  { id: "instagram", name: "Instagram",       group: "one",  brand: "instagram", colour: "#FF0069", req: "Facebook Login" },
  { id: "gmail",     name: "Gmail",           group: "one",  brand: "gmail",     colour: "#EA4335", req: "Google OAuth" },
  { id: "outlook",   name: "Outlook",         group: "one",  fb: "mail",         colour: "#0F6CBD", req: "Microsoft OAuth" },
  { id: "telegram",  name: "Telegram",        group: "byo",  brand: "telegram",  colour: "#26A5E4", req: "Bot token from @BotFather" },
  { id: "line",      name: "LINE",            group: "byo",  brand: "line",      colour: "#00C300", req: "Channel secret + access token" },
  { id: "discord",   name: "Discord",         group: "byo",  brand: "discord",   colour: "#5865F2", req: "Bot token + application ID" },
  { id: "teams",     name: "Microsoft Teams", group: "byo",  fb: "users",        colour: "#5059C9", req: "App ID + password" },
  { id: "slack",     name: "Slack",           group: "byo",  fb: "hash",         colour: "#611F69", req: "Bot token + signing secret" },
  { id: "wechat",    name: "WeChat",          group: "byo",  brand: "wechat",    colour: "#07C160", req: "App ID + app secret" },
  { id: "phone",     name: "Phone",           group: "num",  fb: "phone",        colour: "#0A84FF", req: "Twilio account + number" },
];

export const CHANNEL_GROUPS = [
  { id: "one", title: "One click",            desc: "Sign in and it is connected. No tokens to copy, nothing to host." },
  { id: "byo", title: "Bring a token",        desc: "Create a bot on their side, paste the token here. About five minutes each." },
  { id: "num", title: "Needs a phone number", desc: "A telephony account and a provisioned number before the agent can take calls." },
];

export const PROVIDER_KINDS = [
  { id: "stt",   name: "Speech to Text", blurb: "Turns caller audio into text",      options: ["Deepgram", "OpenAI Whisper"] },
  { id: "tts",   name: "Text to Speech", blurb: "Gives the agent its voice",         options: ["ElevenLabs", "OpenAI TTS", "NVIDIA Riva"] },
  { id: "llm",   name: "Language Model", blurb: "Does the reasoning and tool calls", options: ["Claude Opus 5", "Claude Sonnet 5", "GPT-4o", "NVIDIA NIM"] },
  { id: "embed", name: "Embeddings",     blurb: "Indexes and retrieves knowledge",   options: ["text-embedding-3-large", "Cohere embed-v3", "Voyage 3"] },
];

/* Composio hosts roughly a thousand tool servers. What follows is the popular
   subset we render locally; a real search queries the full catalogue server-side.
   Claiming MCP_CATALOG.length as the total would understate it by 40x. */
export const MCP_TOTAL = 1000;

export const MCP_CATALOG = [
  { name: "GitHub",         cat: "developer tools",       desc: "Repositories, issues, pull requests and actions.", colour: "#181717", brand: "github", mark: "GH" },
  { name: "Linear",         cat: "project management",    desc: "Issues, cycles and project tracking for software teams.", colour: "#5E6AD2", brand: "linear", mark: "LI" },
  { name: "Notion",         cat: "documents",             desc: "Pages, databases and wiki content.", colour: "#111", brand: "notion", mark: "NO" },
  { name: "Slack",          cat: "communication",         desc: "Post messages, read channels and search history.", colour: "#611f69", fb: "hash", mark: "SL" },
  { name: "Jira",           cat: "project management",    desc: "Issue tracking and agile boards.", colour: "#0052CC", brand: "jira", mark: "JI" },
  { name: "Salesforce",     cat: "CRM",                   desc: "Accounts, opportunities and contact records.", colour: "#00A1E0", fb: "cloud", mark: "SF" },
  { name: "HubSpot",        cat: "CRM",                   desc: "Contacts, deals and marketing automation.", colour: "#FF7A59", brand: "hubspot", mark: "HS" },
  { name: "Stripe",         cat: "payments",              desc: "Customers, charges, subscriptions and invoices.", colour: "#635BFF", brand: "stripe", mark: "ST" },
  { name: "Zendesk",        cat: "support",               desc: "Tickets, users and help centre articles.", colour: "#03363D", brand: "zendesk", mark: "ZD" },
  { name: "Airtable",       cat: "databases",             desc: "Bases, tables and records.", colour: "#18BFFF", brand: "airtable", mark: "AT" },
  { name: "Google Drive",   cat: "documents",             desc: "Files, folders and shared drives.", colour: "#1FA463", brand: "googledrive", mark: "GD" },
  { name: "Gmail",          cat: "email",                 desc: "Read, search, draft and send mail.", colour: "#EA4335", brand: "gmail", mark: "GM" },
  { name: "Asana",          cat: "project management",    desc: "Tasks, projects and portfolios.", colour: "#F06A6A", brand: "asana", mark: "AS" },
  { name: "Intercom",       cat: "support",               desc: "Conversations, contacts and help articles.", colour: "#1F8DED", brand: "intercom", mark: "IC" },
  { name: "Calendly",       cat: "scheduling",            desc: "Event types, invitees and availability.", colour: "#006BFF", brand: "calendly", mark: "CA" },
  { name: "Twilio",         cat: "communication",         desc: "SMS, voice and phone number management.", colour: "#F22F46", fb: "phone", mark: "TW" },
  { name: "Shopify",        cat: "commerce",              desc: "Products, orders, customers and inventory.", colour: "#96BF48", brand: "shopify", mark: "SH" },
  { name: "1Password",      cat: "security & identity",   desc: "Password manager and digital vault for secure credential storage.", colour: "#0572EC", brand: "1password", mark: "1P" },
  { name: "AbuseIPDB",      cat: "security & identity",   desc: "Central repository for reporting and checking abusive IPs.", colour: "#C8262A", fb: "warn", mark: "AB" },
  { name: "ActiveCampaign", cat: "marketing automation",  desc: "Marketing automation and CRM for email campaigns.", colour: "#356AE6", fb: "msg", mark: "AC" },
  { name: "Ably",           cat: "developer tools",       desc: "Realtime messaging platform for live features.", colour: "#FF5416", fb: "activity", mark: "AY" },
  { name: "2chat",          cat: "communication",         desc: "Programmable API for WhatsApp and other text channels.", colour: "#1D4ED8", fb: "msg", mark: "2C" },
  { name: "Abstract",       cat: "developer tools",       desc: "APIs for validation, enrichment and data tasks.", colour: "#111827", brand: "abstract", mark: "AB" },
  { name: "21risk",         cat: "business intelligence", desc: "Checklists, audits and compliance workflows.", colour: "#16A34A", fb: "check", mark: "21" },
];

export const CONNECTORS = [
  { id: "gdrive",     name: "Google Drive", brand: "googledrive", colour: "#4285F4" },
  { id: "onedrive",   name: "OneDrive",     fb: "cloud",  colour: "#0F6CBD" },
  { id: "sharepoint", name: "SharePoint",   fb: "file",   colour: "#036C70" },
  { id: "notion",     name: "Notion",       brand: "notion",     colour: "#000000" },
  { id: "confluence", name: "Confluence",   fb: "book",   colour: "#172B4D" },
  { id: "dropbox",    name: "Dropbox",      fb: "cloud",  colour: "#0061FF" },
  { id: "slack",      name: "Slack",        fb: "hash",   colour: "#611F69" },
  { id: "gmail",      name: "Gmail",        brand: "gmail",      colour: "#EA4335" },
  { id: "airtable",   name: "Airtable",     brand: "airtable",   colour: "#18BFFF" },
  { id: "zendesk",    name: "Zendesk",      brand: "zendesk",    colour: "#03363D" },
];

export const TEMPLATES = [
  { id: "support",   name: "Customer Support", desc: "Answers questions from your knowledge base and escalates when it cannot help.", tone: "Friendly",     len: "Balanced" },
  { id: "lead",      name: "Lead Qualifier",   desc: "Asks qualifying questions, captures contact details and books a follow up.",   tone: "Professional", len: "Short" },
  { id: "booking",   name: "Booking Assistant",desc: "Checks availability, schedules appointments and sends confirmations.",         tone: "Friendly",     len: "Short" },
  { id: "faq",       name: "FAQ Bot",          desc: "Short factual answers grounded strictly in the documents you attach.",         tone: "Casual",       len: "Short" },
  { id: "onboard",   name: "Onboarding Coach", desc: "Walks a new customer through setup one step at a time.",                       tone: "Friendly",     len: "Detailed" },
  { id: "helpdesk",  name: "Internal Helpdesk",desc: "Answers staff questions about policy, tooling and process.",                    tone: "Professional", len: "Balanced" },
  { id: "outreach",  name: "Sales Outreach",   desc: "Opens conversations, handles objections and hands off to a human.",             tone: "Professional", len: "Balanced" },
  { id: "order",     name: "Order Status",     desc: "Looks up orders through a connected tool and reports status.",                  tone: "Casual",       len: "Short" },
];

export const TONES = [
  { id: "Casual",       desc: "Conversational, like texting a friend" },
  { id: "Friendly",     desc: "Warm and approachable" },
  { id: "Professional", desc: "Direct and polished" },
  { id: "Formal",       desc: "Precise and respectful" },
];

export const LENGTHS = [
  { id: "Short",    desc: "One or two sentences" },
  { id: "Balanced", desc: "A short paragraph" },
  { id: "Detailed", desc: "Full explanations with steps" },
];

export const WIZARD_STEPS = ["Identity", "Persona", "Knowledge", "Abilities", "Engagement", "Test"];

/* --- Seed --------------------------------------------------------------- */

function seed() {
  return {
    workspace: { name: "Pixorama", accent: "#7c3aed", logo: "PX", officialMark: true, tier: "enterprise" },
    models: { llm: "Claude Opus 5", embed: "text-embedding-3-large", stt: "Deepgram", tts: "ElevenLabs" },
    composio: { mcpKey: "", platformKey: "", url: "https://connect.composio.dev/mcp" },

    agents: [
      { id: "a-master", name: "Master Agent", master: true, status: "active", tone: "Friendly", len: "Balanced",
        mode: "Hybrid", lang: "English (US)", desc: "Front door for every channel. Routes to specialists when needed.",
        prompt: "You are a friendly customer support assistant.\n\nGoals\n- Resolve the user's issue using the provided knowledge base.\n- Ask clarifying questions before guessing.\n- If you cannot help, offer to escalate to a human and collect their email.\n\nStyle\n- Empathetic, concise, never blame the user.\n- Use bullet points for multi-step instructions.",
        knowledge: ["k-wiki", "k-prop"], tools: [], created: now() - 86400e3 * 12 },
      { id: "a-faq", name: "FAQ Bot", master: false, status: "active", tone: "Casual", len: "Short",
        mode: "Text", lang: "English (US)", desc: "Short factual answers grounded strictly in attached documents.",
        prompt: "Answer only from the attached knowledge. If the answer is not there, say so plainly.",
        knowledge: ["k-wiki"], tools: [], created: now() - 86400e3 * 5 },
    ],

    knowledge: [
      { id: "k-wiki", name: "India_Wiki",  type: "web", url: "https://en.wikipedia.org/wiki/India", pages: 25, chunks: 310, status: "ready", synced: now() - 7200e3 },
      { id: "k-prop", name: "PROP EQUITY", type: "web", url: "https://www.propequity.in/",          pages: 65, chunks: 152, status: "ready", synced: now() - 7200e3 },
    ],

    channels: [],           // { id, type, agentId, status, created }
    mcpServers: [],         // { id, name, status, tools }
    providers: [],          // { id, kind, name, key, created }

    users: [
      { id: "u-1", name: "Udesh",       email: "pixo.rama.official@gmail.com", role: "Admin",  tier: "enterprise", active: true },
      { id: "u-2", name: "Priya Nair",  email: "priya@pixoramagroup.com",      role: "Member", tier: "pro",        active: true },
      { id: "u-3", name: "Sam Okafor",  email: "sam@pixoramagroup.com",        role: "Member", tier: "free",       active: false },
    ],

    plans: [
      { id: "p-free", name: "Free",       price: 0,   agents: 1,  channels: 1,  mcp: 1,  storageMb: 50,   chats: 200 },
      { id: "p-pro",  name: "Pro",        price: 79,  agents: 10, channels: 5,  mcp: 10, storageMb: 2000, chats: 10000 },
      { id: "p-ent",  name: "Enterprise", price: 499, agents: 0,  channels: 0,  mcp: 0,  storageMb: 0,    chats: 0 },
    ],
    activePlan: null,

    connections: [],   // connector ids the user has granted OAuth to
    conversations: [],
    notifications: [
      { id: "n-1", text: "India_Wiki finished indexing. 310 chunks.", when: now() - 7100e3, read: false },
      { id: "n-2", text: "PROP EQUITY finished indexing. 152 chunks.", when: now() - 7000e3, read: false },
      { id: "n-3", text: "No plan assigned, so quotas are not being enforced.", when: now() - 3600e3, read: false },
    ],
  };
}

/* --- Persistence -------------------------------------------------------- */

let state;
try {
  const raw = localStorage.getItem(KEY);
  state = raw ? JSON.parse(raw) : seed();
} catch { state = seed(); }

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
}

export function get() { return state; }

export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }

export function update(fn) {
  fn(state);
  persist();
  listeners.forEach((l) => l(state));
}

export function reset() {
  state = seed();
  persist();
  listeners.forEach((l) => l(state));
}

/* --- Derived readings --------------------------------------------------- */

export const derive = {
  chunks: () => state.knowledge.reduce((a, k) => a + k.chunks, 0),

  /** Which agents can actually cite a given source. A source no agent cites is
      indexed storage nobody can reach — the page used to hardcode this. */
  agentsFor: (sourceId) => state.agents.filter((a) => a.knowledge.includes(sourceId)),
  orphanSources: () => state.knowledge.filter((k) => derive.agentsFor(k.id).length === 0),
  pages:  () => state.knowledge.reduce((a, k) => a + k.pages, 0),
  liveChannels: () => state.channels.filter((c) => c.status === "active"),
  hasTraffic:   () => state.conversations.length > 0,

  /** The five setup steps the dashboard reads. Order matters. */
  setup() {
    const k = state.knowledge;
    return [
      { key: "agent",    name: "Master agent created",  done: state.agents.some((a) => a.master),
        meta: `${state.agents.length} agent${state.agents.length === 1 ? "" : "s"} · auto-provisioned at signup`, go: "#/agents", cta: "Open Studio" },
      { key: "provider", name: "Providers connected",   done: state.providers.length > 0,
        meta: state.providers.length ? `${state.providers.length} configured` : "No speech, voice or model credentials yet", go: "#/providers", cta: "Add provider" },
      { key: "sync",     name: "Sync your knowledge",   done: k.length > 0 && k.every((s) => s.status === "ready"),
        meta: k.length ? `${k.filter((s) => s.status === "ready").length} of ${k.length} sources indexed` : "No sources yet", go: "#/knowledge", cta: "Add source" },
      { key: "channel",  name: "Deploy a channel",      done: derive.liveChannels().length > 0,
        meta: derive.liveChannels().length ? `${derive.liveChannels().length} live` : "Phone, web widget, or 11 messaging apps", go: "#/channels", cta: "Choose" },
      { key: "plan",     name: "Assign a plan",         done: !!state.activePlan,
        meta: state.activePlan ? `${state.plans.find((p) => p.id === state.activePlan)?.name} active` : "No plan assigned · quotas not yet enforced", go: "#/plans", cta: "Assign" },
    ];
  },

  progress() {
    const s = derive.setup();
    return { done: s.filter((x) => x.done).length, total: s.length };
  },

  usage() {
    const convos = state.conversations;
    const calls = convos.filter((c) => c.channel === "phone").length;
    return {
      conversations: convos.length,
      calls,
      users: new Set(convos.map((c) => c.contact)).size,
      cost: +(convos.length * 0.102).toFixed(2),
      tokens: convos.length * 1840,
    };
  },
};

/* --- Actions ------------------------------------------------------------ */

export const actions = {
  addKnowledge(name, url, kind = "web") {
    const id = "k-" + uid();
    update((s) => {
      s.knowledge.push({ id, name, url, type: kind, pages: 0, chunks: 0, status: "processing", synced: null });
    });
    // Simulate the ingestion pipeline writing progress back.
    const pages = 8 + Math.floor(Math.random() * 50);
    setTimeout(() => update((s) => {
      const k = s.knowledge.find((x) => x.id === id);
      if (!k) return;
      k.pages = pages;
      k.chunks = Math.round(pages * (3 + Math.random() * 9));
      k.status = "ready";
      k.synced = now();
      s.notifications.unshift({ id: "n-" + uid(), text: `${name} finished indexing. ${k.chunks} chunks.`, when: now(), read: false });
    }), 2600);
    return id;
  },

  resync(id) {
    update((s) => { const k = s.knowledge.find((x) => x.id === id); if (k) k.status = "processing"; });
    setTimeout(() => update((s) => {
      const k = s.knowledge.find((x) => x.id === id);
      if (k) { k.status = "ready"; k.synced = now(); }
    }), 1800);
  },

  toggleConnector(id) {
    update((s) => {
      s.connections = s.connections.includes(id)
        ? s.connections.filter((c) => c !== id)
        : [...s.connections, id];
    });
  },

  attachSource(agentId, sourceId) {
    update((s) => {
      const a = s.agents.find((x) => x.id === agentId);
      if (!a) return;
      a.knowledge = a.knowledge.includes(sourceId)
        ? a.knowledge.filter((x) => x !== sourceId)
        : [...a.knowledge, sourceId];
    });
  },

  removeKnowledge(id) {
    update((s) => {
      s.knowledge = s.knowledge.filter((k) => k.id !== id);
      s.agents.forEach((a) => { a.knowledge = a.knowledge.filter((x) => x !== id); });
    });
  },

  connectChannel(type) {
    const id = "c-" + uid();
    update((s) => {
      s.channels.push({ id, type, agentId: s.agents.find((a) => a.master)?.id, status: "active", created: now() });
      s.notifications.unshift({ id: "n-" + uid(), text: `${CHANNEL_TYPES.find((t) => t.id === type).name} channel deployed`, when: now(), read: false });
      seedTraffic(s, type);
    });
    return id;
  },

  removeChannel(id) { update((s) => { s.channels = s.channels.filter((c) => c.id !== id); }); },

  saveAgent(agent) {
    update((s) => {
      const i = s.agents.findIndex((a) => a.id === agent.id);
      if (i >= 0) s.agents[i] = agent;
      else s.agents.push({ ...agent, id: "a-" + uid(), created: now() });
    });
  },

  removeAgent(id) { update((s) => { s.agents = s.agents.filter((a) => a.id !== id || a.master); }); },

  connectMcp(name) {
    update((s) => {
      if (s.mcpServers.some((m) => m.name === name)) return;
      s.mcpServers.push({ id: "m-" + uid(), name, status: "active", tools: 3 + Math.floor(Math.random() * 22) });
    });
  },
  removeMcp(id) { update((s) => { s.mcpServers = s.mcpServers.filter((m) => m.id !== id); }); },

  addProvider(kind, name) {
    update((s) => {
      s.providers.push({ id: "p-" + uid(), kind, name, created: now() });
      const slot = { stt: "stt", tts: "tts", llm: "llm", embed: "embed" }[kind];
      if (slot) s.models[slot] = name;
    });
  },
  removeProvider(id) { update((s) => { s.providers = s.providers.filter((p) => p.id !== id); }); },

  inviteUser(name, email, role) {
    update((s) => s.users.push({ id: "u-" + uid(), name, email, role, tier: role === "Admin" ? "enterprise" : "free", active: true }));
  },
  toggleUser(id) { update((s) => { const u = s.users.find((x) => x.id === id); if (u) u.active = !u.active; }); },
  removeUser(id) { update((s) => { s.users = s.users.filter((u) => u.id !== id); }); },

  assignPlan(id) {
    update((s) => {
      s.activePlan = id;
      s.notifications.unshift({ id: "n-" + uid(), text: `Plan changed to ${s.plans.find((p) => p.id === id).name}`, when: now(), read: false });
    });
  },

  setBranding(patch) {
    update((s) => {
      // Setting your own initials means you are white-labelling; drop the PXO mark.
      if (patch.logo !== undefined) patch.officialMark = false;
      Object.assign(s.workspace, patch);
    });
  },
  setModel(slot, value) { update((s) => { s.models[slot] = value; }); },
  setComposio(patch) { update((s) => Object.assign(s.composio, patch)); },

  readNotifications() { update((s) => s.notifications.forEach((n) => { n.read = true; })); },

  reply(convoId, text) {
    update((s) => {
      const c = s.conversations.find((x) => x.id === convoId);
      if (c) c.messages.push({ from: "agent", text, at: now() });
    });
  },
};

/* --- Simulated inbound traffic, so the product has something to show ----- */

const SAMPLES = [
  ["Do you ship to Pune?", "We deliver across Maharashtra, including Pune. Standard delivery is two to three working days."],
  ["What are your opening hours?", "We are open weekdays 9am to 6pm IST, and Saturdays until 1pm."],
  ["My order hasn't arrived", "Sorry about that. If you share the order number I can check its status right away."],
  ["Can I speak to a person?", "Of course. I can pass you to the team now, or take your email and have someone call back."],
  ["How much is the annual plan?", "The annual plan works out at two months free versus paying monthly. I can send the exact figure for your seat count."],
  ["Is there an API?", "Yes. There is a REST API plus webhooks for every event. I can send the docs link."],
];
const NAMES = ["Aarav S.", "Meera K.", "Daniel R.", "Fatima A.", "Jonas W.", "Ling C.", "Tom B.", "Ines M."];

function seedTraffic(s, type) {
  const n = 6 + Math.floor(Math.random() * 7);
  for (let i = 0; i < n; i++) {
    const [q, a] = SAMPLES[Math.floor(Math.random() * SAMPLES.length)];
    const who = NAMES[Math.floor(Math.random() * NAMES.length)];
    s.conversations.unshift({
      id: "cv-" + uid(),
      channel: type,
      contact: who,
      at: now() - Math.floor(Math.random() * 86400e3 * 6),
      messages: [
        { from: "user", text: q, at: now() - 60000 },
        { from: "agent", text: a, at: now() - 45000 },
      ],
    });
  }
  s.conversations.sort((a, b) => b.at - a.at);
}
