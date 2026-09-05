import React, { useState, useCallback, useEffect, useRef } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────
type Screen =
  | "splash" | "onboarding" | "login"
  | "patient-dashboard" | "patient-activities" | "patient-game"
  | "patient-game-complete" | "patient-memory" | "patient-routine" | "patient-profile"
  | "caregiver-dashboard" | "caregiver-reports"
  | "doctor-dashboard" | "admin-dashboard" | "admin-analytics";

type Role = "patient" | "caregiver" | "doctor" | "admin";
type Language = "EN" | "HI" | "AS" | "BN";
type Domain = "recall" | "recognition" | "attention" | "orientation" | "language";

type ActivityKey =
  | "family-recall" | "who-is-this" | "relationship-match"
  | "focus-find" | "whats-missing" | "daily-orientation"
  | "routine-next" | "category-sort" | "word-association" | "sound-recognition";

interface SessionResult {
  activityKey: ActivityKey;
  domain: Domain;
  accuracy: number;      // 0–100
  hintsUsed: number;
  completed: boolean;
  ts: number;
}

interface AIState {
  history: SessionResult[];
  domainScores: Record<Domain, number[]>;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const TEAL = "#0F6B66";
const TEAL_LIGHT = "#E4F3F1";
const CHARCOAL = "#2B2F31";
const SLATE = "#8A9299";
const AMBER = "#D97706";
const AMBER_BG = "#FEF3C7";

// ─── Activity Catalog ────────────────────────────────────────────────────────
interface Activity {
  key: ActivityKey;
  name: string;
  desc: string;
  icon: string;
  domain: Domain;
  baseDiff: "Gentle" | "Guided" | "Focused";
  time: string;
}

const ACTIVITIES: Activity[] = [
  { key: "family-recall",       name: "Family Recall",      desc: "Recognize familiar faces from your photo gallery",      icon: "👨‍👩‍👧", domain: "recall",      baseDiff: "Gentle",  time: "5 min" },
  { key: "who-is-this",         name: "Who Is This?",       desc: "Identify people by name from context clues",            icon: "🤔",     domain: "recognition", baseDiff: "Guided",  time: "4 min" },
  { key: "relationship-match",  name: "Relationship Match", desc: "Link faces to their relationships",                     icon: "🔗",     domain: "recall",      baseDiff: "Gentle",  time: "3 min" },
  { key: "focus-find",          name: "Focus & Find",       desc: "Spot a specific item in a busy grid",                  icon: "🔍",     domain: "attention",   baseDiff: "Focused", time: "5 min" },
  { key: "whats-missing",       name: "What's Missing?",    desc: "Find the removed object from the scene",               icon: "❓",     domain: "attention",   baseDiff: "Gentle",  time: "3 min" },
  { key: "daily-orientation",   name: "Daily Orientation",  desc: "Confirm today's day, time, and next event",            icon: "🗓️",     domain: "orientation", baseDiff: "Guided",  time: "4 min" },
  { key: "routine-next",        name: "Routine Next",       desc: "What activity comes after the current one?",           icon: "⏭️",     domain: "orientation", baseDiff: "Gentle",  time: "3 min" },
  { key: "category-sort",       name: "Category Sort",      desc: "Group familiar objects into the right category",       icon: "📂",     domain: "language",    baseDiff: "Focused", time: "6 min" },
  { key: "word-association",    name: "Word Association",   desc: "Complete the familiar word pair",                      icon: "💬",     domain: "language",    baseDiff: "Guided",  time: "4 min" },
  { key: "sound-recognition",   name: "Sound Recognition",  desc: "Name what you heard using your voice or choices",      icon: "🔊",     domain: "recognition", baseDiff: "Gentle",  time: "3 min" },
];

// ─── AI Adaptive Engine ───────────────────────────────────────────────────────
function getAvgScore(scores: number[]): number {
  if (!scores.length) return 70;
  const recent = scores.slice(-5);
  return Math.round(recent.reduce((a, b) => a + b, 0) / recent.length);
}

function adaptedDifficulty(domain: Domain, aiState: AIState): "Gentle" | "Guided" | "Focused" {
  const avg = getAvgScore(aiState.domainScores[domain]);
  if (avg < 58) return "Gentle";
  if (avg < 75) return "Guided";
  return "Focused";
}

function adaptedLabel(domain: Domain, aiState: AIState): string {
  const avg = getAvgScore(aiState.domainScores[domain]);
  if (avg < 58) return "Observed — offering more support";
  if (avg < 75) return "Observed — steady engagement";
  return "Observed — exploring a bit more";
}

function suggestedActivities(aiState: AIState): Activity[] {
  // Prioritize domains with lower recent scores
  const domainAvgs: [Domain, number][] = (Object.keys(aiState.domainScores) as Domain[]).map(
    (d) => [d, getAvgScore(aiState.domainScores[d])]
  );
  domainAvgs.sort((a, b) => a[1] - b[1]);
  const weakDomains = domainAvgs.slice(0, 2).map(([d]) => d);

  const prioritized = [
    ...ACTIVITIES.filter((a) => weakDomains.includes(a.domain)),
    ...ACTIVITIES.filter((a) => !weakDomains.includes(a.domain)),
  ];
  return prioritized.slice(0, 3);
}

function initialAIState(): AIState {
  return {
    history: [],
    domainScores: {
      recall:      [68, 72, 70, 74],
      recognition: [55, 58, 60, 56],
      attention:   [62, 65, 61, 67],
      orientation: [78, 80, 76, 82],
      language:    [60, 63, 65, 62],
    },
  };
}

function recordResult(aiState: AIState, result: SessionResult): AIState {
  const domainScores = { ...aiState.domainScores };
  domainScores[result.domain] = [...domainScores[result.domain], result.accuracy];
  return { history: [...aiState.history, result], domainScores };
}

// ─── Icons ───────────────────────────────────────────────────────────────────
const Ico = {
  leaf: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="1.8">
      <path d="M12 22C6 22 3 16 3 10c0-5 4-8 9-8 5 0 9 3 9 8 0 6-3 12-9 12z" />
      <path d="M12 22V10M12 10C9 7 6 7 3 10" strokeDasharray="2 2" />
    </svg>
  ),
  back: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={CHARCOAL} strokeWidth="1.8">
      <polyline points="15,18 9,12 15,6" />
    </svg>
  ),
  chevron: (color = SLATE) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8">
      <polyline points="9,18 15,12 9,6" />
    </svg>
  ),
  check: (color = "white", s = 16) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5">
      <polyline points="20,6 9,17 4,12" />
    </svg>
  ),
  eye: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={SLATE} strokeWidth="1.8">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  mic: (color = "white") => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  ),
  plus: (color = TEAL) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  bell: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={AMBER} strokeWidth="1.8">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),
  chart: (active = false) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? TEAL : SLATE} strokeWidth="1.8">
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" /><line x1="2" y1="20" x2="22" y2="20" />
    </svg>
  ),
  home: (active: boolean) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? TEAL : "none"} stroke={active ? TEAL : SLATE} strokeWidth="1.8">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9,22 9,12 15,12 15,22" />
    </svg>
  ),
  activity: (active: boolean) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? TEAL : SLATE} strokeWidth="1.8">
      <polyline points="22,12 18,12 15,21 9,3 6,12 2,12" />
    </svg>
  ),
  memory: (active: boolean) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? TEAL : SLATE} strokeWidth="1.8">
      <circle cx="12" cy="12" r="10" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <line x1="9" y1="9" x2="9.01" y2="9" strokeWidth="3" />
      <line x1="15" y1="9" x2="15.01" y2="9" strokeWidth="3" />
    </svg>
  ),
  cal: (active: boolean) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? TEAL : SLATE} strokeWidth="1.8">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  user: (active: boolean) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? TEAL : SLATE} strokeWidth="1.8">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  logout: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="1.8">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16,17 21,12 16,7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  play: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <polygon points="5,3 19,12 5,21" />
    </svg>
  ),
  sound: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="1.8">
      <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  ),
  wifi: (on = true) => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={on ? TEAL : SLATE} strokeWidth="1.8">
      <path d="M1.42 9a16 16 0 0 1 21.16 0" />
      <path d="M5 12.55a11 11 0 0 1 14.08 0" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <line x1="12" y1="20" x2="12.01" y2="20" strokeWidth="3" />
    </svg>
  ),
};

// ─── Shared primitives ───────────────────────────────────────────────────────
function SyncStatus({ online = true }: { online?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
      {Ico.wifi(online)}
      <span style={{ fontSize: 11, color: SLATE }}>{online ? "Synced 2 min ago" : "Offline · will sync"}</span>
    </div>
  );
}

function LangSelect({ lang, setLang }: { lang: Language; setLang: (l: Language) => void }) {
  return (
    <select
      value={lang}
      onChange={(e) => setLang(e.target.value as Language)}
      style={{ fontSize: 12, color: SLATE, border: "none", background: "transparent", fontFamily: "'Nunito',sans-serif", cursor: "pointer" }}
    >
      {(["EN","HI","AS","BN"] as Language[]).map((l) => <option key={l}>{l}</option>)}
    </select>
  );
}

function RolePill({ role }: { role: Role }) {
  const labels: Record<Role, string> = { patient: "Patient view", caregiver: "Caregiver view", doctor: "Doctor view", admin: "Admin view" };
  return (
    <span style={{ fontSize: 11, fontWeight: 700, color: TEAL, background: TEAL_LIGHT, borderRadius: 100, padding: "3px 10px" }}>
      {labels[role]}
    </span>
  );
}

function TopBar({
  title, onBack, lang, setLang, right,
}: {
  title?: string; onBack?: () => void; lang: Language; setLang: (l: Language) => void; right?: React.ReactNode;
}) {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 16px", borderBottom:`1px solid #F0F4F4`, background:"white" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        {onBack
          ? <button onClick={onBack} style={{ background:"none", border:"none", cursor:"pointer", padding:2 }}>{Ico.back}</button>
          : <div style={{ display:"flex", alignItems:"center", gap:6 }}>{Ico.leaf}<span style={{ fontWeight:800, fontSize:15, color:TEAL }}>MemorySaathi</span></div>
        }
        {title && <span style={{ fontWeight:700, fontSize:16, color:CHARCOAL }}>{title}</span>}
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        {right}
        <LangSelect lang={lang} setLang={setLang} />
      </div>
    </div>
  );
}

function PrimaryBtn({ label, onClick, wide = true, icon }: { label: string; onClick: () => void; wide?: boolean; icon?: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: wide ? "100%" : "auto",
        display:"flex", alignItems:"center", justifyContent:"center", gap:8,
        background: TEAL, color:"white", borderRadius:14, padding:"14px 20px",
        fontWeight:700, fontSize:16, fontFamily:"'Nunito',sans-serif", border:"none", cursor:"pointer",
      }}
    >
      {icon}{label}
    </button>
  );
}

function SecondaryBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width:"100%", background:"transparent", color:TEAL,
        borderRadius:14, padding:"13px 20px", fontWeight:700, fontSize:15,
        fontFamily:"'Nunito',sans-serif", border:`1.5px solid ${TEAL}`, cursor:"pointer",
      }}
    >
      {label}
    </button>
  );
}

function AnswerBtn({
  label, onClick, state,
}: { label: string; onClick: () => void; state: "idle" | "correct" | "wrong" }) {
  const bg = state === "correct" ? TEAL : state === "wrong" ? "#FEE2E2" : "white";
  const color = state === "correct" ? "white" : state === "wrong" ? "#DC2626" : CHARCOAL;
  const border = state === "correct" ? TEAL : state === "wrong" ? "#FECACA" : "#E5EAEA";
  return (
    <button
      onClick={onClick}
      style={{
        background: bg, color, border:`1.5px solid ${border}`,
        borderRadius:12, padding:"13px 16px", fontSize:15,
        fontWeight:700, fontFamily:"'Nunito',sans-serif", cursor:"pointer",
        textAlign:"left", width:"100%", transition:"background 0.15s",
      }}
    >
      {label}
    </button>
  );
}

function DiffBadge({ diff }: { diff: "Gentle" | "Guided" | "Focused" }) {
  const colors: Record<string, [string, string]> = {
    Gentle:  [TEAL,    `${TEAL}18`],
    Guided:  ["#7C3AED","#7C3AED18"],
    Focused: ["#EA580C","#EA580C18"],
  };
  const [color, bg] = colors[diff];
  return (
    <span style={{ fontSize:11, fontWeight:700, color, background:bg, borderRadius:100, padding:"2px 10px" }}>
      {diff}
    </span>
  );
}

function AIBadge({ text = "AI personalized" }: { text?: string }) {
  return <span style={{ fontSize:10, color:TEAL, fontWeight:600, opacity:0.8 }}>{text}</span>;
}

function BottomNav({
  tabs, active, setActive,
}: {
  tabs: { key: string; label: string; icon: (a: boolean) => React.ReactNode }[];
  active: string;
  setActive: (k: string) => void;
}) {
  return (
    <div style={{ position:"absolute", bottom:0, left:0, right:0, display:"flex", alignItems:"center", justifyContent:"space-around", paddingBottom:16, paddingTop:8, background:"white", borderTop:"1px solid #EFF3F3", zIndex:20 }}>
      {tabs.map((t) => (
        <button key={t.key} onClick={() => setActive(t.key)} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3, border:"none", background:"none", cursor:"pointer" }}>
          {t.icon(active === t.key)}
          <span style={{ fontSize:10, fontWeight:600, color: active === t.key ? TEAL : SLATE, fontFamily:"'Nunito',sans-serif" }}>{t.label}</span>
        </button>
      ))}
    </div>
  );
}

function ProgressRing({ pct, size = 64 }: { pct: number; size?: number }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={TEAL_LIGHT} strokeWidth="7" />
      <circle
        cx={size/2} cy={size/2} r={r} fill="none" stroke={TEAL} strokeWidth="7"
        strokeDasharray={`${circ * pct / 100} ${circ}`}
        strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`}
      />
      <text x={size/2} y={size/2+5} textAnchor="middle" fill={TEAL} fontSize="13" fontWeight="800" fontFamily="Nunito">{pct}%</text>
    </svg>
  );
}

// ─── PhoneFrame ───────────────────────────────────────────────────────────────
function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight:"100vh", background:"#D1D5DB", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ position:"relative", width:390, height:844, borderRadius:44, background:"white", border:"10px solid #1a1a1a", boxShadow:"0 30px 80px rgba(0,0,0,0.4)", fontFamily:"'Nunito',sans-serif", overflow:"hidden" }}>
        {/* Status bar */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"6px 20px 2px", height:40, position:"relative", zIndex:10, background:"white" }}>
          <span style={{ fontSize:13, fontWeight:700, color:CHARCOAL }}>9:41</span>
          <div style={{ display:"flex", alignItems:"center", gap:5 }}>
            {/* Signal bars */}
            <svg width="16" height="10" viewBox="0 0 16 10" fill={CHARCOAL}>
              <rect x="0" y="5" width="2.5" height="5" rx="0.8" />
              <rect x="4" y="3" width="2.5" height="7" rx="0.8" />
              <rect x="8" y="1" width="2.5" height="9" rx="0.8" />
              <rect x="12" y="0" width="2.5" height="10" rx="0.8" />
            </svg>
            {/* Battery */}
            <svg width="24" height="12" viewBox="0 0 24 12" fill="none">
              <rect x="0.5" y="0.5" width="20" height="11" rx="3" stroke={CHARCOAL} />
              <rect x="2" y="2" width="15" height="8" rx="1.5" fill={TEAL} />
              <path d="M22 4v4a2 2 0 0 0 0-4z" fill={CHARCOAL} />
            </svg>
          </div>
        </div>
        {/* Scrollable content */}
        <div style={{ position:"absolute", top:40, bottom:0, left:0, right:0, overflowY:"auto", scrollbarWidth:"none" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SCREEN 1 — Splash
// ══════════════════════════════════════════════════════════════════════════════
function SplashScreen({ onNext }: { onNext: () => void }) {
  return (
    <div style={{ height:"100%", background:"white", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:28, position:"relative" }}>
      <div style={{ textAlign:"center" }}>
        <svg width="88" height="88" viewBox="0 0 88 88" style={{ marginBottom:20 }}>
          <circle cx="44" cy="44" r="44" fill={TEAL_LIGHT} />
          <path d="M44 68C32 68 24 56 24 44c0-10 8-18 20-18 12 0 20 8 20 18 0 12-8 24-20 24z" fill={TEAL} opacity="0.18" stroke={TEAL} strokeWidth="1.8" />
          <path d="M44 68V44M44 44C37 36 28 36 24 44" stroke={TEAL} strokeWidth="1.8" strokeDasharray="3 3" />
          <circle cx="44" cy="44" r="5" fill={TEAL} />
        </svg>
        <h1 style={{ fontWeight:900, fontSize:32, color:CHARCOAL, margin:"0 0 10px", letterSpacing:-0.5 }}>MemorySaathi</h1>
        <p style={{ fontSize:16, color:SLATE, lineHeight:1.6 }}>Your gentle companion for<br />memory and connection.</p>
      </div>
      <div style={{ position:"absolute", bottom:32, left:24, right:24 }}>
        <PrimaryBtn label="Start →" onClick={onNext} />
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SCREEN 2 — Onboarding
// ══════════════════════════════════════════════════════════════════════════════
const ONBOARDING_SLIDES = [
  {
    headline: "Let's Get Started",
    sub: "MemorySaathi gently supports memory, routine, and connection for your loved ones.",
    art: (
      <svg width="240" height="160" viewBox="0 0 240 160" fill="none">
        <ellipse cx="120" cy="140" rx="90" ry="14" fill={TEAL_LIGHT} />
        <rect x="60" y="55" width="55" height="75" rx="10" fill={TEAL} opacity="0.1" stroke={TEAL} strokeWidth="1.5" />
        <rect x="125" y="68" width="50" height="62" rx="10" fill={TEAL_LIGHT} stroke={TEAL} strokeWidth="1.5" />
        <circle cx="87" cy="38" r="20" fill={TEAL_LIGHT} stroke={TEAL} strokeWidth="1.5" />
        <circle cx="150" cy="52" r="16" fill={TEAL_LIGHT} stroke={TEAL} strokeWidth="1.5" />
        <path d="M74 96 Q87 84 100 96" stroke={TEAL} strokeWidth="1.5" fill="none" />
        <path d="M134 108 Q150 96 166 108" stroke={TEAL} strokeWidth="1.5" fill="none" />
      </svg>
    ),
  },
  {
    headline: "Your Memories, Personalized",
    sub: "Store photos, voices, and faces so the AI can gently bring familiar memories into each session.",
    art: (
      <svg width="240" height="160" viewBox="0 0 240 160" fill="none">
        <rect x="40" y="24" width="64" height="86" rx="12" fill={TEAL_LIGHT} stroke={TEAL} strokeWidth="1.5" />
        <rect x="56" y="40" width="32" height="32" rx="6" fill={TEAL} opacity="0.2" />
        <rect x="56" y="80" width="32" height="6" rx="3" fill={TEAL} opacity="0.4" />
        <rect x="56" y="90" width="22" height="5" rx="2.5" fill={TEAL} opacity="0.25" />
        <rect x="120" y="44" width="80" height="56" rx="12" fill="white" stroke={TEAL} strokeWidth="1.5" />
        <circle cx="148" cy="64" r="10" fill={TEAL_LIGHT} stroke={TEAL} strokeWidth="1" />
        <path d="M132 80 l14-12 14 12 14-12 6 6" stroke={TEAL} strokeWidth="1.5" fill="none" />
        <text x="160" y="144" fill={TEAL} fontSize="11" textAnchor="middle" fontFamily="Nunito" fontWeight="700">AI personalized</text>
        <path d="M104 70 L120 70" stroke={TEAL} strokeWidth="1.5" strokeDasharray="3 3" />
      </svg>
    ),
  },
  {
    headline: "Family and Doctors, Together",
    sub: "Caregivers and clinicians get a calm real-time view of engagement — without any diagnostic claims.",
    art: (
      <svg width="240" height="160" viewBox="0 0 240 160" fill="none">
        <rect x="20" y="30" width="80" height="100" rx="12" fill={TEAL_LIGHT} stroke={TEAL} strokeWidth="1.5" />
        <rect x="36" y="48" width="48" height="8" rx="4" fill={TEAL} opacity="0.3" />
        <rect x="36" y="62" width="36" height="5" rx="2.5" fill={TEAL} opacity="0.2" />
        <rect x="36" y="74" width="48" height="36" rx="6" fill={TEAL} opacity="0.12" />
        <path d="M36 90 l10-12 12 10 10-8 16 10" stroke={TEAL} strokeWidth="1.5" fill="none" />
        <rect x="140" y="30" width="80" height="100" rx="12" fill="white" stroke={TEAL} strokeWidth="1.5" />
        <rect x="156" y="48" width="48" height="8" rx="4" fill={TEAL} opacity="0.3" />
        <rect x="156" y="62" width="36" height="5" rx="2.5" fill={TEAL} opacity="0.2" />
        <rect x="156" y="74" width="48" height="36" rx="6" fill={TEAL_LIGHT} stroke={TEAL} strokeWidth="1" opacity="0.8" />
        <path d="M156 90 l12-8 12 8 12-8 12 8" stroke={TEAL} strokeWidth="1.5" fill="none" />
      </svg>
    ),
  },
];

function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const [slide, setSlide] = useState(0);
  const s = ONBOARDING_SLIDES[slide];
  return (
    <div style={{ height:"100%", background:"white", display:"flex", flexDirection:"column" }}>
      <div style={{ display:"flex", justifyContent:"flex-end", padding:"12px 16px" }}>
        <button onClick={onDone} style={{ fontSize:14, color:SLATE, background:"none", border:"none", cursor:"pointer", fontFamily:"'Nunito',sans-serif" }}>Skip</button>
      </div>
      <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"0 32px", gap:24 }}>
        {s.art}
        <div style={{ textAlign:"center" }}>
          <h2 style={{ fontWeight:900, fontSize:26, color:CHARCOAL, marginBottom:10 }}>{s.headline}</h2>
          <p style={{ fontSize:15, color:SLATE, lineHeight:1.7 }}>{s.sub}</p>
        </div>
      </div>
      <div style={{ display:"flex", justifyContent:"center", gap:8, paddingBottom:12 }}>
        {ONBOARDING_SLIDES.map((_, i) => (
          <div key={i} style={{ width:i===slide?20:7, height:7, borderRadius:100, background:i===slide?TEAL:TEAL_LIGHT, transition:"all 0.2s" }} />
        ))}
      </div>
      <div style={{ padding:"0 24px 32px" }}>
        <PrimaryBtn label={slide < 2 ? "Next →" : "Get Started"} onClick={() => slide < 2 ? setSlide(slide+1) : onDone()} />
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SCREEN 3 — Login
// ══════════════════════════════════════════════════════════════════════════════
const ROLE_CONFIG: { key: Role; label: string; icon: React.ReactNode }[] = [
  { key:"patient",   label:"Patient",   icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> },
  { key:"caregiver", label:"Caregiver", icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
  { key:"doctor",    label:"Doctor",    icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M12 8v8M8 12h8"/></svg> },
  { key:"admin",     label:"Admin",     icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> },
];

function LoginScreen({ lang, setLang, onLogin }: { lang: Language; setLang: (l: Language) => void; onLogin: (r: Role) => void }) {
  const [selectedRole, setSelectedRole] = useState<Role>("patient");
  const [showPw, setShowPw] = useState(false);
  return (
    <div style={{ height:"100%", background:"white", display:"flex", flexDirection:"column" }}>
      <TopBar lang={lang} setLang={setLang} />
      <div style={{ flex:1, overflowY:"auto", padding:"20px 20px 32px", scrollbarWidth:"none" }}>
        <h1 style={{ fontWeight:900, fontSize:26, color:CHARCOAL, marginBottom:4 }}>Welcome Back</h1>
        <p style={{ fontSize:15, color:SLATE, marginBottom:24 }}>Let's continue your journey.</p>

        <p style={{ fontSize:13, fontWeight:700, color:CHARCOAL, marginBottom:10 }}>I am a —</p>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:24 }}>
          {ROLE_CONFIG.map((r) => {
            const sel = selectedRole === r.key;
            return (
              <button key={r.key} onClick={() => setSelectedRole(r.key)} style={{ background:sel?TEAL:"white", color:sel?"white":CHARCOAL, border:`1.5px solid ${sel?TEAL:"#E5EAEA"}`, borderRadius:14, padding:"14px 12px", display:"flex", alignItems:"center", gap:10, fontFamily:"'Nunito',sans-serif", fontWeight:700, fontSize:14, cursor:"pointer", position:"relative" }}>
                <span style={{ opacity:sel?1:0.6, display:"flex", color:sel?"white":CHARCOAL }}>{r.icon}</span>
                {r.label}
                {sel && <span style={{ position:"absolute", top:8, right:8 }}>{Ico.check("white", 14)}</span>}
              </button>
            );
          })}
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:14, marginBottom:24 }}>
          <div>
            <label style={{ fontSize:13, fontWeight:700, color:CHARCOAL, display:"block", marginBottom:6 }}>Patient ID, mobile or email</label>
            <input defaultValue="priya.sharma@example.com" style={{ width:"100%", border:"1.5px solid #E5EAEA", borderRadius:12, padding:"13px 16px", fontSize:15, fontFamily:"'Nunito',sans-serif", color:CHARCOAL, boxSizing:"border-box" }} />
          </div>
          <div>
            <label style={{ fontSize:13, fontWeight:700, color:CHARCOAL, display:"block", marginBottom:6 }}>Password or PIN</label>
            <div style={{ position:"relative" }}>
              <input type={showPw?"text":"password"} defaultValue="1234" style={{ width:"100%", border:"1.5px solid #E5EAEA", borderRadius:12, padding:"13px 44px 13px 16px", fontSize:15, fontFamily:"'Nunito',sans-serif", color:CHARCOAL, boxSizing:"border-box" }} />
              <button onClick={() => setShowPw(!showPw)} style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer" }}>{Ico.eye}</button>
            </div>
          </div>
        </div>

        <PrimaryBtn label="Sign in securely →" onClick={() => onLogin(selectedRole)} />
        <p style={{ fontSize:11, color:SLATE, textAlign:"center", marginTop:10 }}>Demo access works offline · Secure role-based access</p>
        <div style={{ display:"flex", justifyContent:"space-between", marginTop:14 }}>
          <button style={{ fontSize:13, color:TEAL, background:"none", border:"none", fontFamily:"'Nunito',sans-serif", cursor:"pointer", fontWeight:600 }}>Forgot password?</button>
          <button style={{ fontSize:13, color:TEAL, background:"none", border:"none", fontFamily:"'Nunito',sans-serif", cursor:"pointer", fontWeight:600 }}>New patient setup</button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// GAME ENGINE — individual mechanics per activity
// ══════════════════════════════════════════════════════════════════════════════

interface GameProps {
  activity: Activity;
  difficulty: "Gentle" | "Guided" | "Focused";
  onComplete: (result: { accuracy: number; hintsUsed: number }) => void;
  onBack: () => void;
}

// Shared game shell
function GameShell({ activity, stepIndex, totalSteps, children, onBack, encouragement }: {
  activity: Activity; stepIndex: number; totalSteps: number; children: React.ReactNode; onBack: () => void; encouragement: string;
}) {
  return (
    <div style={{ height:"100%", background:"#F7FAFA", display:"flex", flexDirection:"column" }}>
      <div style={{ background:"white", padding:"12px 16px 10px", borderBottom:"1px solid #F0F4F4" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
          <button onClick={onBack} style={{ background:"none", border:"none", cursor:"pointer" }}>{Ico.back}</button>
          <span style={{ fontWeight:700, fontSize:14, color:CHARCOAL }}>{activity.name}</span>
          <span style={{ fontSize:12, color:SLATE }}>{activity.time}</span>
        </div>
        <div style={{ display:"flex", gap:6 }}>
          {Array.from({length:totalSteps}).map((_,i) => (
            <div key={i} style={{ flex:1, height:6, borderRadius:100, background:i<stepIndex?TEAL:i===stepIndex?TEAL_LIGHT:"#EAEAEA", transition:"background 0.2s" }} />
          ))}
        </div>
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:"20px 18px 16px", scrollbarWidth:"none" }}>
        {children}
      </div>
      <div style={{ background:TEAL_LIGHT, padding:"12px 20px", textAlign:"center" }}>
        <p style={{ fontSize:13, color:TEAL, fontWeight:600 }}>{encouragement}</p>
      </div>
    </div>
  );
}

// Utility: use answer state
function useAnswer(correct: string, onCorrect: () => void, onWrong?: () => void) {
  const [state, setState] = useState<Record<string, "idle"|"correct"|"wrong">>({});
  const [done, setDone] = useState(false);
  const check = useCallback((chosen: string) => {
    if (done) return;
    const isRight = chosen === correct;
    setState({ [chosen]: isRight ? "correct" : "wrong" });
    setDone(true);
    setTimeout(() => { setState({}); setDone(false); if (isRight) onCorrect(); else if (onWrong) onWrong(); }, 700);
  }, [correct, done, onCorrect, onWrong]);
  return { state, check, done };
}

// ── Family Recall ─────────────────────────────────────────────────────────────
const RECALL_QUESTIONS = [
  { face:"👴", name:"Rahul", role:"Son",     options:["Rahul (Son)","Deepak (Uncle)","Suresh (Friend)","Mohan (Neighbour)"] },
  { face:"👩", name:"Meena", role:"Daughter", options:["Priya (Friend)","Meena (Daughter)","Radha (Sister)","Anita (Nurse)"] },
  { face:"👨", name:"Suresh",role:"Husband",  options:["Ramesh (Doctor)","Suresh (Husband)","Anil (Cousin)","Dev (Friend)"] },
];

function FamilyRecallGame({ activity, difficulty, onComplete, onBack }: GameProps) {
  const [q, setQ] = useState(0);
  const [hints, setHints] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [correct, setCorrect] = useState(0);
  const total = RECALL_QUESTIONS.length;
  const cur = RECALL_QUESTIONS[q];
  const { state, check } = useAnswer(`${cur.name} (${cur.role})`, () => {
    const next = q + 1;
    setShowHint(false);
    if (next >= total) { onComplete({ accuracy: Math.round(((correct+1)/total)*100), hintsUsed: hints }); }
    else { setQ(next); setCorrect(c=>c+1); }
  }, () => {});

  return (
    <GameShell activity={activity} stepIndex={q} totalSteps={total} onBack={onBack} encouragement="Take your time — there's no rush. 🌿">
      <div style={{ background:TEAL, borderRadius:20, height:160, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:18 }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:72 }}>{cur.face}</div>
          <p style={{ color:"rgba(255,255,255,0.7)", fontSize:12, marginTop:6 }}>Photo from memory bank</p>
        </div>
      </div>
      <h3 style={{ fontWeight:800, fontSize:22, color:CHARCOAL, textAlign:"center", marginBottom:16 }}>Who is this?</h3>
      {showHint && (
        <div style={{ background:AMBER_BG, borderRadius:12, padding:"10px 14px", marginBottom:12, fontSize:13, color:"#92400E" }}>
          💡 Hint: Think of the person you see most mornings.
        </div>
      )}
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {cur.options.map((o) => <AnswerBtn key={o} label={o} onClick={() => check(o)} state={state[o]||"idle"} />)}
      </div>
      <div style={{ display:"flex", gap:10, marginTop:14 }}>
        <button onClick={() => { setShowHint(true); setHints(h=>h+1); }} style={{ flex:1, background:TEAL_LIGHT, color:TEAL, border:"none", borderRadius:10, padding:"10px 16px", fontWeight:700, fontSize:13, fontFamily:"'Nunito',sans-serif", cursor:"pointer" }}>💡 Hint</button>
        {Ico.mic()}
      </div>
    </GameShell>
  );
}

// ── Who Is This? ──────────────────────────────────────────────────────────────
const WHO_QUESTIONS = [
  { clue:"She visits every Sunday and brings your favourite sweets.", face:"👩‍🦱", answer:"Radha — Neighbour", options:["Radha — Neighbour","Anita — Sister","Meena — Daughter","Priya — Friend"] },
  { clue:"He wears a white coat and checks your blood pressure each month.", face:"👨‍⚕️", answer:"Dr. Deepak — Doctor", options:["Rahul — Son","Dr. Deepak — Doctor","Suresh — Husband","Mohan — Uncle"] },
  { clue:"She grew up in the same house as you and knows all your childhood stories.", face:"👩‍🦳", answer:"Anita — Sister", options:["Anita — Sister","Radha — Neighbour","Kavya — Niece","Meena — Daughter"] },
];

function WhoIsThisGame({ activity, difficulty, onComplete, onBack }: GameProps) {
  const [q, setQ] = useState(0);
  const [hints, setHints] = useState(0);
  const [correct, setCorrect] = useState(0);
  const total = WHO_QUESTIONS.length;
  const cur = WHO_QUESTIONS[q];
  const { state, check } = useAnswer(cur.answer, () => {
    const next = q + 1;
    if (next >= total) onComplete({ accuracy: Math.round(((correct+1)/total)*100), hintsUsed: hints });
    else { setQ(next); setCorrect(c=>c+1); }
  });
  return (
    <GameShell activity={activity} stepIndex={q} totalSteps={total} onBack={onBack} encouragement="You're doing wonderfully. 🌿">
      <div style={{ background:TEAL_LIGHT, borderRadius:18, padding:"20px", textAlign:"center", marginBottom:18 }}>
        <div style={{ fontSize:60 }}>{cur.face}</div>
        <p style={{ fontSize:13, color:TEAL, fontWeight:600, marginTop:10, lineHeight:1.6 }}>{cur.clue}</p>
      </div>
      <h3 style={{ fontWeight:800, fontSize:20, color:CHARCOAL, textAlign:"center", marginBottom:14 }}>Who is this person?</h3>
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {cur.options.map((o) => <AnswerBtn key={o} label={o} onClick={() => check(o)} state={state[o]||"idle"} />)}
      </div>
    </GameShell>
  );
}

// ── Relationship Match ────────────────────────────────────────────────────────
const REL_PAIRS = [
  { name:"Rahul",  rel:"Son" },
  { name:"Meena",  rel:"Daughter" },
  { name:"Suresh", rel:"Husband" },
  { name:"Anita",  rel:"Sister" },
];

function RelationshipMatchGame({ activity, difficulty, onComplete, onBack }: GameProps) {
  const [selected, setSelected] = useState<string|null>(null);
  const [matched, setMatched] = useState<Record<string,string>>({});
  const [wrong, setWrong] = useState<string|null>(null);
  const [hints, setHints] = useState(0);
  const rels = REL_PAIRS.map(p=>p.rel).sort(() => Math.random() > 0.5 ? 1 : -1);
  const [shuffledRels] = useState(rels);

  const handleName = (name: string) => { if (matched[name]) return; setSelected(name); };
  const handleRel = (rel: string) => {
    if (!selected) return;
    const correct = REL_PAIRS.find(p=>p.name===selected)?.rel;
    if (correct === rel) {
      const nm = { ...matched, [selected]: rel };
      setMatched(nm);
      setSelected(null);
      if (Object.keys(nm).length === REL_PAIRS.length) onComplete({ accuracy: Math.round(((REL_PAIRS.length - hints)/REL_PAIRS.length)*100), hintsUsed: hints });
    } else {
      setWrong(selected+rel);
      setTimeout(() => { setWrong(null); setSelected(null); }, 700);
    }
  };

  const matchedRels = Object.values(matched);

  return (
    <GameShell activity={activity} stepIndex={Object.keys(matched).length} totalSteps={REL_PAIRS.length} onBack={onBack} encouragement="Match each person to their relationship. 🌿">
      <h3 style={{ fontWeight:800, fontSize:20, color:CHARCOAL, textAlign:"center", marginBottom:6 }}>Who is related how?</h3>
      <p style={{ fontSize:13, color:SLATE, textAlign:"center", marginBottom:20 }}>Tap a name, then tap their relationship.</p>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <p style={{ fontSize:11, fontWeight:700, color:SLATE, textTransform:"uppercase", letterSpacing:0.5 }}>Names</p>
          {REL_PAIRS.map(p => {
            const done = !!matched[p.name];
            const sel = selected === p.name;
            return (
              <button key={p.name} onClick={() => handleName(p.name)} style={{ background:done?TEAL_LIGHT:sel?TEAL:"white", color:done?TEAL:sel?"white":CHARCOAL, border:`1.5px solid ${done?TEAL:sel?TEAL:"#E5EAEA"}`, borderRadius:12, padding:"12px", fontSize:14, fontWeight:700, fontFamily:"'Nunito',sans-serif", cursor:done?"default":"pointer" }}>
                {done && <span style={{ marginRight:6 }}>✓</span>}{p.name}
              </button>
            );
          })}
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <p style={{ fontSize:11, fontWeight:700, color:SLATE, textTransform:"uppercase", letterSpacing:0.5 }}>Relationships</p>
          {shuffledRels.map(r => {
            const done = matchedRels.includes(r);
            const isWrong = wrong?.endsWith(r);
            return (
              <button key={r} onClick={() => handleRel(r)} style={{ background:done?TEAL_LIGHT:isWrong?"#FEE2E2":"white", color:done?TEAL:isWrong?"#DC2626":CHARCOAL, border:`1.5px solid ${done?TEAL:isWrong?"#FECACA":"#E5EAEA"}`, borderRadius:12, padding:"12px", fontSize:14, fontWeight:700, fontFamily:"'Nunito',sans-serif", cursor:done?"default":"pointer" }}>
                {done && <span style={{ marginRight:6 }}>✓</span>}{r}
              </button>
            );
          })}
        </div>
      </div>
    </GameShell>
  );
}

// ── Focus & Find ──────────────────────────────────────────────────────────────
const FOCUS_ROUNDS = [
  { target:"🍎 Apple",  grid:["🍎","📚","☕","✂️","🌺","🔑","🎶","🍎","🕯️"] },
  { target:"🔑 Key",    grid:["🌺","🔑","☕","🍎","📚","✂️","🕯️","🎶","🔑"] },
  { target:"📚 Book",   grid:["☕","🌺","📚","🔑","🍎","🎶","✂️","📚","🕯️"] },
];

function FocusFindGame({ activity, difficulty, onComplete, onBack }: GameProps) {
  const [round, setRound] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [picked, setPicked] = useState<number|null>(null);
  const total = FOCUS_ROUNDS.length;
  const cur = FOCUS_ROUNDS[round];
  const targetEmoji = cur.target.split(" ")[0];

  const handleTap = (emoji: string, i: number) => {
    if (picked !== null) return;
    setPicked(i);
    const isRight = emoji === targetEmoji;
    if (isRight) {
      setTimeout(() => {
        const next = round + 1;
        setPicked(null);
        if (next >= total) onComplete({ accuracy: Math.round(((correct+1)/total)*100), hintsUsed: 0 });
        else { setRound(next); setCorrect(c=>c+1); }
      }, 600);
    } else {
      setTimeout(() => setPicked(null), 600);
    }
  };

  return (
    <GameShell activity={activity} stepIndex={round} totalSteps={total} onBack={onBack} encouragement="Look carefully — you've got this! 🌿">
      <div style={{ background:TEAL, borderRadius:16, padding:"16px 20px", marginBottom:18, textAlign:"center" }}>
        <p style={{ color:"rgba(255,255,255,0.8)", fontSize:13, marginBottom:6 }}>Find this item in the grid</p>
        <p style={{ fontSize:30 }}>{cur.target}</p>
      </div>
      <h3 style={{ fontWeight:800, fontSize:18, color:CHARCOAL, textAlign:"center", marginBottom:14 }}>Tap every {targetEmoji} you see</h3>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
        {cur.grid.map((emoji, i) => {
          const isTarget = emoji === targetEmoji;
          const isPicked = picked === i;
          return (
            <button key={i} onClick={() => handleTap(emoji, i)} style={{ background:isPicked?(isTarget?TEAL_LIGHT:"#FEE2E2"):TEAL_LIGHT, border:`2px solid ${isPicked?(isTarget?TEAL:"#FECACA"):TEAL_LIGHT}`, borderRadius:14, height:72, fontSize:32, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
              {emoji}
            </button>
          );
        })}
      </div>
    </GameShell>
  );
}

// ── What's Missing? ───────────────────────────────────────────────────────────
const MISSING_ROUNDS = [
  { scene:["📚 Book","☕ Mug","✂️ Scissors","🍎 Apple"], removed:"🍎 Apple",  options:["🍎 Apple","🌺 Flower","🔑 Key","🕯️ Candle"] },
  { scene:["🍎 Apple","🔑 Key","🌺 Flower","📚 Book"],  removed:"🌺 Flower", options:["☕ Mug","🌺 Flower","✂️ Scissors","🎶 Music"] },
  { scene:["☕ Mug","✂️ Scissors","🕯️ Candle","🔑 Key"], removed:"🕯️ Candle", options:["🍎 Apple","📚 Book","🕯️ Candle","🌺 Flower"] },
];

function WhatsMissingGame({ activity, difficulty, onComplete, onBack }: GameProps) {
  const [r, setR] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [hints, setHints] = useState(0);
  const total = MISSING_ROUNDS.length;
  const cur = MISSING_ROUNDS[r];
  const { state, check } = useAnswer(cur.removed, () => {
    const next = r + 1;
    if (next >= total) onComplete({ accuracy: Math.round(((correct+1)/total)*100), hintsUsed: hints });
    else { setR(next); setCorrect(c=>c+1); }
  });

  return (
    <GameShell activity={activity} stepIndex={r} totalSteps={total} onBack={onBack} encouragement="One missing item — you'll find it! 🌿">
      <h3 style={{ fontWeight:800, fontSize:20, color:CHARCOAL, textAlign:"center", marginBottom:4 }}>Which one is missing?</h3>
      <p style={{ fontSize:13, color:SLATE, textAlign:"center", marginBottom:16 }}>One item was quietly removed.</p>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:20 }}>
        {[...cur.scene, ""].map((item, i) => (
          <div key={i} style={{ background:item?TEAL_LIGHT:"#F3F4F6", borderRadius:14, height:80, display:"flex", alignItems:"center", justifyContent:"center", border:`2px dashed ${item?TEAL:"#D1D5DB"}`, fontSize:item?26:22, color:item?CHARCOAL:SLATE }}>
            {item || "?"}
          </div>
        ))}
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {cur.options.map((o) => <AnswerBtn key={o} label={o} onClick={() => check(o)} state={state[o]||"idle"} />)}
      </div>
    </GameShell>
  );
}

// ── Daily Orientation ─────────────────────────────────────────────────────────
const ORIENT_QUESTIONS = [
  { q:"What day is it today?",                  answer:"Wednesday",      options:["Monday","Tuesday","Wednesday","Thursday"] },
  { q:"What time of day is it right now?",       answer:"Morning",        options:["Morning","Afternoon","Evening","Night"] },
  { q:"Where are you at this moment?",           answer:"Home",           options:["Hospital","Home","Market","Doctor's clinic"] },
  { q:"What is the next activity on your list?", answer:"Activity session",options:["Lunch","Rest","Activity session","Evening walk"] },
];

function DailyOrientationGame({ activity, difficulty, onComplete, onBack }: GameProps) {
  const [q, setQ] = useState(0);
  const [hints, setHints] = useState(0);
  const [correct, setCorrect] = useState(0);
  const total = ORIENT_QUESTIONS.length;
  const cur = ORIENT_QUESTIONS[q];
  const { state, check } = useAnswer(cur.answer, () => {
    const next = q + 1;
    if (next >= total) onComplete({ accuracy: Math.round(((correct+1)/total)*100), hintsUsed: hints });
    else { setQ(next); setCorrect(c=>c+1); }
  });

  return (
    <GameShell activity={activity} stepIndex={q} totalSteps={total} onBack={onBack} encouragement="Grounding yourself in the present — wonderful. 🌿">
      <div style={{ background:TEAL_LIGHT, borderRadius:18, padding:"24px 20px", textAlign:"center", marginBottom:20 }}>
        <div style={{ fontSize:40, marginBottom:10 }}>🗓️</div>
        <p style={{ fontSize:13, color:TEAL, fontWeight:700 }}>Wednesday, 4 September 2026 · 11:00 AM</p>
        <p style={{ fontSize:12, color:SLATE, marginTop:4 }}>Location: Home · Next: Activity session</p>
      </div>
      <h3 style={{ fontWeight:800, fontSize:20, color:CHARCOAL, textAlign:"center", marginBottom:16 }}>{cur.q}</h3>
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {cur.options.map((o) => <AnswerBtn key={o} label={o} onClick={() => check(o)} state={state[o]||"idle"} />)}
      </div>
    </GameShell>
  );
}

// ── Routine Next ──────────────────────────────────────────────────────────────
const ROUTINE = ["Breakfast","Medication","Morning walk","Activity session","Lunch","Rest","Evening walk","Dinner"];
const ROUTINE_QS = [
  { current:"Breakfast",       answer:"Medication",      options:["Medication","Lunch","Morning walk","Rest"] },
  { current:"Morning walk",    answer:"Activity session", options:["Activity session","Dinner","Lunch","Rest"] },
  { current:"Activity session",answer:"Lunch",           options:["Dinner","Lunch","Evening walk","Rest"] },
];

function RoutineNextGame({ activity, difficulty, onComplete, onBack }: GameProps) {
  const [q, setQ] = useState(0);
  const [correct, setCorrect] = useState(0);
  const total = ROUTINE_QS.length;
  const cur = ROUTINE_QS[q];
  const { state, check } = useAnswer(cur.answer, () => {
    const next = q + 1;
    if (next >= total) onComplete({ accuracy: Math.round(((correct+1)/total)*100), hintsUsed: 0 });
    else { setQ(next); setCorrect(c=>c+1); }
  });

  return (
    <GameShell activity={activity} stepIndex={q} totalSteps={total} onBack={onBack} encouragement="Your routine is your anchor. 🌿">
      <h3 style={{ fontWeight:800, fontSize:20, color:CHARCOAL, textAlign:"center", marginBottom:6 }}>What comes next?</h3>
      <p style={{ fontSize:13, color:SLATE, textAlign:"center", marginBottom:18 }}>In your daily routine</p>
      <div style={{ background:TEAL, borderRadius:16, padding:"20px", textAlign:"center", marginBottom:20 }}>
        <p style={{ color:"rgba(255,255,255,0.7)", fontSize:12, marginBottom:6 }}>You just finished —</p>
        <p style={{ fontWeight:800, fontSize:22, color:"white" }}>{cur.current}</p>
      </div>
      <p style={{ fontWeight:700, fontSize:16, color:CHARCOAL, textAlign:"center", marginBottom:14 }}>What's next on your routine?</p>
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {cur.options.map((o) => <AnswerBtn key={o} label={o} onClick={() => check(o)} state={state[o]||"idle"} />)}
      </div>
    </GameShell>
  );
}

// ── Category Sort ─────────────────────────────────────────────────────────────
const SORT_ITEMS = [
  { emoji:"🍎", label:"Apple",    cat:"Food" },
  { emoji:"🛋️", label:"Sofa",     cat:"Home" },
  { emoji:"🌺", label:"Flower",   cat:"Nature" },
  { emoji:"🍚", label:"Rice",     cat:"Food" },
  { emoji:"🪑", label:"Chair",    cat:"Home" },
  { emoji:"🌿", label:"Leaf",     cat:"Nature" },
  { emoji:"☕", label:"Tea",      cat:"Food" },
  { emoji:"📺", label:"TV",       cat:"Home" },
  { emoji:"🐦", label:"Bird",     cat:"Nature" },
];
const CATS = ["Food","Home","Nature"];

function CategorySortGame({ activity, difficulty, onComplete, onBack }: GameProps) {
  const [idx, setIdx] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [flash, setFlash] = useState<"ok"|"err"|null>(null);
  const total = SORT_ITEMS.length;
  const cur = SORT_ITEMS[idx];

  const handleCat = (cat: string) => {
    const isRight = cat === cur.cat;
    setFlash(isRight ? "ok" : "err");
    setTimeout(() => {
      setFlash(null);
      const next = idx + 1;
      if (next >= total) onComplete({ accuracy: Math.round(((isRight?correct+1:correct)/total)*100), hintsUsed: 0 });
      else { setIdx(next); if (isRight) setCorrect(c=>c+1); }
    }, 600);
  };

  return (
    <GameShell activity={activity} stepIndex={idx} totalSteps={total} onBack={onBack} encouragement="Sort by what feels right to you. 🌿">
      <h3 style={{ fontWeight:800, fontSize:20, color:CHARCOAL, textAlign:"center", marginBottom:6 }}>Sort into categories</h3>
      <p style={{ fontSize:13, color:SLATE, textAlign:"center", marginBottom:20 }}>Which group does this belong to?</p>
      <div style={{ background:flash==="ok"?TEAL_LIGHT:flash==="err"?"#FEE2E2":TEAL_LIGHT, borderRadius:20, height:140, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", marginBottom:24, border:`2px solid ${flash==="ok"?TEAL:flash==="err"?"#FECACA":TEAL_LIGHT}`, transition:"background 0.2s" }}>
        <span style={{ fontSize:60 }}>{cur.emoji}</span>
        <p style={{ fontWeight:700, fontSize:18, color:CHARCOAL, marginTop:8 }}>{cur.label}</p>
      </div>
      <div style={{ display:"flex", gap:10 }}>
        {CATS.map((cat) => (
          <button key={cat} onClick={() => handleCat(cat)} style={{ flex:1, background:TEAL_LIGHT, color:TEAL, border:`1.5px solid ${TEAL}`, borderRadius:14, padding:"16px 8px", fontWeight:700, fontSize:15, fontFamily:"'Nunito',sans-serif", cursor:"pointer" }}>
            {cat}
          </button>
        ))}
      </div>
      <p style={{ textAlign:"center", fontSize:12, color:SLATE, marginTop:14 }}>{idx + 1} of {total} items</p>
    </GameShell>
  );
}

// ── Word Association ──────────────────────────────────────────────────────────
const WORD_QS = [
  { prompt:"Cup of ___",  answer:"Tea",    options:["Tea","Rice","Rain","Walk"] },
  { prompt:"Morning ___", answer:"Walk",   options:["Walk","Sleep","Book","Music"] },
  { prompt:"Family ___",  answer:"Home",   options:["Home","Work","Garden","Market"] },
  { prompt:"___ and rest",answer:"Sleep",  options:["Sleep","Eat","Walk","Talk"] },
];

function WordAssociationGame({ activity, difficulty, onComplete, onBack }: GameProps) {
  const [q, setQ] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [micActive, setMicActive] = useState(false);
  const total = WORD_QS.length;
  const cur = WORD_QS[q];
  const { state, check } = useAnswer(cur.answer, () => {
    const next = q + 1;
    if (next >= total) onComplete({ accuracy: Math.round(((correct+1)/total)*100), hintsUsed: 0 });
    else { setQ(next); setCorrect(c=>c+1); setMicActive(false); }
  });

  return (
    <GameShell activity={activity} stepIndex={q} totalSteps={total} onBack={onBack} encouragement="Words that belong together. 🌿">
      <div style={{ background:TEAL_LIGHT, borderRadius:20, padding:"28px 20px", textAlign:"center", marginBottom:20 }}>
        <p style={{ fontSize:13, color:TEAL, fontWeight:600, marginBottom:8 }}>Complete the familiar phrase</p>
        <p style={{ fontWeight:900, fontSize:28, color:CHARCOAL }}>{cur.prompt}</p>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:16 }}>
        {cur.options.map((o) => <AnswerBtn key={o} label={o} onClick={() => check(o)} state={state[o]||"idle"} />)}
      </div>
      <div style={{ display:"flex", justifyContent:"center" }}>
        <button onClick={() => setMicActive(!micActive)} style={{ background:micActive?TEAL:TEAL_LIGHT, border:`1.5px solid ${TEAL}`, borderRadius:50, width:56, height:56, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
          {Ico.mic(micActive?"white":TEAL)}
        </button>
      </div>
      {micActive && <p style={{ textAlign:"center", fontSize:12, color:TEAL, marginTop:8, fontWeight:600 }}>Listening... say your answer</p>}
    </GameShell>
  );
}

// ── Sound Recognition ─────────────────────────────────────────────────────────
const SOUND_QS = [
  { sound:"🔔", desc:"A gentle ringing sound", answer:"Doorbell",  options:["Doorbell","Alarm clock","Phone ringing","Wind chimes"] },
  { sound:"🐦", desc:"A melodic chirping",      answer:"Bird",     options:["Bird","Cricket","Dog","Cat"] },
  { sound:"🌧️", desc:"A soft pattering rhythm", answer:"Rain",     options:["Rain","Stream","Clapping","Wind"] },
  { sound:"☕", desc:"A bubbling, rising sound", answer:"Kettle boiling", options:["Kettle boiling","Water tap","Washing machine","Pressure cooker"] },
];

function SoundRecognitionGame({ activity, difficulty, onComplete, onBack }: GameProps) {
  const [q, setQ] = useState(0);
  const [played, setPlayed] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [micActive, setMicActive] = useState(false);
  const total = SOUND_QS.length;
  const cur = SOUND_QS[q];
  const { state, check } = useAnswer(cur.answer, () => {
    const next = q + 1;
    if (next >= total) onComplete({ accuracy: Math.round(((correct+1)/total)*100), hintsUsed: 0 });
    else { setQ(next); setCorrect(c=>c+1); setPlayed(false); setMicActive(false); }
  });

  return (
    <GameShell activity={activity} stepIndex={q} totalSteps={total} onBack={onBack} encouragement="Listen carefully — trust your memory. 🌿">
      <h3 style={{ fontWeight:800, fontSize:20, color:CHARCOAL, textAlign:"center", marginBottom:20 }}>What made this sound?</h3>
      <div style={{ display:"flex", justifyContent:"center", marginBottom:16 }}>
        <button onClick={() => setPlayed(true)} style={{ background:TEAL, border:"none", borderRadius:50, width:80, height:80, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:4, cursor:"pointer" }}>
          <span style={{ fontSize:32 }}>{cur.sound}</span>
        </button>
      </div>
      <p style={{ textAlign:"center", fontSize:13, color:TEAL, fontWeight:600, marginBottom:6 }}>
        {played ? `"${cur.desc}"` : "Tap to hear the sound"}
      </p>
      {played && (
        <>
          <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:14, marginTop:12 }}>
            {cur.options.map((o) => <AnswerBtn key={o} label={o} onClick={() => check(o)} state={state[o]||"idle"} />)}
          </div>
          <div style={{ display:"flex", justifyContent:"center" }}>
            <button onClick={() => setMicActive(!micActive)} style={{ background:micActive?TEAL:TEAL_LIGHT, border:`1.5px solid ${TEAL}`, borderRadius:50, width:48, height:48, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
              {Ico.mic(micActive?"white":TEAL)}
            </button>
          </div>
          {micActive && <p style={{ textAlign:"center", fontSize:12, color:TEAL, marginTop:6, fontWeight:600 }}>Listening... say the answer</p>}
        </>
      )}
    </GameShell>
  );
}

// ── Game router ───────────────────────────────────────────────────────────────
function GameRouter({ activity, aiState, onComplete, onBack }: {
  activity: Activity; aiState: AIState;
  onComplete: (result: { accuracy: number; hintsUsed: number }) => void;
  onBack: () => void;
}) {
  const diff = adaptedDifficulty(activity.domain, aiState);
  const props: GameProps = { activity, difficulty: diff, onComplete, onBack };
  switch (activity.key) {
    case "family-recall":      return <FamilyRecallGame      {...props} />;
    case "who-is-this":        return <WhoIsThisGame         {...props} />;
    case "relationship-match": return <RelationshipMatchGame  {...props} />;
    case "focus-find":         return <FocusFindGame          {...props} />;
    case "whats-missing":      return <WhatsMissingGame       {...props} />;
    case "daily-orientation":  return <DailyOrientationGame   {...props} />;
    case "routine-next":       return <RoutineNextGame         {...props} />;
    case "category-sort":      return <CategorySortGame        {...props} />;
    case "word-association":   return <WordAssociationGame     {...props} />;
    case "sound-recognition":  return <SoundRecognitionGame    {...props} />;
    default:                   return <FamilyRecallGame        {...props} />;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// PATIENT SCREENS
// ══════════════════════════════════════════════════════════════════════════════

function PatientDashboard({ lang, setLang, setScreen, setCurrentActivity, aiState }: {
  lang: Language; setLang: (l: Language) => void;
  setScreen: (s: Screen) => void;
  setCurrentActivity: (a: Activity) => void;
  aiState: AIState;
}) {
  const [patientTab, setPatientTab] = useState("home");
  const suggested = suggestedActivities(aiState);
  const featured = suggested[0];
  const nextUp = suggested.slice(1);
  const pct = 67;

  const tabs = [
    { key:"home",       label:"Home",       icon: (a:boolean) => Ico.home(a) },
    { key:"activities", label:"Activities", icon: (a:boolean) => Ico.activity(a) },
    { key:"memory",     label:"Memory",     icon: (a:boolean) => Ico.memory(a) },
    { key:"routine",    label:"Routine",    icon: (a:boolean) => Ico.cal(a) },
    { key:"profile",    label:"Profile",    icon: (a:boolean) => Ico.user(a) },
  ];

  const handleTab = (k: string) => {
    if (k === "activities") setScreen("patient-activities");
    else if (k === "memory")     setScreen("patient-memory");
    else if (k === "routine")    setScreen("patient-routine");
    else if (k === "profile")    setScreen("patient-profile");
    else setPatientTab(k);
  };

  return (
    <div style={{ height:"100%", background:"#F7FAFA", display:"flex", flexDirection:"column" }}>
      <div style={{ background:"white" }}>
        <TopBar lang={lang} setLang={setLang} right={
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <RolePill role="patient" />
            <div style={{ width:34, height:34, borderRadius:"50%", background:TEAL, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <span style={{ fontSize:13, fontWeight:700, color:"white" }}>PS</span>
            </div>
          </div>
        } />
        <div style={{ padding:"12px 16px 14px" }}>
          <h2 style={{ fontWeight:800, fontSize:20, color:CHARCOAL }}>Good morning, Priya 👋</h2>
          <SyncStatus />
        </div>
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:"14px 14px 80px", scrollbarWidth:"none" }}>
        {/* Progress */}
        <div style={{ background:"white", borderRadius:16, padding:"16px 18px", marginBottom:12 }}>
          <p style={{ fontSize:11, fontWeight:700, color:SLATE, textTransform:"uppercase", letterSpacing:0.5, marginBottom:10 }}>Today's progress</p>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <ProgressRing pct={pct} />
            <div style={{ flex:1 }}>
              <p style={{ fontWeight:800, fontSize:18, color:CHARCOAL }}>2 of 3 activities</p>
              <div style={{ height:6, background:TEAL_LIGHT, borderRadius:100, margin:"8px 0 4px" }}>
                <div style={{ height:6, borderRadius:100, background:TEAL, width:`${pct}%` }} />
              </div>
              <p style={{ fontSize:11, color:SLATE }}>observed · Participation is progress.</p>
            </div>
          </div>
        </div>

        {/* AI suggested */}
        <div style={{ marginBottom:12 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
            <div>
              <p style={{ fontWeight:800, fontSize:15, color:CHARCOAL }}>Today's journey</p>
              <AIBadge text={adaptedLabel(featured.domain, aiState)} />
            </div>
            <button onClick={() => setScreen("patient-activities")} style={{ fontSize:13, color:TEAL, fontWeight:700, background:"none", border:"none", fontFamily:"'Nunito',sans-serif", cursor:"pointer" }}>See all →</button>
          </div>

          {/* Featured */}
          <div onClick={() => { setCurrentActivity(featured); setScreen("patient-game"); }} style={{ background:TEAL, borderRadius:16, padding:"18px 16px", cursor:"pointer", marginBottom:10 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4 }}>
              <span style={{ fontSize:10, color:"rgba(255,255,255,0.7)", fontWeight:600 }}>AI selected</span>
              <span style={{ fontSize:11, color:"rgba(255,255,255,0.7)", background:"rgba(255,255,255,0.15)", borderRadius:100, padding:"2px 10px" }}>{featured.time}</span>
            </div>
            <p style={{ fontWeight:800, fontSize:18, color:"white", marginBottom:4 }}>{featured.name}</p>
            <p style={{ fontSize:13, color:"rgba(255,255,255,0.8)", marginBottom:14 }}>{featured.desc}</p>
            <button style={{ background:"rgba(255,255,255,0.2)", border:"1px solid rgba(255,255,255,0.3)", color:"white", borderRadius:10, padding:"10px 16px", fontSize:14, fontWeight:700, fontFamily:"'Nunito',sans-serif", cursor:"pointer", display:"flex", alignItems:"center", gap:8 }}>
              {Ico.play} Start activity
            </button>
          </div>

          {/* Next up */}
          <div style={{ background:"white", borderRadius:16, overflow:"hidden" }}>
            {nextUp.map((act, i) => (
              <div key={act.key} onClick={() => { setCurrentActivity(act); setScreen("patient-game"); }} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 16px", borderBottom:i<nextUp.length-1?"1px solid #F0F4F4":"none", cursor:"pointer" }}>
                <div>
                  <p style={{ fontWeight:700, fontSize:14, color:CHARCOAL }}>{act.name}</p>
                  <p style={{ fontSize:12, color:SLATE }}>{act.time} · <DiffBadge diff={adaptedDifficulty(act.domain, aiState)} /></p>
                </div>
                {Ico.chevron()}
              </div>
            ))}
          </div>
        </div>

        {/* Alert */}
        <div style={{ background:AMBER_BG, borderRadius:14, padding:"12px 14px", display:"flex", gap:10, alignItems:"flex-start" }}>
          {Ico.bell}
          <p style={{ fontSize:13, color:"#92400E", lineHeight:1.5 }}>Reminder: Evening walk at 5:00 PM — Rahul will join.</p>
        </div>
      </div>

      <BottomNav tabs={tabs} active={patientTab} setActive={handleTab} />
    </div>
  );
}

function ActivitiesScreen({ lang, setLang, onBack, setScreen, setCurrentActivity, aiState }: {
  lang: Language; setLang: (l: Language) => void; onBack: () => void;
  setScreen: (s: Screen) => void; setCurrentActivity: (a: Activity) => void; aiState: AIState;
}) {
  const [filter, setFilter] = useState("All");
  const filterMap: Record<string, Domain|"All"> = {
    "All":"All","Recall":"recall","Recognition":"recognition",
    "Attention":"attention","Orientation":"orientation","Language":"language",
  };
  const filtered = filter === "All" ? ACTIVITIES : ACTIVITIES.filter(a => a.domain === filterMap[filter]);

  return (
    <div style={{ height:"100%", background:"#F7FAFA", display:"flex", flexDirection:"column" }}>
      <div style={{ background:"white" }}>
        <TopBar title="Your Activities" onBack={onBack} lang={lang} setLang={setLang} />
        <div style={{ display:"flex", gap:8, padding:"10px 14px", overflowX:"auto", scrollbarWidth:"none" }}>
          {Object.keys(filterMap).map((f) => (
            <button key={f} onClick={() => setFilter(f)} style={{ background:filter===f?TEAL:"white", color:filter===f?"white":SLATE, border:`1.5px solid ${filter===f?TEAL:"#E5EAEA"}`, borderRadius:100, padding:"6px 16px", fontSize:12, fontWeight:600, fontFamily:"'Nunito',sans-serif", cursor:"pointer", whiteSpace:"nowrap" }}>
              {f}
            </button>
          ))}
        </div>
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:"12px 14px", scrollbarWidth:"none" }}>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {filtered.map((act) => {
            const diff = adaptedDifficulty(act.domain, aiState);
            const avg = getAvgScore(aiState.domainScores[act.domain]);
            return (
              <div key={act.key} onClick={() => { setCurrentActivity(act); setScreen("patient-game"); }} style={{ background:"white", borderRadius:14, padding:"14px 14px", cursor:"pointer", display:"flex", gap:12, alignItems:"center" }}>
                <div style={{ width:46, height:46, background:TEAL_LIGHT, borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, flexShrink:0 }}>{act.icon}</div>
                <div style={{ flex:1 }}>
                  <p style={{ fontWeight:700, fontSize:14, color:CHARCOAL }}>{act.name}</p>
                  <p style={{ fontSize:12, color:SLATE, marginTop:2 }}>{act.desc}</p>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:6 }}>
                    <DiffBadge diff={diff} />
                    <span style={{ fontSize:11, color:SLATE }}>{act.time}</span>
                    <span style={{ fontSize:11, color:TEAL }}>Observed: {avg}%</span>
                  </div>
                </div>
                {Ico.chevron()}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function GameCompleteScreen({ lastResult, activity, onHome, onContinue, aiState }: {
  lastResult: { accuracy: number; hintsUsed: number } | null;
  activity: Activity | null;
  onHome: () => void; onContinue: () => void; aiState: AIState;
}) {
  const acc = lastResult?.accuracy ?? 72;
  const domainAvg = activity ? getAvgScore(aiState.domainScores[activity.domain]) : 70;
  const trend = acc >= domainAvg ? "up" : "down";
  const trendLabel = acc >= domainAvg
    ? `Observed ${acc}% — a step forward`
    : `Observed ${acc}% — let's try again soon`;

  return (
    <div style={{ height:"100%", background:"white", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"0 24px" }}>
      <div style={{ textAlign:"center", marginBottom:28 }}>
        <div style={{ fontSize:72, marginBottom:14 }}>🌿</div>
        <h2 style={{ fontWeight:900, fontSize:26, color:CHARCOAL, marginBottom:8 }}>Session complete!</h2>
        <p style={{ fontSize:15, color:SLATE, lineHeight:1.65 }}>2 of 3 activities done today.<br />Wonderful participation, Priya.</p>
      </div>
      <div style={{ display:"flex", gap:20, justifyContent:"center", marginBottom:28 }}>
        {[
          { label:"Observed", val:`${acc}%`,    sub:trendLabel },
          { label:"Streak",   val:"5 days",     sub:"consistent" },
          { label:"Hints",    val:`${lastResult?.hintsUsed ?? 0}`, sub:"used today" },
        ].map((s,i) => (
          <div key={i} style={{ textAlign:"center" }}>
            <p style={{ fontWeight:800, fontSize:22, color:TEAL }}>{s.val}</p>
            <p style={{ fontSize:11, fontWeight:700, color:CHARCOAL }}>{s.label}</p>
            <p style={{ fontSize:10, color:SLATE, maxWidth:80 }}>{s.sub}</p>
          </div>
        ))}
      </div>
      <div style={{ width:"100%", display:"flex", flexDirection:"column", gap:12 }}>
        <PrimaryBtn label="Continue journey →" onClick={onContinue} />
        <SecondaryBtn label="Back to home" onClick={onHome} />
      </div>
      <p style={{ fontSize:11, color:SLATE, marginTop:16, textAlign:"center" }}>Observed engagement — not a clinical score</p>
    </div>
  );
}

function MemoryScreen({ lang, setLang, onBack }: { lang: Language; setLang: (l: Language) => void; onBack: () => void }) {
  const [activeTab, setActiveTab] = useState("People");
  const [showSheet, setShowSheet] = useState(false);
  const tabs = ["People","Places","Objects","Events"];
  const people = [
    { name:"Rahul",  rel:"Son",       emoji:"👦" },
    { name:"Meena",  rel:"Daughter",  emoji:"👧" },
    { name:"Suresh", rel:"Husband",   emoji:"👨" },
    { name:"Anita",  rel:"Sister",    emoji:"👩" },
    { name:"Deepak", rel:"Doctor",    emoji:"👨‍⚕️" },
    { name:"Radha",  rel:"Neighbour", emoji:"👵" },
  ];
  return (
    <div style={{ height:"100%", background:"#F7FAFA", display:"flex", flexDirection:"column" }}>
      <div style={{ background:"white" }}>
        <TopBar title="Memory Bank" onBack={onBack} lang={lang} setLang={setLang} right={
          <button onClick={() => setShowSheet(true)} style={{ background:TEAL_LIGHT, border:"none", borderRadius:10, width:34, height:34, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>{Ico.plus(TEAL)}</button>
        } />
        <div style={{ display:"flex", padding:"8px 14px", gap:4 }}>
          {tabs.map((t) => (
            <button key={t} onClick={() => setActiveTab(t)} style={{ flex:1, background:activeTab===t?TEAL:"transparent", color:activeTab===t?"white":SLATE, border:"none", borderRadius:10, padding:"8px 4px", fontSize:12, fontWeight:700, fontFamily:"'Nunito',sans-serif", cursor:"pointer" }}>
              {t}
            </button>
          ))}
        </div>
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:"12px 14px", scrollbarWidth:"none" }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          {people.map((p,i) => (
            <div key={i} style={{ background:"white", borderRadius:14, padding:"16px", textAlign:"center" }}>
              <div style={{ fontSize:42, marginBottom:8 }}>{p.emoji}</div>
              <p style={{ fontWeight:700, fontSize:15, color:CHARCOAL }}>{p.name}</p>
              <p style={{ fontSize:12, color:SLATE }}>{p.rel}</p>
            </div>
          ))}
          <button onClick={() => setShowSheet(true)} style={{ background:TEAL_LIGHT, borderRadius:14, padding:"16px", border:`2px dashed ${TEAL}`, cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:6, minHeight:100 }}>
            <span style={{ color:TEAL, fontSize:24 }}>+</span>
            <span style={{ fontSize:12, fontWeight:700, color:TEAL }}>Add memory</span>
          </button>
        </div>
        <div style={{ background:"white", borderRadius:14, padding:"14px", marginTop:14 }}>
          <p style={{ fontSize:12, fontWeight:700, color:SLATE, marginBottom:10 }}>How memories become activities</p>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            {["Memory","→ AI →","Activity"].map((s,i) => (
              <div key={i} style={{ flex:1, textAlign:"center" }}>
                {i%2===0 ? <div style={{ background:TEAL_LIGHT, borderRadius:10, padding:"8px 4px", fontSize:12, fontWeight:700, color:TEAL }}>{s}</div> : <span style={{ fontSize:14, color:TEAL }}>{s}</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
      {showSheet && (
        <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.3)", display:"flex", alignItems:"flex-end", zIndex:50 }} onClick={() => setShowSheet(false)}>
          <div style={{ background:"white", borderRadius:"24px 24px 0 0", padding:"24px 20px 32px", width:"100%", boxSizing:"border-box" }} onClick={e => e.stopPropagation()}>
            <div style={{ width:40, height:4, background:"#E5EAEA", borderRadius:100, margin:"0 auto 18px" }} />
            <h3 style={{ fontWeight:800, fontSize:18, color:CHARCOAL, marginBottom:16 }}>Add a memory</h3>
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              <div style={{ background:TEAL_LIGHT, borderRadius:12, height:80, display:"flex", alignItems:"center", justifyContent:"center", border:`2px dashed ${TEAL}`, cursor:"pointer" }}>
                <span style={{ fontSize:13, color:TEAL, fontWeight:600 }}>📷 Upload photo</span>
              </div>
              <input style={{ border:"1.5px solid #E5EAEA", borderRadius:10, padding:"12px 14px", fontSize:14, fontFamily:"'Nunito',sans-serif", color:CHARCOAL, width:"100%", boxSizing:"border-box" }} placeholder="Name" />
              <select style={{ border:"1.5px solid #E5EAEA", borderRadius:10, padding:"12px 14px", fontSize:14, fontFamily:"'Nunito',sans-serif", color:CHARCOAL, width:"100%" }}>
                <option>Select relationship</option>
                <option>Son</option><option>Daughter</option><option>Spouse</option><option>Sibling</option><option>Friend</option>
              </select>
              <label style={{ display:"flex", alignItems:"center", gap:10, fontSize:13, color:SLATE }}>
                <input type="checkbox" style={{ width:18, height:18 }} />
                I consent to using this photo in sessions
              </label>
              <PrimaryBtn label="Save memory" onClick={() => setShowSheet(false)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RoutineScreen({ lang, setLang, onBack }: { lang: Language; setLang: (l: Language) => void; onBack: () => void }) {
  const items = [
    { time:"8:00 AM",  label:"Breakfast",         done:true },
    { time:"9:30 AM",  label:"Medication",        done:true },
    { time:"10:00 AM", label:"Morning walk",      done:true },
    { time:"11:00 AM", label:"Activity session",  done:false, current:true },
    { time:"1:00 PM",  label:"Lunch",             done:false },
    { time:"3:00 PM",  label:"Rest",              done:false },
    { time:"5:00 PM",  label:"Evening walk",      done:false },
    { time:"8:00 PM",  label:"Dinner",            done:false },
  ];
  return (
    <div style={{ height:"100%", background:"#F7FAFA", display:"flex", flexDirection:"column" }}>
      <div style={{ background:"white" }}>
        <TopBar title="Today's Routine" onBack={onBack} lang={lang} setLang={setLang} />
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 16px 12px", borderBottom:"1px solid #F0F4F4" }}>
          <span style={{ fontSize:13, color:SLATE }}>Wednesday, 4 September 2026</span>
          <button style={{ fontSize:13, color:TEAL, fontWeight:700, background:"none", border:"none", fontFamily:"'Nunito',sans-serif", cursor:"pointer" }}>+ Add</button>
        </div>
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:"16px 16px", scrollbarWidth:"none" }}>
        <div style={{ position:"relative" }}>
          <div style={{ position:"absolute", left:67, top:0, bottom:0, width:2, background:"#E5EAEA" }} />
          {items.map((r,i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14, position:"relative" }}>
              <div style={{ width:58, textAlign:"right", fontSize:11, color:r.done?TEAL:SLATE, fontWeight:600, flexShrink:0 }}>{r.time}</div>
              <div style={{ width:20, height:20, borderRadius:"50%", background:r.done?TEAL:r.current?"white":"#E5EAEA", border:r.current?`2px solid ${TEAL}`:"none", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, zIndex:1 }}>
                {r.done && <svg width="10" height="10" viewBox="0 0 10 10"><polyline points="2,5 4,7 8,3" stroke="white" strokeWidth="1.5" fill="none" /></svg>}
                {r.current && <div style={{ width:8, height:8, borderRadius:"50%", background:TEAL }} />}
              </div>
              <div style={{ background:r.current?TEAL_LIGHT:"white", border:r.current?`1.5px solid ${TEAL}`:"none", borderRadius:12, padding:"11px 14px", flex:1 }}>
                <p style={{ fontWeight:r.current?800:600, fontSize:14, color:r.done?SLATE:CHARCOAL }}>
                  {r.label}{r.current && <span style={{ marginLeft:8, fontSize:11, color:TEAL }}>← Now</span>}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProfileScreen({ lang, setLang, onBack, onLogout, role }: { lang: Language; setLang: (l: Language) => void; onBack: () => void; onLogout: () => void; role: Role }) {
  const rows = [
    { label:"Language",              value:lang },
    { label:"Voice settings",        value:"On" },
    { label:"Accessibility",         value:"Text size: Large" },
    { label:"Notifications",         value:"On" },
    { label:"Connected caregivers",  value:"2 linked" },
    { label:"Privacy & consent",     value:"" },
    { label:"Data sync status",      value:"Synced" },
    { label:"Help & support",        value:"" },
  ];
  return (
    <div style={{ height:"100%", background:"#F7FAFA", display:"flex", flexDirection:"column" }}>
      <TopBar title="Profile" onBack={onBack} lang={lang} setLang={setLang} />
      <div style={{ flex:1, overflowY:"auto", scrollbarWidth:"none" }}>
        <div style={{ background:"white", padding:"22px 18px", display:"flex", alignItems:"center", gap:14, borderBottom:"1px solid #F0F4F4" }}>
          <div style={{ width:52, height:52, borderRadius:"50%", background:TEAL, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <span style={{ fontSize:20, fontWeight:700, color:"white" }}>PS</span>
          </div>
          <div>
            <p style={{ fontWeight:800, fontSize:18, color:CHARCOAL }}>Priya Sharma</p>
            <RolePill role={role} />
          </div>
        </div>
        <div style={{ background:"white", margin:"12px 14px", borderRadius:14, overflow:"hidden" }}>
          {rows.map((r,i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 16px", borderBottom:i<rows.length-1?"1px solid #F0F4F4":"none" }}>
              <span style={{ fontSize:15, fontWeight:600, color:CHARCOAL }}>{r.label}</span>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                {r.value && <span style={{ fontSize:13, color:SLATE }}>{r.value}</span>}
                {Ico.chevron()}
              </div>
            </div>
          ))}
        </div>
        <div style={{ margin:"0 14px 24px" }}>
          <button onClick={onLogout} style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:10, background:"white", border:"1.5px solid #FECACA", borderRadius:14, padding:"14px 20px", fontFamily:"'Nunito',sans-serif", fontWeight:700, fontSize:15, color:"#EF4444", cursor:"pointer" }}>
            {Ico.logout} Log out
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CAREGIVER SCREENS
// ══════════════════════════════════════════════════════════════════════════════

function CaregiverDashboard({ lang, setLang, setScreen, aiState }: { lang: Language; setLang: (l: Language) => void; setScreen: (s: Screen) => void; aiState: AIState }) {
  const [cgTab, setCgTab] = useState("home");
  const tabs = [
    { key:"home",     label:"Home",     icon:(a:boolean) => Ico.home(a) },
    { key:"patients", label:"Patients", icon:(a:boolean) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={a?TEAL:SLATE} strokeWidth="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
    { key:"memories", label:"Memories", icon:(a:boolean) => Ico.memory(a) },
    { key:"reports",  label:"Reports",  icon:(a:boolean) => Ico.chart(a) },
    { key:"more",     label:"More",     icon:(a:boolean) => Ico.user(a) },
  ];
  const domainLabels: [string, Domain][] = [["Recall","recall"],["Attention","attention"],["Orientation","orientation"]];

  const handleTab = (k: string) => {
    if (k === "reports")  setScreen("caregiver-reports");
    else if (k === "memories") setScreen("patient-memory");
    else if (k === "more")     setScreen("patient-profile");
    else setCgTab(k);
  };

  return (
    <div style={{ height:"100%", background:"#F7FAFA", display:"flex", flexDirection:"column" }}>
      <div style={{ background:"white" }}>
        <TopBar lang={lang} setLang={setLang} right={
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <RolePill role="caregiver" />
            <div style={{ background:TEAL_LIGHT, borderRadius:100, padding:"3px 12px", fontSize:12, fontWeight:700, color:TEAL }}>Priya</div>
          </div>
        } />
        <div style={{ padding:"12px 16px 14px" }}>
          <h2 style={{ fontWeight:800, fontSize:20, color:CHARCOAL }}>Welcome back, Rahul</h2>
          <p style={{ fontSize:13, color:SLATE, marginTop:2 }}>A calm overview of Priya's engagement.</p>
          <SyncStatus />
        </div>
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:"14px 14px 80px", scrollbarWidth:"none" }}>
        <div style={{ background:"white", borderRadius:16, overflow:"hidden", marginBottom:12 }}>
          {domainLabels.map(([label, domain], i) => {
            const avg = getAvgScore(aiState.domainScores[domain]);
            const trend = avg >= 70 ? "+3% this week" : avg >= 60 ? "Stable" : "Needs gentle support";
            return (
              <div key={label} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 18px", borderBottom:i<2?"1px solid #F0F4F4":"none" }}>
                <div>
                  <p style={{ fontSize:12, fontWeight:700, color:SLATE, textTransform:"uppercase", letterSpacing:0.4 }}>{label}</p>
                  <p style={{ fontSize:11, color:TEAL, marginTop:2 }}>{trend}</p>
                  <AIBadge text="Observed engagement" />
                </div>
                <p style={{ fontWeight:900, fontSize:28, color:TEAL }}>{avg}%</p>
              </div>
            );
          })}
        </div>

        <div style={{ background:AMBER_BG, borderRadius:14, padding:"14px 14px", display:"flex", gap:10, marginBottom:12 }}>
          {Ico.bell}
          <p style={{ fontSize:13, color:"#92400E", lineHeight:1.5 }}>Today's session is 2 of 3 complete. A reminder may help when it feels right.</p>
        </div>

        <button onClick={() => setScreen("caregiver-reports")} style={{ background:"white", borderRadius:14, padding:"14px 16px", width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", border:"none", cursor:"pointer", fontFamily:"'Nunito',sans-serif" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            {Ico.chart(false)}
            <div style={{ textAlign:"left" }}>
              <p style={{ fontWeight:700, fontSize:14, color:CHARCOAL }}>Performance overview →</p>
              <p style={{ fontSize:12, color:SLATE }}>Last 30 days — detailed report</p>
            </div>
          </div>
          {Ico.chevron()}
        </button>
      </div>

      <BottomNav tabs={tabs} active={cgTab} setActive={handleTab} />
    </div>
  );
}

function CaregiverReports({ lang, setLang, onBack, aiState }: { lang: Language; setLang: (l: Language) => void; onBack: () => void; aiState: AIState }) {
  const bars = Array.from({ length:30 }, (_, i) => ({ i, val: 45 + Math.round(Math.sin(i*0.42)*18 + (i*0.6)) }));
  const maxBar = Math.max(...bars.map(b=>b.val));
  const recentLog = [
    { act:"Family Recall",    date:"Sep 3", score:`${getAvgScore(aiState.domainScores.recall)}%`,       diff:"Gentle" },
    { act:"Daily Orientation",date:"Sep 3", score:`${getAvgScore(aiState.domainScores.orientation)}%`,  diff:"Guided" },
    { act:"What's Missing?",  date:"Sep 2", score:`${getAvgScore(aiState.domainScores.attention)}%`,    diff:"Gentle" },
    { act:"Word Association", date:"Sep 2", score:`${getAvgScore(aiState.domainScores.language)}%`,     diff:"Focused" },
  ];
  return (
    <div style={{ height:"100%", background:"#F7FAFA", display:"flex", flexDirection:"column" }}>
      <TopBar title="Performance Overview" onBack={onBack} lang={lang} setLang={setLang} />
      <div style={{ flex:1, overflowY:"auto", padding:"14px 14px", scrollbarWidth:"none" }}>
        <p style={{ fontSize:12, fontWeight:700, color:SLATE, marginBottom:10 }}>This Month — Observed activity engagement</p>
        <div style={{ background:"white", borderRadius:16, padding:"16px 14px", marginBottom:12 }}>
          <p style={{ fontSize:13, fontWeight:700, color:CHARCOAL, marginBottom:10 }}>Last 30 days</p>
          <AIBadge text="Observed engagement — not a clinical score" />
          <div style={{ display:"flex", alignItems:"flex-end", gap:2, height:90, marginTop:10 }}>
            {bars.map((b,i) => (
              <div key={i} style={{ flex:1, height:`${(b.val/maxBar)*100}%`, background:b.val>70?TEAL:TEAL_LIGHT, borderRadius:"3px 3px 0 0", minWidth:6 }} />
            ))}
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", marginTop:6 }}>
            <span style={{ fontSize:10, color:SLATE }}>Aug 5</span>
            <span style={{ fontSize:10, color:SLATE }}>Sep 4</span>
          </div>
        </div>

        <div style={{ background:"white", borderRadius:16, overflow:"hidden", marginBottom:12 }}>
          <div style={{ padding:"14px 16px 8px" }}><p style={{ fontWeight:700, fontSize:14, color:CHARCOAL }}>Recent activity log</p></div>
          {recentLog.map((r,i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 16px", borderTop:"1px solid #F0F4F4" }}>
              <div>
                <p style={{ fontWeight:700, fontSize:13, color:CHARCOAL }}>{r.act}</p>
                <p style={{ fontSize:11, color:SLATE }}>{r.date} · {r.diff}</p>
              </div>
              <span style={{ fontWeight:700, fontSize:14, color:TEAL }}>{r.score}</span>
            </div>
          ))}
        </div>

        <div style={{ background:"white", borderRadius:14, padding:"14px 16px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <p style={{ fontWeight:700, fontSize:14, color:CHARCOAL }}>Memory Bank contributions</p>
            <p style={{ fontSize:12, color:SLATE }}>6 people · 2 places · 4 objects</p>
          </div>
          {Ico.chevron()}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// DOCTOR DASHBOARD — completely self-contained
// ══════════════════════════════════════════════════════════════════════════════

function DoctorDashboard({ lang, setLang, aiState }: { lang: Language; setLang: (l: Language) => void; aiState: AIState }) {
  const [activeMetric, setActiveMetric] = useState<Domain>("recall");
  const metrics: { key: Domain; label: string }[] = [
    { key:"recall",      label:"Recall" },
    { key:"recognition", label:"Recognition" },
    { key:"attention",   label:"Attention" },
    { key:"orientation", label:"Orientation" },
  ];
  const scores = aiState.domainScores[activeMetric];
  const extended = [...[60,62,58,65,63,60],  ...scores];
  const maxD = Math.max(...extended), minD = Math.min(...extended);
  const W = 310, H = 90;
  const pts = extended.map((v,i) => [
    (i/(extended.length-1))*W,
    H - ((v-minD+5)/(maxD-minD+10))*H,
  ]);
  const pathD = pts.map((p,i) => (i===0?`M ${p[0]} ${p[1]}`:`L ${p[0]} ${p[1]}`)).join(" ");
  const avg = getAvgScore(scores);

  const sessionHistory = [
    { date:"Sep 3, 2026", activities:3, recall:`${getAvgScore(aiState.domainScores.recall)}%`, orientation:`${getAvgScore(aiState.domainScores.orientation)}%` },
    { date:"Sep 2, 2026", activities:2, recall:`${getAvgScore(aiState.domainScores.recall)-4}%`, orientation:`${getAvgScore(aiState.domainScores.orientation)-4}%` },
    { date:"Sep 1, 2026", activities:3, recall:`${getAvgScore(aiState.domainScores.recall)-6}%`, orientation:`${getAvgScore(aiState.domainScores.orientation)-3}%` },
  ];

  return (
    <div style={{ height:"100%", background:"#F7FAFA", display:"flex", flexDirection:"column" }}>
      <div style={{ background:"white" }}>
        <TopBar lang={lang} setLang={setLang} right={<RolePill role="doctor" />} />
        <div style={{ padding:"12px 16px 14px" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div>
              <h2 style={{ fontWeight:800, fontSize:18, color:CHARCOAL }}>Dr. Rajan's View</h2>
              <SyncStatus />
            </div>
            <select style={{ border:"1.5px solid #E5EAEA", borderRadius:10, padding:"7px 10px", fontSize:13, fontFamily:"'Nunito',sans-serif", color:CHARCOAL, background:"white" }}>
              <option>Priya Sharma</option>
              <option>Mohan Das</option>
            </select>
          </div>
        </div>
      </div>

      <div style={{ background:"#FFF8F1", borderTop:`2px solid ${AMBER}`, padding:"8px 16px" }}>
        <p style={{ fontSize:11, color:"#92400E" }}>This dashboard supports observation. It does not diagnose dementia or its stage.</p>
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:"14px 14px", scrollbarWidth:"none" }}>
        <div style={{ background:"white", borderRadius:16, padding:"16px 14px", marginBottom:12 }}>
          <div style={{ display:"flex", gap:8, marginBottom:12, flexWrap:"wrap" }}>
            {metrics.map((m) => (
              <button key={m.key} onClick={() => setActiveMetric(m.key)} style={{ background:activeMetric===m.key?TEAL:"transparent", color:activeMetric===m.key?"white":SLATE, border:`1.5px solid ${activeMetric===m.key?TEAL:"#E5EAEA"}`, borderRadius:100, padding:"6px 14px", fontSize:12, fontWeight:700, fontFamily:"'Nunito',sans-serif", cursor:"pointer" }}>
                {m.label}
              </button>
            ))}
          </div>
          <p style={{ fontSize:11, color:SLATE, marginBottom:6 }}>Observed: {metrics.find(m=>m.key===activeMetric)?.label} — last 10 sessions</p>
          <svg width="100%" viewBox={`0 0 ${W} ${H+20}`} style={{ overflow:"visible" }}>
            <defs>
              <linearGradient id="tg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={TEAL} stopOpacity="0.12" />
                <stop offset="100%" stopColor={TEAL} stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={`${pathD} L ${W} ${H} L 0 ${H} Z`} fill="url(#tg)" />
            <path d={pathD} stroke={TEAL} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            {pts.map((p,i) => <circle key={i} cx={p[0]} cy={p[1]} r="3" fill="white" stroke={TEAL} strokeWidth="1.5" />)}
          </svg>
          <p style={{ fontSize:12, color:TEAL, marginTop:4, fontWeight:600 }}>Observed {avg}% — {avg>=75?"steady engagement":avg>=60?"moderate engagement":"lower engagement noted"}</p>
        </div>

        <div style={{ display:"flex", gap:10, marginBottom:12 }}>
          <button style={{ flex:1, background:TEAL_LIGHT, color:TEAL, border:"none", borderRadius:12, padding:"13px", fontSize:13, fontWeight:700, fontFamily:"'Nunito',sans-serif", cursor:"pointer" }}>+ Clinical note</button>
          <button style={{ flex:1, background:TEAL, color:"white", border:"none", borderRadius:12, padding:"13px", fontSize:13, fontWeight:700, fontFamily:"'Nunito',sans-serif", cursor:"pointer" }}>Export report</button>
        </div>

        <div style={{ background:"white", borderRadius:16, overflow:"hidden" }}>
          <div style={{ padding:"14px 16px 8px" }}><p style={{ fontWeight:700, fontSize:14, color:CHARCOAL }}>Session history</p></div>
          {sessionHistory.map((s,i) => (
            <div key={i} style={{ padding:"12px 16px", borderTop:"1px solid #F0F4F4" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <p style={{ fontWeight:700, fontSize:13, color:CHARCOAL }}>{s.date}</p>
                <span style={{ fontSize:12, color:SLATE }}>{s.activities} activities</span>
              </div>
              <div style={{ display:"flex", gap:14, marginTop:4 }}>
                <span style={{ fontSize:11, color:TEAL }}>Observed recall: {s.recall}</span>
                <span style={{ fontSize:11, color:TEAL }}>Orientation: {s.orientation}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN DASHBOARD — completely self-contained
// ══════════════════════════════════════════════════════════════════════════════

function AdminDashboard({ lang, setLang }: { lang: Language; setLang: (l: Language) => void }) {
  const [adminTab, setAdminTab] = useState("activities");
  const navTabs = [
    { key:"users",      label:"Users" },
    { key:"patients",   label:"Patients" },
    { key:"activities", label:"Activities" },
    { key:"analytics",  label:"Analytics" },
    { key:"more",       label:"More" },
  ];
  const activities = [
    { name:"Family Recall",      sub:"Recall / Gentle",      status:"Active", icon:"👨‍👩‍👧" },
    { name:"Who Is This?",       sub:"Recognition / Guided",  status:"Active", icon:"🤔" },
    { name:"Relationship Match", sub:"Recall / Gentle",       status:"Active", icon:"🔗" },
    { name:"Focus & Find",       sub:"Attention / Focused",   status:"Active", icon:"🔍" },
    { name:"What's Missing?",    sub:"Attention / Gentle",    status:"Active", icon:"❓" },
    { name:"Daily Orientation",  sub:"Orientation / Guided",  status:"Active", icon:"🗓️" },
    { name:"Routine Next",       sub:"Orientation / Gentle",  status:"Active", icon:"⏭️" },
    { name:"Category Sort",      sub:"Language / Focused",    status:"Active", icon:"📂" },
    { name:"Word Association",   sub:"Language / Guided",     status:"Active", icon:"💬" },
    { name:"Sound Recognition",  sub:"Recognition / Gentle",  status:"Draft",  icon:"🔊" },
  ];
  const langDist = [
    { lang:"English",   pct:42 },
    { lang:"Hindi",     pct:28 },
    { lang:"Assamese",  pct:18 },
    { lang:"Bengali",   pct:12 },
  ];

  return (
    <div style={{ height:"100%", background:"#F7FAFA", display:"flex", flexDirection:"column" }}>
      <div style={{ background:"white" }}>
        <TopBar lang={lang} setLang={setLang} right={<RolePill role="admin" />} />
        <div style={{ display:"flex", borderBottom:"1px solid #F0F4F4" }}>
          {navTabs.map((t) => (
            <button key={t.key} onClick={() => setAdminTab(t.key)} style={{ flex:1, fontSize:11, fontWeight:700, color:adminTab===t.key?TEAL:SLATE, borderBottom:`2px solid ${adminTab===t.key?TEAL:"transparent"}`, background:"none", border:"none", borderBottomWidth:2, borderBottomStyle:"solid", borderBottomColor:adminTab===t.key?TEAL:"transparent", padding:"10px 4px", fontFamily:"'Nunito',sans-serif", cursor:"pointer" }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:"14px 14px", scrollbarWidth:"none" }}>
        <div style={{ background:TEAL_LIGHT, borderRadius:12, padding:"10px 14px", marginBottom:12 }}>
          <p style={{ fontSize:11, color:TEAL }}>The library supports engagement. It does not assess or diagnose dementia.</p>
        </div>

        {(adminTab === "activities" || adminTab === "users" || adminTab === "patients" || adminTab === "more") && (
          <>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
              <p style={{ fontWeight:700, fontSize:15, color:CHARCOAL }}>Content Operations — Activities</p>
              <button style={{ fontSize:12, color:TEAL, fontWeight:700, background:TEAL_LIGHT, border:"none", borderRadius:10, padding:"6px 12px", fontFamily:"'Nunito',sans-serif", cursor:"pointer" }}>+ Add</button>
            </div>
            <div style={{ background:"white", borderRadius:16, overflow:"hidden" }}>
              {activities.map((a,i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"13px 14px", borderBottom:i<activities.length-1?"1px solid #F0F4F4":"none" }}>
                  <div style={{ width:38, height:38, background:TEAL_LIGHT, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>{a.icon}</div>
                  <div style={{ flex:1 }}>
                    <p style={{ fontWeight:700, fontSize:14, color:CHARCOAL }}>{a.name}</p>
                    <p style={{ fontSize:11, color:SLATE }}>{a.sub}</p>
                  </div>
                  <span style={{ fontSize:11, fontWeight:700, color:a.status==="Active"?TEAL:SLATE, background:a.status==="Active"?TEAL_LIGHT:"#F0F4F4", borderRadius:100, padding:"3px 10px" }}>{a.status}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {adminTab === "analytics" && (
          <>
            <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:12 }}>
              {[
                { label:"Total active patients", val:"247" },
                { label:"Avg. engagement",       val:"71%" },
                { label:"Sessions this week",    val:"1,842" },
              ].map((s,i) => (
                <div key={i} style={{ background:"white", borderRadius:14, padding:"14px 18px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <p style={{ fontSize:13, fontWeight:600, color:CHARCOAL }}>{s.label}</p>
                  <p style={{ fontWeight:900, fontSize:24, color:TEAL }}>{s.val}</p>
                </div>
              ))}
            </div>
            <div style={{ background:"white", borderRadius:16, padding:"14px", marginBottom:12 }}>
              <p style={{ fontWeight:700, fontSize:14, color:CHARCOAL, marginBottom:12 }}>Language distribution</p>
              {langDist.map((l,i) => (
                <div key={i} style={{ marginBottom:12 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                    <span style={{ fontSize:13, color:CHARCOAL, fontWeight:600 }}>{l.lang}</span>
                    <span style={{ fontSize:13, color:TEAL, fontWeight:700 }}>{l.pct}%</span>
                  </div>
                  <div style={{ height:6, background:TEAL_LIGHT, borderRadius:100 }}>
                    <div style={{ height:6, borderRadius:100, background:TEAL, width:`${l.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// APP ROOT
// ══════════════════════════════════════════════════════════════════════════════

export default function App() {
  const [screen, setScreen] = useState<Screen>("splash");
  const [role, setRole] = useState<Role | null>(null);
  const [lang, setLang] = useState<Language>("EN");
  const [currentActivity, setCurrentActivity] = useState<Activity>(ACTIVITIES[0]);
  const [lastResult, setLastResult] = useState<{ accuracy: number; hintsUsed: number } | null>(null);
  const [aiState, setAiState] = useState<AIState>(initialAIState());

  const handleLogin = (r: Role) => {
    setRole(r);
    // Each role routes to its completely separate dashboard
    const dest: Record<Role, Screen> = {
      patient:   "patient-dashboard",
      caregiver: "caregiver-dashboard",
      doctor:    "doctor-dashboard",
      admin:     "admin-dashboard",
    };
    setScreen(dest[r]);
  };

  const handleGameComplete = (result: { accuracy: number; hintsUsed: number }) => {
    setLastResult(result);
    // Record to AI state
    setAiState(prev => recordResult(prev, {
      activityKey: currentActivity.key,
      domain: currentActivity.domain,
      accuracy: result.accuracy,
      hintsUsed: result.hintsUsed,
      completed: true,
      ts: Date.now(),
    }));
    setScreen("patient-game-complete");
  };

  const goHome = (): Screen => {
    if (role === "caregiver") return "caregiver-dashboard";
    if (role === "doctor")    return "doctor-dashboard";
    if (role === "admin")     return "admin-dashboard";
    return "patient-dashboard";
  };

  return (
    <PhoneFrame>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {screen === "splash"    && <SplashScreen    onNext={() => setScreen("onboarding")} />}
      {screen === "onboarding"&& <OnboardingScreen onDone={() => setScreen("login")} />}
      {screen === "login"     && <LoginScreen lang={lang} setLang={setLang} onLogin={handleLogin} />}

      {/* ── Patient ── */}
      {screen === "patient-dashboard" && role === "patient" && (
        <PatientDashboard lang={lang} setLang={setLang} setScreen={setScreen} setCurrentActivity={setCurrentActivity} aiState={aiState} />
      )}
      {screen === "patient-activities" && role === "patient" && (
        <ActivitiesScreen lang={lang} setLang={setLang} onBack={() => setScreen("patient-dashboard")} setScreen={setScreen} setCurrentActivity={setCurrentActivity} aiState={aiState} />
      )}
      {screen === "patient-game" && role === "patient" && (
        <GameRouter activity={currentActivity} aiState={aiState} onComplete={handleGameComplete} onBack={() => setScreen("patient-activities")} />
      )}
      {screen === "patient-game-complete" && role === "patient" && (
        <GameCompleteScreen lastResult={lastResult} activity={currentActivity} onHome={() => setScreen("patient-dashboard")} onContinue={() => setScreen("patient-activities")} aiState={aiState} />
      )}
      {screen === "patient-memory" && (
        <MemoryScreen lang={lang} setLang={setLang} onBack={() => setScreen(goHome())} />
      )}
      {screen === "patient-routine" && (
        <RoutineScreen lang={lang} setLang={setLang} onBack={() => setScreen("patient-dashboard")} />
      )}
      {screen === "patient-profile" && (
        <ProfileScreen lang={lang} setLang={setLang} onBack={() => setScreen(goHome())} onLogout={() => { setRole(null); setScreen("login"); }} role={role ?? "patient"} />
      )}

      {/* ── Caregiver ── */}
      {screen === "caregiver-dashboard" && role === "caregiver" && (
        <CaregiverDashboard lang={lang} setLang={setLang} setScreen={setScreen} aiState={aiState} />
      )}
      {screen === "caregiver-reports" && role === "caregiver" && (
        <CaregiverReports lang={lang} setLang={setLang} onBack={() => setScreen("caregiver-dashboard")} aiState={aiState} />
      )}

      {/* ── Doctor ── */}
      {screen === "doctor-dashboard" && role === "doctor" && (
        <DoctorDashboard lang={lang} setLang={setLang} aiState={aiState} />
      )}

      {/* ── Admin ── */}
      {screen === "admin-dashboard" && role === "admin" && (
        <AdminDashboard lang={lang} setLang={setLang} />
      )}
    </PhoneFrame>
  );
}
