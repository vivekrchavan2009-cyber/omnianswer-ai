import { useState, useEffect, useCallback } from "react";

// ─── Storage helpers ───────────────────────────────────────────────────────────
const HISTORY_KEY = "omni_history_v2";
const KEYS_KEY    = "omni_api_keys";

async function storageGet(key) {
  try { const r = await window.storage.get(key); return r ? JSON.parse(r.value) : null; } catch { return null; }
}
async function storageSet(key, val) {
  try { await window.storage.set(key, JSON.stringify(val)); } catch {}
}
async function storageDel(key) {
  try { await window.storage.delete(key); } catch {}
}

// ─── Model definitions — ALL FREE, NO CREDIT CARD ────────────────────────────
const MODELS = [
  {
    id: "gemini_flash", name: "Gemini 2.0 Flash", company: "Google (FREE)",
    color: "#4285f4", accent: "#7baaf7", icon: "✦",
    keyLabel: "Google AI API Key", keyPlaceholder: "AIza...",
    keyLink: "https://aistudio.google.com/app/apikey",
    keyLinkLabel: "Get FREE key → aistudio.google.com",
    keyGroup: "google",
  },
  {
    id: "gemini_pro", name: "Gemini 1.5 Pro", company: "Google (FREE)",
    color: "#1a73e8", accent: "#4fc3f7", icon: "✧",
    keyLabel: "Google AI API Key", keyPlaceholder: "AIza...",
    keyLink: "https://aistudio.google.com/app/apikey",
    keyLinkLabel: "Get FREE key → aistudio.google.com",
    keyGroup: "google",
  },
  {
    id: "llama70b", name: "Llama 3.3 70B", company: "Meta via Groq (FREE)",
    color: "#0866ff", accent: "#6ea8fe", icon: "⬟",
    keyLabel: "Groq API Key", keyPlaceholder: "gsk_...",
    keyLink: "https://console.groq.com/keys",
    keyLinkLabel: "Get FREE key → console.groq.com",
    keyGroup: "groq",
  },
  {
    id: "llama8b", name: "Llama 3.1 8B", company: "Meta via Groq (FREE)",
    color: "#0052cc", accent: "#4d94ff", icon: "⬠",
    keyLabel: "Groq API Key", keyPlaceholder: "gsk_...",
    keyLink: "https://console.groq.com/keys",
    keyLinkLabel: "Get FREE key → console.groq.com",
    keyGroup: "groq",
  },
  {
    id: "deepseek", name: "DeepSeek R1", company: "DeepSeek via Groq (FREE)",
    color: "#7c3aed", accent: "#a78bfa", icon: "◉",
    keyLabel: "Groq API Key", keyPlaceholder: "gsk_...",
    keyLink: "https://console.groq.com/keys",
    keyLinkLabel: "Get FREE key → console.groq.com",
    keyGroup: "groq",
  },
  {
    id: "mixtral", name: "Mixtral 8x7B", company: "Mistral via Groq (FREE)",
    color: "#e07b54", accent: "#ff9f6a", icon: "⬡",
    keyLabel: "Groq API Key", keyPlaceholder: "gsk_...",
    keyLink: "https://console.groq.com/keys",
    keyLinkLabel: "Get FREE key → console.groq.com",
    keyGroup: "groq",
  },
  {
    id: "gemma", name: "Gemma 2 9B", company: "Google via Groq (FREE)",
    color: "#34a853", accent: "#6fcf97", icon: "◈",
    keyLabel: "Groq API Key", keyPlaceholder: "gsk_...",
    keyLink: "https://console.groq.com/keys",
    keyLinkLabel: "Get FREE key → console.groq.com",
    keyGroup: "groq",
  },
  {
    id: "qwen", name: "Qwen 2.5 72B", company: "Alibaba via Groq (FREE)",
    color: "#e8710a", accent: "#f4a460", icon: "◆",
    keyLabel: "Groq API Key", keyPlaceholder: "gsk_...",
    keyLink: "https://console.groq.com/keys",
    keyLinkLabel: "Get FREE key → console.groq.com",
    keyGroup: "groq",
  },
  {
    id: "mistral", name: "Mistral 7B", company: "Mistral via OpenRouter (FREE)",
    color: "#f59e0b", accent: "#fcd34d", icon: "◇",
    keyLabel: "OpenRouter API Key", keyPlaceholder: "sk-or-...",
    keyLink: "https://openrouter.ai/settings/keys",
    keyLinkLabel: "Get FREE key → openrouter.ai",
    keyGroup: "openrouter",
  },
  {
    id: "phi3", name: "Phi-3 Mini", company: "Microsoft via OpenRouter (FREE)",
    color: "#00b4d8", accent: "#90e0ef", icon: "⬢",
    keyLabel: "OpenRouter API Key", keyPlaceholder: "sk-or-...",
    keyLink: "https://openrouter.ai/settings/keys",
    keyLinkLabel: "Get FREE key → openrouter.ai",
    keyGroup: "openrouter",
  },
];

// Group models by key so settings panel shows them cleanly
const KEY_GROUPS = {
  google:     { label: "Google AI Key (FREE)",      placeholder: "AIza...",    link: "https://aistudio.google.com/app/apikey",   linkLabel: "aistudio.google.com → API Keys" },
  groq:       { label: "Groq API Key (FREE)",        placeholder: "gsk_...",    link: "https://console.groq.com/keys",            linkLabel: "console.groq.com → API Keys" },
  openrouter: { label: "OpenRouter API Key (FREE)", placeholder: "sk-or-...", link: "https://openrouter.ai/settings/keys",       linkLabel: "openrouter.ai → API Keys" },
};

const Q_TYPES = [
  { label: "📚 Book / Exam", value: "book",    prefix: "Answer this exam/book question:\n\n" },
  { label: "🔢 Math / Science", value: "math", prefix: "Solve this step by step:\n\n" },
  { label: "💻 Coding", value: "coding",       prefix: "Help with this coding question:\n\n" },
  { label: "🌍 General", value: "general",     prefix: "" },
  { label: "✍️ Essay", value: "essay",         prefix: "Help with this writing task:\n\n" },
];

const SYSTEM_PROMPTS = {
  gemini_flash: "You are Gemini 2.0 Flash by Google. Be analytical and fast. Explain the concept first, then answer directly. For math: step-by-step. If image attached, describe then answer. End with '💡 Explore further:' suggestion.",
  gemini_pro:   "You are Gemini 1.5 Pro by Google. Be thorough and multi-perspective. Deep analysis before answering. For math: show all working. If image attached, extract and answer all visible content. End with '🔍 Key Insight:' line.",
  llama70b:     "You are Llama 3.3 70B by Meta. Be concise and efficient. No fluff. For math: direct steps. If image attached, read and answer directly. End with bold 'Quick Summary:' in one sentence.",
  llama8b:      "You are Llama 3.1 8B by Meta. Be fast and to the point. Short clear answers. For math: show formula then solve. If image attached, extract key info and answer. End with bold 'TL;DR:' one liner.",
  deepseek:     "You are DeepSeek R1. You excel at deep reasoning and math. Think step by step. Show your full reasoning. For coding: clean well-commented code. If image attached, analyze carefully. End with bold 'Conclusion:' line.",
  mixtral:      "You are Mixtral 8x7B by Mistral. Be direct and practical. Bullet-point facts first then explain. For math: formula first then solve. If image attached, extract all visible text. End with bold 'Bottom Line:' summary.",
  gemma:        "You are Gemma 2 9B by Google. Be helpful and clear. Structure your answers well. For math: show working step by step. If image attached, read all text carefully. End with bold 'Key Point:' line.",
  qwen:         "You are Qwen 2.5 72B by Alibaba. Be comprehensive and precise. Provide detailed answers with examples. For math: thorough step-by-step working. If image attached, analyze fully. End with bold 'Summary:' paragraph.",
  mistral:      "You are Mistral 7B. Be efficient and accurate. Straight to the point. For math: clean calculation steps. If image attached, answer based on what you see. End with bold 'Key Takeaway:' line.",
  phi3:         "You are Phi-3 Mini by Microsoft. Be concise and smart. Compact but complete answers. For math: direct working. If image attached, describe and answer. End with bold 'In Short:' one sentence.",
};

const ACCEPT = "image/jpeg,image/png,image/gif,image/webp,application/pdf";

function toB64(file) {
  return new Promise((ok, fail) => {
    const r = new FileReader();
    r.onload = () => ok(r.result.split(",")[1]);
    r.onerror = () => fail(new Error("Read failed"));
    r.readAsDataURL(file);
  });
}

// ─── Individual API callers — ALL FREE ────────────────────────────────────────

async function callGeminiModel(prompt, apiKey, attachments, modelSlug, systemKey) {
  const parts = [];
  for (const f of attachments) {
    if (f.mime.startsWith("image/"))
      parts.push({ inlineData: { mimeType: f.mime, data: f.b64 } });
  }
  parts.push({ text: prompt || "Analyze attached files and answer visible questions." });

  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelSlug}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPTS[systemKey] }] },
        contents: [{ role: "user", parts }],
        generationConfig: { maxOutputTokens: 1024 },
      }),
    }
  );
  const json = await resp.json();
  if (!resp.ok) throw new Error(json?.error?.message || `Gemini error ${resp.status}`);
  return json.candidates?.[0]?.content?.parts?.[0]?.text || "No response.";
}

async function callGroqModel(prompt, apiKey, attachments, modelId, systemKey) {
  const contentParts = [];
  for (const f of attachments) {
    if (f.mime.startsWith("image/"))
      contentParts.push({ type: "image_url", image_url: { url: `data:${f.mime};base64,${f.b64}` } });
  }
  contentParts.push({ type: "text", text: prompt || "Analyze attached files and answer visible questions." });

  const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: modelId,
      max_tokens: 1024,
      messages: [
        { role: "system", content: SYSTEM_PROMPTS[systemKey] },
        { role: "user", content: contentParts },
      ],
    }),
  });
  const json = await resp.json();
  if (!resp.ok) throw new Error(json?.error?.message || `Groq error ${resp.status}`);
  return json.choices?.[0]?.message?.content || "No response.";
}

async function callOpenRouter(prompt, apiKey, attachments, modelId, systemKey) {
  const contentParts = [];
  for (const f of attachments) {
    if (f.mime.startsWith("image/"))
      contentParts.push({ type: "image_url", image_url: { url: `data:${f.mime};base64,${f.b64}` } });
  }
  contentParts.push({ type: "text", text: prompt || "Analyze attached files and answer visible questions." });

  const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}`, "HTTP-Referer": "https://omnianswer.ai", "X-Title": "OmniAnswer AI" },
    body: JSON.stringify({
      model: modelId,
      max_tokens: 1024,
      messages: [
        { role: "system", content: SYSTEM_PROMPTS[systemKey] },
        { role: "user", content: contentParts },
      ],
    }),
  });
  const json = await resp.json();
  if (!resp.ok) throw new Error(json?.error?.message || `OpenRouter error ${resp.status}`);
  return json.choices?.[0]?.message?.content || "No response.";
}

const CALLERS = {
  gemini_flash: (p,k,a) => callGeminiModel(p, k, a, "gemini-2.0-flash",         "gemini_flash"),
  gemini_pro:   (p,k,a) => callGeminiModel(p, k, a, "gemini-1.5-pro",            "gemini_pro"),
  llama70b:     (p,k,a) => callGroqModel(p, k, a,   "llama-3.3-70b-versatile",   "llama70b"),
  llama8b:      (p,k,a) => callGroqModel(p, k, a,   "llama-3.1-8b-instant",      "llama8b"),
  deepseek:     (p,k,a) => callGroqModel(p, k, a,   "deepseek-r1-distill-llama-70b", "deepseek"),
  mixtral:      (p,k,a) => callGroqModel(p, k, a,   "mixtral-8x7b-32768",        "mixtral"),
  gemma:        (p,k,a) => callGroqModel(p, k, a,   "gemma2-9b-it",              "gemma"),
  qwen:         (p,k,a) => callGroqModel(p, k, a,   "qwen-qwq-32b",              "qwen"),
  mistral:      (p,k,a) => callOpenRouter(p, k, a,  "mistralai/mistral-7b-instruct:free", "mistral"),
  phi3:         (p,k,a) => callOpenRouter(p, k, a,  "microsoft/phi-3-mini-128k-instruct:free", "phi3"),
};


// ─── Typing animation ─────────────────────────────────────────────────────────
function Typing({ text }) {
  const [out, setOut] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    setOut(""); setDone(false);
    if (!text) return;
    let i = 0;
    const t = setInterval(() => {
      i += 16; setOut(text.slice(0, i));
      if (i >= text.length) { setOut(text); setDone(true); clearInterval(t); }
    }, 16);
    return () => clearInterval(t);
  }, [text]);
  return <span style={{ whiteSpace: "pre-wrap", lineHeight: 1.8 }}>{out}{!done && <span className="blink">▋</span>}</span>;
}

// ─── Model Card ───────────────────────────────────────────────────────────────
function Card({ model, answer, loading, error, noKey }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="card" style={{ "--cc": model.color, "--ca": model.accent }}>
      <div className="card-top">
        <span style={{ fontSize: 20, color: model.accent, lineHeight: 1 }}>{model.icon}</span>
        <div style={{ flex: 1 }}>
          <div className="mname">{model.name}</div>
          <div className="mco">{model.company}</div>
        </div>
        {answer && (
          <button className="copybtn" onClick={() => { navigator.clipboard.writeText(answer); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
            {copied ? "✓" : "Copy"}
          </button>
        )}
        <div className={`dot ${loading ? "spin-dot" : answer ? "green" : error || noKey ? "red" : ""}`} style={loading ? { borderTopColor: model.accent } : {}} />
      </div>
      <div className="card-body">
        {noKey && !loading && (
          <div className="cs" style={{ flexDirection: "column", gap: 10, textAlign: "center" }}>
            <span style={{ fontSize: 26 }}>🔑</span>
            <span style={{ fontSize: 12, color: "#ff9a44" }}>No API key set</span>
            <span style={{ fontSize: 11, color: "#3a4558", lineHeight: 1.5 }}>Open ⚙️ Settings and add your {model.keyLabel}</span>
          </div>
        )}
        {!noKey && loading && <div className="cs"><div className="ring" style={{ borderTopColor: model.accent }} /><span style={{ color: "#6b7a93", fontSize: 13 }}>Thinking...</span></div>}
        {!noKey && !loading && error && (
          <div className="cs" style={{ flexDirection: "column", gap: 8 }}>
            <span style={{ fontSize: 22 }}>⚠️</span>
            <span style={{ color: "#ff8080", fontSize: 12, textAlign: "center", wordBreak: "break-word", maxWidth: 240, fontFamily: "monospace" }}>{error}</span>
          </div>
        )}
        {!noKey && !loading && answer && <div className="ans"><Typing text={answer} /></div>}
        {!noKey && !loading && !answer && !error && <div className="cs" style={{ color: "#3a4558", fontSize: 13 }}>Waiting...</div>}
      </div>
    </div>
  );
}

// ─── Settings Modal ───────────────────────────────────────────────────────────
function SettingsModal({ keys, onSave, onClose }) {
  const [draft, setDraft] = useState({ ...keys });
  const [show, setShow] = useState({});

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-head">
          <div>
            <div className="modal-title">⚙️ API Key Settings</div>
            <div className="modal-sub">Enter your own API keys — stored locally in your browser, never sent anywhere except directly to each provider.</div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {MODELS.map(m => (
            <div className="key-row" key={m.id} style={{ "--ca": m.accent }}>
              <div className="key-row-head">
                <span style={{ color: m.accent, fontSize: 16 }}>{m.icon}</span>
                <div>
                  <div className="key-row-name">{m.name}</div>
                  <a className="key-row-link" href={m.keyLink} target="_blank" rel="noreferrer">{m.keyLinkLabel} ↗</a>
                </div>
                {draft[m.id] && <span className="key-status-ok">✓ Set</span>}
              </div>
              <div className="key-input-wrap">
                <input
                  className="key-input"
                  type={show[m.id] ? "text" : "password"}
                  placeholder={m.keyPlaceholder}
                  value={draft[m.id] || ""}
                  onChange={e => setDraft(p => ({ ...p, [m.id]: e.target.value.trim() }))}
                />
                <button className="key-eye" onClick={() => setShow(p => ({ ...p, [m.id]: !p[m.id] }))}>
                  {show[m.id] ? "🙈" : "👁️"}
                </button>
              </div>
            </div>
          ))}

          <div className="key-note">
            🔒 Keys are saved in your browser's local storage only. They go directly from your browser to each AI provider's API — no middleman, no limits beyond what each provider gives you.
          </div>
        </div>

        <div className="modal-foot">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={() => { onSave(draft); onClose(); }}>💾 Save Keys</button>
        </div>
      </div>
    </div>
  );
}

// ─── History sidebar item ─────────────────────────────────────────────────────
function HistoryView({ entry, onClose }) {
  const [tab, setTab] = useState("all");
  const visible = tab === "all" ? MODELS : MODELS.filter(m => m.id === tab);
  const d = new Date(entry.timestamp);
  return (
    <div className="history-view">
      <div className="hv-header">
        <div>
          <div className="hv-time">{d.toLocaleDateString()} {d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
          <div className="hv-q">"{entry.question || "(image/file question)"}"</div>
        </div>
        <button className="hv-close" onClick={onClose}>✕ Back</button>
      </div>
      <div className="tabs" style={{ marginTop: 14 }}>
        <span className="tlbl">View:</span>
        <button className={`tb${tab === "all" ? " on" : ""}`} onClick={() => setTab("all")}>All</button>
        {MODELS.map(m => (
          <button key={m.id} className={`tb${tab === m.id ? " on" : ""}`} style={{ "--cc": m.color, "--ca": m.accent }} onClick={() => setTab(m.id)}>
            {m.icon} {m.name}
          </button>
        ))}
      </div>
      <div className="grid" style={{ marginTop: 14 }}>
        {visible.map(m => (
          <div className="card" key={m.id} style={{ "--cc": m.color, "--ca": m.accent }}>
            <div className="card-top">
              <span style={{ fontSize: 20, color: m.accent }}>{m.icon}</span>
              <div style={{ flex: 1 }}><div className="mname">{m.name}</div><div className="mco">{m.company}</div></div>
              <div className="dot green" />
            </div>
            <div className="card-body">
              {entry.answers[m.id]
                ? <div className="ans" style={{ whiteSpace: "pre-wrap", lineHeight: 1.8 }}>{entry.answers[m.id]}</div>
                : <div className="cs" style={{ color: "#3a4558", fontSize: 13 }}>No answer saved</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [q, setQ] = useState("");
  const [qtype, setQtype] = useState("general");
  const [files, setFiles] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loadings, setLoadings] = useState({});
  const [errors, setErrors] = useState({});
  const [started, setStarted] = useState(false);
  const [tab, setTab] = useState("all");
  const [dragging, setDragging] = useState(false);
  const [fileErr, setFileErr] = useState("");
  const [status, setStatus] = useState("");

  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [viewingEntry, setViewingEntry] = useState(null);

  const [apiKeys, setApiKeys] = useState({ gemini: "", llama: "", deepseek: "", mixtral: "" });
  const [showSettings, setShowSettings] = useState(false);
  const [keySaved, setKeySaved] = useState(false);

  // PWA Install
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstall, setShowInstall] = useState(false);
  const [installDismissed, setInstallDismissed] = useState(false);
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isInStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;

  // Load persisted data
  useEffect(() => {
    storageGet(HISTORY_KEY).then(h => setHistory(h || []));
    storageGet(KEYS_KEY).then(k => { if (k) setApiKeys(k); });
  }, []);

  const saveKeys = async (keys) => {
    setApiKeys(keys);
    await storageSet(KEYS_KEY, keys);
    setKeySaved(true);
    setTimeout(() => setKeySaved(false), 3000);
  };

  const addFiles = useCallback(async (raw) => {
    setFileErr("");
    const arr = Array.from(raw).filter(f => ["image/jpeg","image/png","image/gif","image/webp","application/pdf"].includes(f.type));
    if (!arr.length) { setFileErr("Only JPG, PNG, GIF, WEBP or PDF are supported."); return; }
    const processed = await Promise.all(arr.map(async f => ({
      id: Math.random().toString(36).slice(2),
      name: f.name, mime: f.type,
      b64: await toB64(f),
      preview: f.type.startsWith("image/") ? URL.createObjectURL(f) : null,
    })));
    setFiles(p => [...p, ...processed].slice(0, 5));
  }, []);

  useEffect(() => {
    const h = (e) => {
      const imgs = Array.from(e.clipboardData?.items || []).filter(i => i.type.startsWith("image/")).map(i => i.getAsFile()).filter(Boolean);
      if (imgs.length) addFiles(imgs);
    };
    window.addEventListener("paste", h);
    return () => window.removeEventListener("paste", h);
  }, [addFiles]);

  // Catch native install prompt (Android Chrome)
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
      if (!installDismissed && !isInStandalone) setShowInstall(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    // On iOS show manual instructions popup after 3s
    if (isIOS && !isInStandalone && !installDismissed) {
      const t = setTimeout(() => setShowInstall(true), 3000);
      return () => { clearTimeout(t); window.removeEventListener("beforeinstallprompt", handler); };
    }
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [installDismissed, isInStandalone, isIOS]);

  const handleInstall = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      setInstallPrompt(null);
      setShowInstall(false);
    }
  };

  const dismissInstall = () => {
    setShowInstall(false);
    setInstallDismissed(true);
  };

  const hasAnyKey = MODELS.some(m => apiKeys[m.id]);
  const busy = Object.values(loadings).some(Boolean);
  const canGo = (q.trim() || files.length > 0) && !busy && hasAnyKey;

  const runAll = async () => {
    if (!canGo) return;
    setStarted(true); setShowHistory(false); setViewingEntry(null);
    setAnswers({}); setErrors({});
    const initL = {};
    MODELS.forEach(m => { if (apiKeys[m.id]) initL[m.id] = true; });
    setLoadings(initL);

    const prefix = Q_TYPES.find(t => t.value === qtype)?.prefix || "";
    const prompt = prefix + (q || "");
    const collectedAnswers = {};

    for (const model of MODELS) {
      if (!apiKeys[model.id]) continue;
      setStatus(`Asking ${model.name}...`);
      try {
        const text = await CALLERS[model.id](prompt, apiKeys[model.id], files);
        collectedAnswers[model.id] = text;
        setAnswers(p => ({ ...p, [model.id]: text }));
      } catch (e) {
        setErrors(p => ({ ...p, [model.id]: e.message }));
      }
      setLoadings(p => ({ ...p, [model.id]: false }));
    }
    setStatus("");

    if (Object.keys(collectedAnswers).length > 0) {
      const entry = { id: Date.now().toString(), timestamp: Date.now(), question: q.trim(), qtype, hasFiles: files.length > 0, answers: collectedAnswers };
      const newH = [entry, ...history].slice(0, 50);
      setHistory(newH);
      await storageSet(HISTORY_KEY, newH);
    }
  };

  const reset = () => {
    files.forEach(f => f.preview && URL.revokeObjectURL(f.preview));
    setQ(""); setFiles([]); setAnswers({}); setErrors({}); setLoadings({});
    setStarted(false); setTab("all"); setFileErr(""); setStatus(""); setViewingEntry(null);
  };

  const deleteEntry = async (id) => {
    const updated = history.filter(h => h.id !== id);
    setHistory(updated);
    await storageSet(HISTORY_KEY, updated);
    if (viewingEntry?.id === id) setViewingEntry(null);
  };

  const clearHistory = async () => {
    setHistory([]); setViewingEntry(null);
    await storageDel(HISTORY_KEY);
  };

  const visible = tab === "all" ? MODELS : MODELS.filter(m => m.id === tab);
  const configuredCount = MODELS.filter(m => apiKeys[m.id]).length;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=DM+Sans:wght@300;400;500;600&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{
          --bg:#07090f;--s1:#0d1117;--s2:#111820;--s3:#161f2b;
          --b:rgba(255,255,255,.07);--bh:rgba(255,255,255,.16);
          --t:#e2e8f4;--m:#5f7291;--d:#2e3d52;
          --ac:#4f9eff;--acg:rgba(79,158,255,.12);
          --sans:'DM Sans',sans-serif;--mono:'Space Mono',monospace;
        }
        body{background:var(--bg);color:var(--t);font-family:var(--sans);min-height:100vh;overflow-x:hidden}
        body::before{content:'';position:fixed;inset:0;background-image:linear-gradient(rgba(255,255,255,.011) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.011) 1px,transparent 1px);background-size:44px 44px;pointer-events:none;z-index:0}
        .root{position:relative;z-index:1;display:flex;min-height:100vh}

        /* Sidebar — desktop: push layout, mobile: full overlay drawer */
        .sidebar{width:290px;flex-shrink:0;background:var(--s1);border-right:1px solid var(--b);display:flex;flex-direction:column;height:100vh;position:sticky;top:0;overflow:hidden;transition:width .28s}
        .sidebar.collapsed{width:0;border:none}
        .sidebar-inner{width:290px;display:flex;flex-direction:column;height:100%;overflow:hidden}
        /* Mobile overlay */
        .sidebar-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:200;backdrop-filter:blur(2px)}
        .sidebar-overlay.visible{display:block}
        @media(max-width:700px){
          .sidebar{position:fixed;left:0;top:0;height:100vh;z-index:201;width:0;border:none}
          .sidebar.collapsed{width:0}
          .sidebar.open{width:290px;border-right:1px solid var(--b);box-shadow:4px 0 32px rgba(0,0,0,.5)}
        }
        .sb-head{padding:14px;border-bottom:1px solid var(--b);display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
        .sb-title{font-family:var(--mono);font-size:11px;font-weight:700;color:var(--t);display:flex;align-items:center;gap:7px}
        .sb-count{background:var(--ac);color:#fff;border-radius:100px;padding:1px 7px;font-size:10px}
        .sb-clear{background:none;border:1px solid rgba(255,80,80,.22);border-radius:6px;padding:3px 8px;font-size:11px;color:#ff6b6b;cursor:pointer;font-family:var(--mono);transition:all .18s}
        .sb-clear:hover{background:rgba(255,80,80,.1)}
        .sb-list{flex:1;overflow-y:auto;padding:9px}
        .sb-empty{text-align:center;padding:36px 14px;color:var(--d);font-size:12px;line-height:1.7}
        .sb-empty span{font-size:26px;display:block;margin-bottom:7px;opacity:.38}
        .sb-item{background:var(--s2);border:1px solid var(--b);border-radius:9px;padding:10px 12px;margin-bottom:7px;cursor:pointer;transition:all .18s;position:relative}
        .sb-item:hover{border-color:rgba(79,158,255,.3);background:rgba(79,158,255,.04)}
        .sb-item.active{border-color:rgba(79,158,255,.5);background:rgba(79,158,255,.07)}
        .sb-item-q{font-size:11px;color:var(--t);line-height:1.4;margin-bottom:4px;word-break:break-word;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
        .sb-item-meta{display:flex;align-items:center;gap:7px;font-size:10px;color:var(--d);font-family:var(--mono)}
        .sb-item-del{position:absolute;top:7px;right:7px;width:17px;height:17px;background:none;border:none;color:var(--d);cursor:pointer;font-size:13px;border-radius:3px;display:flex;align-items:center;justify-content:center;opacity:0;transition:all .15s}
        .sb-item:hover .sb-item-del{opacity:1}
        .sb-item-del:hover{background:rgba(255,80,80,.15);color:#ff6b6b}

        /* Main */
        .main{flex:1;max-width:1080px;padding:26px 18px 60px;overflow-x:hidden}

        /* Header */
        .hdr{text-align:center;margin-bottom:28px}
        .topnav{display:flex;align-items:center;justify-content:space-between;background:var(--s1);border:1px solid var(--b);border-radius:12px;padding:8px 12px;margin-bottom:20px;gap:8px;flex-wrap:wrap}
        .topnav-left{display:flex;gap:7px;align-items:center;flex-wrap:wrap}
        .topnav-right{display:flex;gap:7px;align-items:center}
        .topnav-brand{font-family:var(--mono);font-size:13px;font-weight:700;background:linear-gradient(135deg,#fff,#4f9eff);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;flex:1;text-align:center}
        .hdr-btn{display:flex;align-items:center;gap:6px;background:var(--s2);border:1px solid var(--b);border-radius:8px;padding:7px 12px;font-size:11px;color:var(--m);cursor:pointer;transition:all .18s;font-family:var(--mono);white-space:nowrap}
        .hdr-btn:hover{border-color:var(--bh);color:var(--t)}
        .hdr-btn.active{border-color:rgba(79,158,255,.4);color:var(--ac);background:rgba(79,158,255,.08)}
        .hdr-btn.warn{border-color:rgba(255,165,0,.3);color:#ffaa33;background:rgba(255,165,0,.06)}
        .pill{display:inline-flex;align-items:center;gap:7px;background:rgba(79,158,255,.08);border:1px solid rgba(79,158,255,.2);border-radius:100px;padding:5px 15px;font-family:var(--mono);font-size:10px;color:var(--ac);letter-spacing:.12em;text-transform:uppercase;margin-bottom:12px}
        .pill::before{content:'';width:6px;height:6px;background:var(--ac);border-radius:50%;box-shadow:0 0 7px var(--ac);animation:glow 2s ease-in-out infinite}
        @keyframes glow{0%,100%{opacity:1}50%{opacity:.35}}
        h1{font-family:var(--mono);font-size:clamp(20px,4vw,42px);font-weight:700;letter-spacing:-.02em;background:linear-gradient(135deg,#fff 0%,#8ab4f8 45%,#4f9eff 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;line-height:1.1;margin-bottom:8px}
        .sub{color:var(--m);font-size:13px;font-weight:300;max-width:440px;margin:0 auto;line-height:1.65}
        .model-row{display:flex;justify-content:center;gap:7px;flex-wrap:wrap;margin-top:12px}
        .mbadge{display:flex;align-items:center;gap:5px;background:var(--s2);border:1px solid var(--b);border-radius:7px;padding:4px 10px;font-size:11px;color:var(--m)}
        .mbadge.active{border-color:rgba(79,158,255,.3);color:var(--t)}

        /* Setup banner */
        .setup-banner{display:flex;align-items:flex-start;gap:12px;background:rgba(255,165,0,.07);border:1px solid rgba(255,165,0,.22);border-radius:12px;padding:14px 16px;margin-bottom:18px}
        .setup-banner-title{font-family:var(--mono);font-size:12px;font-weight:700;color:#ffaa33;margin-bottom:4px}
        .setup-banner-body{font-size:12px;color:#c8a060;line-height:1.6}

        /* Key saved toast */
        .toast{position:fixed;bottom:24px;right:24px;background:#1a2a1a;border:1px solid #3ddc84;border-radius:10px;padding:11px 18px;font-family:var(--mono);font-size:12px;color:#3ddc84;z-index:999;animation:fadeUp .3s ease}

        /* Input panel */
        .panel{background:var(--s1);border:2px solid var(--b);border-radius:16px;padding:16px;margin-bottom:18px;transition:border-color .25s,box-shadow .25s}
        .panel:focus-within{border-color:rgba(79,158,255,.25);box-shadow:0 0 0 1px rgba(79,158,255,.06),0 12px 36px rgba(0,0,0,.26)}
        .panel.drag{border-color:rgba(79,158,255,.55)!important;background:rgba(79,158,255,.025)!important}
        .types{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px}
        .qt{background:var(--s2);border:1px solid var(--b);border-radius:7px;padding:5px 11px;font-size:12px;color:var(--m);cursor:pointer;transition:all .18s;white-space:nowrap;font-family:var(--sans)}
        .qt:hover{border-color:var(--bh);color:var(--t)}
        .qt.on{background:rgba(79,158,255,.1);border-color:rgba(79,158,255,.4);color:var(--ac);font-weight:600}
        textarea{width:100%;background:var(--s2);border:1px solid var(--b);border-radius:10px;padding:12px 14px;font-family:var(--sans);font-size:14px;color:var(--t);resize:none;outline:none;line-height:1.6;min-height:78px;transition:border-color .2s;display:block}
        textarea:focus{border-color:rgba(79,158,255,.36)}
        textarea::placeholder{color:var(--d)}
        .az{margin-top:10px;background:var(--s2);border:1.5px dashed var(--b);border-radius:10px;padding:11px;transition:border-color .2s,background .2s}
        .az.drag{border-color:rgba(79,158,255,.5);background:rgba(79,158,255,.04)}
        .az-top{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
        .file-label{display:inline-flex;align-items:center;gap:6px;background:rgba(79,158,255,.12);border:1px solid rgba(79,158,255,.3);border-radius:8px;padding:7px 14px;font-size:13px;font-weight:600;color:var(--ac);cursor:pointer;transition:all .2s;user-select:none;flex-shrink:0;font-family:var(--sans)}
        .file-label:hover{background:rgba(79,158,255,.22);border-color:rgba(79,158,255,.55);transform:translateY(-1px)}
        .file-input{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}
        .az-hint{font-size:11px;color:var(--d);line-height:1.6}
        .az-hint b{color:var(--m)}
        .thumbs{display:flex;gap:8px;flex-wrap:wrap;margin-top:9px}
        .thumb{position:relative;width:64px;animation:pop .2s ease}
        @keyframes pop{from{opacity:0;transform:scale(.8)}to{opacity:1;transform:scale(1)}}
        .thumb img{width:64px;height:64px;object-fit:cover;border-radius:7px;border:1px solid var(--b);display:block}
        .thumb-pdf{width:64px;height:64px;background:var(--s3);border:1px solid var(--b);border-radius:7px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;font-size:20px}
        .thumb-pdf span{font-size:8px;color:var(--d);text-align:center;padding:0 3px;word-break:break-all;line-height:1.2;font-family:var(--mono)}
        .xbtn{position:absolute;top:-6px;right:-6px;width:17px;height:17px;background:#e03040;border:2px solid var(--s1);border-radius:50%;color:#fff;font-size:11px;font-weight:700;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:transform .15s}
        .xbtn:hover{transform:scale(1.18)}
        .tname{font-size:8px;color:var(--d);text-align:center;margin-top:3px;word-break:break-all;line-height:1.2;font-family:var(--mono)}
        .ferr{color:#ff7070;font-size:11px;margin-top:7px;font-family:var(--mono)}
        .foot{display:flex;justify-content:space-between;align-items:center;margin-top:10px;gap:9px;flex-wrap:wrap}
        .foot-l{font-size:11px;color:var(--d);font-family:var(--mono);display:flex;gap:10px;flex-wrap:wrap;align-items:center}
        .chip{background:var(--s3);border:1px solid var(--b);border-radius:5px;padding:2px 7px;color:var(--m)}
        .acts{display:flex;gap:7px;align-items:center}
        .clr{background:none;border:1px solid var(--b);border-radius:8px;padding:8px 14px;font-size:13px;color:var(--m);cursor:pointer;transition:all .18s;font-family:var(--sans)}
        .clr:hover{border-color:var(--bh);color:var(--t)}
        .go{background:linear-gradient(135deg,#4f9eff,#3278d8);border:none;border-radius:8px;padding:9px 20px;font-size:14px;font-weight:600;color:#fff;cursor:pointer;display:flex;align-items:center;gap:7px;box-shadow:0 4px 14px rgba(79,158,255,.26);transition:all .18s;font-family:var(--sans)}
        .go:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 6px 20px rgba(79,158,255,.38)}
        .go:disabled{opacity:.38;cursor:not-allowed;transform:none;box-shadow:none}

        /* Status */
        .status-bar{display:flex;align-items:center;gap:9px;padding:7px 12px;background:rgba(79,158,255,.07);border:1px solid rgba(79,158,255,.17);border-radius:8px;margin-bottom:11px;font-family:var(--mono);font-size:12px;color:var(--ac)}
        .sring{width:12px;height:12px;border:2px solid rgba(79,158,255,.2);border-radius:50%;border-top-color:var(--ac);animation:sp .7s linear infinite;flex-shrink:0}
        @keyframes sp{to{transform:rotate(360deg)}}
        .sbar{display:flex;gap:13px;align-items:center;padding:7px 12px;background:var(--s1);border:1px solid var(--b);border-radius:8px;margin-bottom:11px;flex-wrap:wrap}
        .st{font-family:var(--mono);font-size:11px;color:var(--m)}
        .st b{color:var(--ac)}
        .tabs{display:flex;gap:5px;margin-bottom:14px;flex-wrap:wrap;align-items:center}
        .tlbl{font-size:10px;color:var(--d);font-family:var(--mono);margin-right:3px;text-transform:uppercase;letter-spacing:.1em}
        .tb{background:var(--s1);border:1px solid var(--b);border-radius:7px;padding:5px 11px;font-size:12px;color:var(--m);cursor:pointer;transition:all .18s;display:flex;align-items:center;gap:4px;font-family:var(--sans)}
        .tb:hover{border-color:var(--bh);color:var(--t)}
        .tb.on{background:var(--s2);border-color:var(--cc,rgba(79,158,255,.4));color:var(--ca,var(--ac))}
        .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:13px}
        .grid.solo{grid-template-columns:1fr;max-width:660px}
        .card{background:var(--s1);border:1px solid var(--b);border-radius:12px;overflow:hidden;display:flex;flex-direction:column;min-height:210px;animation:fadeUp .32s ease both;transition:box-shadow .25s}
        .card:hover{box-shadow:0 5px 26px rgba(0,0,0,.26)}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        .card-top{display:flex;align-items:center;gap:9px;padding:11px 14px;border-bottom:1px solid var(--b);background:var(--s2)}
        .mname{font-family:var(--mono);font-size:12px;font-weight:700;color:var(--t)}
        .mco{font-size:10px;color:var(--m);margin-top:1px}
        .copybtn{background:rgba(255,255,255,.05);border:1px solid var(--b);border-radius:5px;padding:3px 8px;font-size:11px;color:var(--m);cursor:pointer;font-family:var(--mono);transition:all .18s}
        .copybtn:hover{background:rgba(255,255,255,.1);color:var(--t)}
        .dot{width:8px;height:8px;border-radius:50%;background:var(--d);flex-shrink:0;transition:background .3s}
        .dot.spin-dot{border:2px solid rgba(255,255,255,.1);background:transparent;animation:sp .8s linear infinite}
        .dot.green{background:#3ddc84;box-shadow:0 0 6px #3ddc8466}
        .dot.red{background:#ff4757;box-shadow:0 0 6px #ff475766}
        .card-body{flex:1;padding:14px;overflow:auto;max-height:340px}
        .cs{display:flex;align-items:center;justify-content:center;gap:9px;min-height:85px;color:var(--m);font-size:13px}
        .ring{width:18px;height:18px;border:2px solid rgba(255,255,255,.08);border-radius:50%;animation:sp .8s linear infinite;flex-shrink:0}
        .ans{font-size:13px;color:#bfcde0;line-height:1.8;font-weight:300}
        .blink{animation:bl 1s step-end infinite;color:var(--ac)}
        @keyframes bl{50%{opacity:0}}

        /* History view */
        .history-view{animation:fadeUp .3s ease}
        .hv-header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:14px;background:var(--s1);border:1px solid var(--b);border-radius:11px;margin-bottom:4px}
        .hv-time{font-family:var(--mono);font-size:10px;color:var(--d);margin-bottom:4px}
        .hv-q{font-size:14px;color:var(--t);font-weight:500;line-height:1.4;max-width:580px}
        .hv-close{background:var(--s2);border:1px solid var(--b);border-radius:7px;padding:6px 13px;font-size:12px;color:var(--m);cursor:pointer;font-family:var(--sans);white-space:nowrap;flex-shrink:0;transition:all .18s}
        .hv-close:hover{border-color:var(--bh);color:var(--t)}

        /* Welcome */
        .welcome{text-align:center;padding:40px 20px}
        .welcome .wi{font-size:38px;margin-bottom:10px;opacity:.25}
        .welcome h3{font-family:var(--mono);font-size:13px;color:var(--d);font-weight:400;margin-bottom:6px}
        .welcome p{font-size:12px;color:var(--d);max-width:360px;margin:0 auto;line-height:1.7}

        /* Modal */
        .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:100;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)}
        .modal{background:var(--s1);border:1px solid var(--bh);border-radius:18px;width:100%;max-width:560px;max-height:90vh;display:flex;flex-direction:column;animation:fadeUp .25s ease;overflow:hidden}
        .modal-head{padding:20px 22px 16px;border-bottom:1px solid var(--b);display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-shrink:0}
        .modal-title{font-family:var(--mono);font-size:15px;font-weight:700;color:var(--t);margin-bottom:5px}
        .modal-sub{font-size:12px;color:var(--m);line-height:1.6;max-width:420px}
        .modal-close{background:none;border:1px solid var(--b);border-radius:8px;width:32px;height:32px;color:var(--m);cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .18s}
        .modal-close:hover{border-color:var(--bh);color:var(--t)}
        .modal-body{flex:1;overflow-y:auto;padding:18px 22px;display:flex;flex-direction:column;gap:16px}
        .key-row{background:var(--s2);border:1px solid var(--b);border-radius:12px;padding:14px}
        .key-row-head{display:flex;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap}
        .key-row-name{font-family:var(--mono);font-size:12px;font-weight:700;color:var(--t)}
        .key-row-link{font-size:10px;color:var(--ac);text-decoration:none;display:block;margin-top:2px}
        .key-row-link:hover{text-decoration:underline}
        .key-status-ok{margin-left:auto;background:rgba(61,220,132,.1);border:1px solid rgba(61,220,132,.3);border-radius:6px;padding:2px 9px;font-size:10px;color:#3ddc84;font-family:var(--mono)}
        .key-input-wrap{display:flex;gap:8px;align-items:center}
        .key-input{flex:1;background:var(--s3);border:1px solid var(--b);border-radius:8px;padding:9px 12px;font-family:var(--mono);font-size:12px;color:var(--t);outline:none;transition:border-color .2s}
        .key-input:focus{border-color:rgba(79,158,255,.4)}
        .key-input::placeholder{color:var(--d)}
        .key-eye{background:none;border:1px solid var(--b);border-radius:7px;padding:7px 10px;cursor:pointer;font-size:14px;transition:all .18s;color:var(--m)}
        .key-eye:hover{border-color:var(--bh)}
        .key-note{background:rgba(79,158,255,.06);border:1px solid rgba(79,158,255,.16);border-radius:10px;padding:12px 14px;font-size:12px;color:var(--m);line-height:1.65}
        .modal-foot{padding:14px 22px;border-top:1px solid var(--b);display:flex;gap:10px;justify-content:flex-end;flex-shrink:0}
        .btn-primary{background:linear-gradient(135deg,#4f9eff,#3278d8);border:none;border-radius:9px;padding:10px 22px;font-size:13px;font-weight:600;color:#fff;cursor:pointer;font-family:var(--sans);transition:all .18s;box-shadow:0 3px 12px rgba(79,158,255,.24)}
        .btn-primary:hover{transform:translateY(-1px);box-shadow:0 5px 18px rgba(79,158,255,.36)}
        .btn-secondary{background:none;border:1px solid var(--b);border-radius:9px;padding:10px 18px;font-size:13px;color:var(--m);cursor:pointer;font-family:var(--sans);transition:all .18s}
        .btn-secondary:hover{border-color:var(--bh);color:var(--t)}

        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:var(--s3);border-radius:4px}
        @media(max-width:700px){.grid{grid-template-columns:1fr}.model-row{display:none}}

        /* ── Install PWA Popup ── */
        .install-popup{
          position:fixed;bottom:24px;left:50%;transform:translateX(-50%);
          width:calc(100% - 32px);max-width:420px;
          background:linear-gradient(135deg,#0d1117,#111820);
          border:1px solid rgba(79,158,255,.35);
          border-radius:18px;padding:20px;
          box-shadow:0 8px 40px rgba(0,0,0,.6),0 0 0 1px rgba(79,158,255,.1);
          z-index:500;animation:slideUp .4s cubic-bezier(.16,1,.3,1);
          display:flex;flex-direction:column;gap:14px;
        }
        @keyframes slideUp{from{opacity:0;transform:translateX(-50%) translateY(40px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
        .install-top{display:flex;align-items:center;gap:14px}
        .install-icon{width:52px;height:52px;border-radius:14px;background:linear-gradient(135deg,#4f9eff,#e07b54);display:flex;align-items:center;justify-content:center;font-size:26px;flex-shrink:0;box-shadow:0 4px 16px rgba(79,158,255,.3)}
        .install-text{}
        .install-title{font-family:var(--mono);font-size:14px;font-weight:700;color:var(--t);margin-bottom:3px}
        .install-sub{font-size:12px;color:var(--m);line-height:1.5}
        .install-steps{background:rgba(255,255,255,.04);border:1px solid var(--b);border-radius:10px;padding:12px 14px;display:flex;flex-direction:column;gap:8px}
        .install-step{display:flex;align-items:center;gap:10px;font-size:12px;color:var(--m)}
        .install-step-num{width:20px;height:20px;border-radius:50%;background:rgba(79,158,255,.15);border:1px solid rgba(79,158,255,.3);display:flex;align-items:center;justify-content:center;font-family:var(--mono);font-size:10px;font-weight:700;color:var(--ac);flex-shrink:0}
        .install-btns{display:flex;gap:8px}
        .install-btn-main{flex:1;background:linear-gradient(135deg,#4f9eff,#3278d8);border:none;border-radius:10px;padding:11px;font-family:var(--sans);font-size:14px;font-weight:600;color:#fff;cursor:pointer;transition:all .18s;box-shadow:0 4px 14px rgba(79,158,255,.3)}
        .install-btn-main:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(79,158,255,.4)}
        .install-btn-dismiss{background:none;border:1px solid var(--b);border-radius:10px;padding:11px 16px;font-family:var(--sans);font-size:13px;color:var(--m);cursor:pointer;transition:all .18s}
        .install-btn-dismiss:hover{border-color:var(--bh);color:var(--t)}

        /* Install button in topnav */
        .install-nav-btn{display:flex;align-items:center;gap:6px;background:linear-gradient(135deg,rgba(79,158,255,.15),rgba(79,158,255,.08));border:1px solid rgba(79,158,255,.35);border-radius:8px;padding:7px 12px;font-size:11px;font-weight:600;color:var(--ac);cursor:pointer;transition:all .18s;font-family:var(--mono);white-space:nowrap;animation:pulse-border 2s ease-in-out infinite}
        @keyframes pulse-border{0%,100%{border-color:rgba(79,158,255,.35)}50%{border-color:rgba(79,158,255,.7)}}
        .install-nav-btn:hover{background:rgba(79,158,255,.22);transform:translateY(-1px)}
      `}</style>

      {/* Settings Modal */}
      {showSettings && <SettingsModal keys={apiKeys} onSave={saveKeys} onClose={() => setShowSettings(false)} />}

      {/* Key saved toast */}
      {keySaved && <div className="toast">✓ API keys saved successfully!</div>}

      <div className="root">

        {/* Mobile overlay backdrop */}
        <div className={`sidebar-overlay${showHistory ? " visible" : ""}`} onClick={() => setShowHistory(false)} />

        {/* History Sidebar */}
        <div className={`sidebar${showHistory ? " open" : " collapsed"}`}>
          <div className="sidebar-inner">
            <div className="sb-head">
              <div className="sb-title">🕒 History {history.length > 0 && <span className="sb-count">{history.length}</span>}</div>
              {history.length > 0 && <button className="sb-clear" onClick={clearHistory}>Clear all</button>}
            </div>
            <div className="sb-list">
              {history.length === 0
                ? <div className="sb-empty"><span>📭</span>No history yet. Answers save automatically after each question.</div>
                : history.map(entry => (
                  <div key={entry.id} className={`sb-item${viewingEntry?.id === entry.id ? " active" : ""}`} onClick={() => { setViewingEntry(entry); setStarted(false); }}>
                    <div className="sb-item-q">{entry.hasFiles && "📎 "}{entry.question || "(image question)"}</div>
                    <div className="sb-item-meta">
                      <span>{new Date(entry.timestamp).toLocaleDateString()}</span>
                      <span>·</span>
                      <span>{new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                    <button className="sb-item-del" onClick={e => { e.stopPropagation(); deleteEntry(entry.id); }}>×</button>
                  </div>
                ))
              }
            </div>
          </div>
        </div>

        {/* Main */}
        <div className="main">

          {/* ── Top Navbar ── */}
          <div className="topnav">
            <div className="topnav-left">
              <button className={`hdr-btn${showHistory ? " active" : ""}`} onClick={() => setShowHistory(p => !p)}>
                🕒 History
                {history.length > 0 && <span style={{ background:"var(--ac)",color:"#fff",borderRadius:"100px",padding:"1px 6px",fontSize:9 }}>{history.length}</span>}
              </button>
            </div>
            <div className="topnav-brand">OmniAnswer AI</div>
            <div className="topnav-right">
              {!isInStandalone && (
                <button className="install-nav-btn" onClick={() => setShowInstall(true)} title="Install App">
                  📲 Install
                </button>
              )}
              <button className={`hdr-btn${!hasAnyKey ? " warn" : ""}`} onClick={() => setShowSettings(true)}>
                ⚙️ {configuredCount}/{MODELS.length} Keys
              </button>
            </div>
          </div>

          {/* ── Header ── */}
          <div className="hdr">
            <div className="pill">Independent Multi-LLM Engine</div>
            <h1>OmniAnswer AI</h1>
            <p className="sub">Your own API keys — no shared limits, no quota issues, fully independent</p>
            <div className="model-row">
              {MODELS.map(m => (
                <div className={`mbadge${apiKeys[m.id] ? " active" : ""}`} key={m.id}>
                  <span>{m.icon}</span>{m.name}
                  {apiKeys[m.id] ? " ✓" : " 🔑"}
                </div>
              ))}
            </div>
          </div>

          {/* Setup banner if no keys */}
          {!hasAnyKey && (
            <div className="setup-banner">
              <span style={{ fontSize: 24, flexShrink: 0 }}>🔑</span>
              <div>
                <div className="setup-banner-title">Add Your API Keys to Get Started</div>
                <div className="setup-banner-body">
                  Click <b>⚙️ 0/4 Keys</b> (top left) to add your own API keys from Anthropic, OpenAI, Google and Groq. This makes the app fully independent — no Claude.ai limits, no shared quota. Each provider gives you free credits to start!
                </div>
              </div>
            </div>
          )}

          {/* Input panel */}
          <div
            className={`panel${dragging ? " drag" : ""}`}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false); }}
            onDrop={e => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files); }}
          >
            <div className="types">
              {Q_TYPES.map(t => (
                <button key={t.value} className={`qt${qtype === t.value ? " on" : ""}`} onClick={() => setQtype(t.value)}>{t.label}</button>
              ))}
            </div>
            <textarea
              placeholder={"Type your question here...\n\nOr attach a photo of your textbook / exam paper below."}
              value={q}
              onChange={e => setQ(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) runAll(); }}
              rows={4}
            />
            <div className={`az${dragging ? " drag" : ""}`}>
              <div className="az-top">
                <label className="file-label">
                  📎 Attach File
                  <input className="file-input" type="file" accept={ACCEPT} multiple onChange={e => { if (e.target.files?.length) { addFiles(e.target.files); e.target.value = ""; } }} />
                </label>
                <div className="az-hint"><b>Supports:</b> JPG · PNG · GIF · WEBP · PDF (max 5)<br />Also: <b>drag & drop</b> · <b>paste</b> screenshots (Ctrl+V)</div>
              </div>
              {files.length > 0 && (
                <div className="thumbs">
                  {files.map(f => (
                    <div className="thumb" key={f.id}>
                      {f.preview ? <img src={f.preview} alt={f.name} /> : <div className="thumb-pdf">📄<span>{f.name.slice(0,10)}</span></div>}
                      <button className="xbtn" onClick={() => { if (f.preview) URL.revokeObjectURL(f.preview); setFiles(p => p.filter(x => x.id !== f.id)); }}>×</button>
                      <div className="tname">{f.name.length > 12 ? f.name.slice(0,11)+"…" : f.name}</div>
                    </div>
                  ))}
                </div>
              )}
              {fileErr && <div className="ferr">⚠ {fileErr}</div>}
            </div>
            <div className="foot">
              <div className="foot-l">
                <span>{q.length} chars</span>
                {files.length > 0 && <span className="chip">📎 {files.length} file{files.length > 1 ? "s" : ""}</span>}
                <span>{configuredCount} model{configuredCount !== 1 ? "s" : ""} ready</span>
              </div>
              <div className="acts">
                {(started || files.length > 0 || q) && <button className="clr" onClick={reset}>Clear</button>}
                <button className="go" onClick={hasAnyKey ? runAll : () => setShowSettings(true)} disabled={hasAnyKey && !canGo}>
                  {!hasAnyKey
                    ? <>🔑 Add API Keys</>
                    : busy
                      ? <><div className="ring" style={{ borderTopColor:"#fff",width:13,height:13 }} />Asking...</>
                      : <>⚡ Ask All Models</>}
                </button>
              </div>
            </div>
          </div>

          {/* History view */}
          {viewingEntry && !started && <HistoryView entry={viewingEntry} onClose={() => setViewingEntry(null)} />}

          {/* Live results */}
          {started && (
            <>
              {status && <div className="status-bar"><div className="sring" />{status}</div>}
              <div className="sbar">
                <div className="st">Active: <b>{configuredCount}</b></div>
                <div className="st">Done: <b>{Object.values(answers).filter(Boolean).length}</b></div>
                <div className="st">Waiting: <b>{Object.values(loadings).filter(Boolean).length}</b></div>
                {Object.keys(errors).length > 0 && <div className="st">Errors: <b style={{ color:"#ff6b6b" }}>{Object.keys(errors).length}</b></div>}
              </div>
              <div className="tabs">
                <span className="tlbl">View:</span>
                <button className={`tb${tab === "all" ? " on" : ""}`} onClick={() => setTab("all")}>All</button>
                {MODELS.map(m => (
                  <button key={m.id} className={`tb${tab === m.id ? " on" : ""}`} style={{ "--cc": m.color, "--ca": m.accent }} onClick={() => setTab(m.id)}>
                    {m.icon} {m.name}
                  </button>
                ))}
              </div>
              <div className={`grid${tab !== "all" ? " solo" : ""}`}>
                {visible.map(m => (
                  <Card key={m.id} model={m} answer={answers[m.id]} loading={loadings[m.id]} error={errors[m.id]} noKey={!apiKeys[m.id]} />
                ))}
              </div>
            </>
          )}

          {!started && !viewingEntry && (
            <div className="welcome">
              <div className="wi">🚀</div>
              <h3>{hasAnyKey ? "Ready — type your question above" : "Set up your API keys to begin"}</h3>
              <p>{hasAnyKey ? `${configuredCount} model${configuredCount !== 1 ? "s" : ""} configured. Answers save to history automatically.` : "Click ⚙️ Keys in the top left to add your free API keys from Anthropic, OpenAI, Google & Groq."}</p>
            </div>
          )}

          {/* Footer */}
          <div style={{ marginTop:48,padding:"16px 20px",background:"linear-gradient(135deg,rgba(79,158,255,.06),rgba(224,123,84,.05))",border:"1px solid rgba(255,255,255,.08)",borderRadius:13,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:13 }}>
            <div style={{ display:"flex",alignItems:"center",gap:12 }}>
              <div style={{ width:42,height:42,borderRadius:"50%",background:"linear-gradient(135deg,#4f9eff,#e07b54)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Space Mono',monospace",fontSize:16,fontWeight:700,color:"#fff",flexShrink:0,boxShadow:"0 4px 14px rgba(79,158,255,.32)" }}>V</div>
              <div>
                <div style={{ fontFamily:"'Space Mono',monospace",fontSize:13,fontWeight:700,color:"#e2e8f4",marginBottom:3,display:"flex",alignItems:"center",gap:7 }}>
                  <span style={{ width:6,height:6,borderRadius:"50%",background:"#4f9eff",boxShadow:"0 0 8px #4f9eff",display:"inline-block",flexShrink:0 }} />
                  Powered by Vivek Chavan
                </div>
                <div style={{ fontSize:11,color:"#5f7291" }}>AI Developer &amp; Web Creator</div>
              </div>
            </div>
            <div style={{ display:"flex",alignItems:"center",gap:8,flexWrap:"wrap" }}>
              <a href="tel:+919404813521" style={{ display:"flex",alignItems:"center",gap:6,background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.1)",borderRadius:8,padding:"7px 13px",fontFamily:"'Space Mono',monospace",fontSize:12,color:"#e2e8f4",textDecoration:"none" }}>
                📞 +91 94048 13521
              </a>
              <div style={{ background:"rgba(224,123,84,.1)",border:"1px solid rgba(224,123,84,.2)",borderRadius:8,padding:"7px 12px",fontFamily:"'Space Mono',monospace",fontSize:11,color:"#e07b54" }}>
                © 2026 Vivek Chavan
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── Install PWA Popup ── */}
      {showInstall && !isInStandalone && (
        <div className="install-popup">
          <div className="install-top">
            <div className="install-icon">🧠</div>
            <div className="install-text">
              <div className="install-title">Install OmniAnswer AI</div>
              <div className="install-sub">Add to your home screen for quick access — works like a native app, offline too!</div>
            </div>
          </div>

          {/* Android Chrome — native prompt */}
          {installPrompt && (
            <div className="install-btns">
              <button className="install-btn-main" onClick={handleInstall}>📲 Install App</button>
              <button className="install-btn-dismiss" onClick={dismissInstall}>Not now</button>
            </div>
          )}

          {/* iOS Safari — manual steps */}
          {isIOS && !installPrompt && (
            <>
              <div className="install-steps">
                <div className="install-step"><div className="install-step-num">1</div>Tap the <b style={{color:"var(--ac)",margin:"0 4px"}}>Share</b> button at the bottom of Safari (the box with arrow ↑)</div>
                <div className="install-step"><div className="install-step-num">2</div>Scroll down and tap <b style={{color:"var(--ac)",margin:"0 4px"}}>"Add to Home Screen"</b></div>
                <div className="install-step"><div className="install-step-num">3</div>Tap <b style={{color:"var(--ac)",margin:"0 4px"}}>"Add"</b> — done! Icon appears on your home screen</div>
              </div>
              <div className="install-btns">
                <button className="install-btn-dismiss" style={{flex:1}} onClick={dismissInstall}>Got it, thanks!</button>
              </div>
            </>
          )}

          {/* Other browsers — generic instructions */}
          {!isIOS && !installPrompt && (
            <>
              <div className="install-steps">
                <div className="install-step"><div className="install-step-num">1</div>Open this app in <b style={{color:"var(--ac)",margin:"0 4px"}}>Chrome</b> browser on your phone</div>
                <div className="install-step"><div className="install-step-num">2</div>Tap the <b style={{color:"var(--ac)",margin:"0 4px"}}>3-dot menu ⋮</b> at the top right</div>
                <div className="install-step"><div className="install-step-num">3</div>Tap <b style={{color:"var(--ac)",margin:"0 4px"}}>"Add to Home Screen"</b> or <b style={{color:"var(--ac)",margin:"0 4px"}}>"Install App"</b></div>
              </div>
              <div className="install-btns">
                <button className="install-btn-dismiss" style={{flex:1}} onClick={dismissInstall}>Got it!</button>
              </div>
            </>
          )}
        </div>
      )}

    </>
  );
}
