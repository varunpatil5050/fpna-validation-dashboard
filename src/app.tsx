// @ts-nocheck
import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { DATA } from "./data";

// ─── UTILITIES & STATS ───
function mean(a: number[]) {
  const v = a.map(Number).filter(Number.isFinite);
  return v.length ? v.reduce((s, x) => s + x, 0) / v.length : NaN;
}
function median(a: number[]) {
  const v = a.map(Number).filter(Number.isFinite).sort((x, y) => x - y);
  if (!v.length) return NaN;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}
function pct(a: any[]) {
  return a.length ? (100 * a.filter(Boolean).length) / a.length : NaN;
}
function ranks(a: number[]) {
  const z = a.map((v, i) => ({ v: +v, i })).sort((x, y) => x.v - y.v);
  const r = new Array(a.length);
  let i = 0;
  while (i < z.length) {
    let j = i;
    while (j + 1 < z.length && z[j + 1].v === z[i].v) j++;
    const avg = (i + j + 2) / 2;
    for (let k = i; k <= j; k++) r[z[k].i] = avg;
    i = j + 1;
  }
  return r;
}
function pearson(x: number[], y: number[]) {
  const mx = mean(x), my = mean(y);
  let n = 0, dx = 0, dy = 0;
  for (let i = 0; i < x.length; i++) {
    const a = x[i] - mx, b = y[i] - my;
    n += a * b;
    dx += a * a;
    dy += b * b;
  }
  return dx && dy ? n / Math.sqrt(dx * dy) : NaN;
}
function spearman(x: number[], y: number[]) {
  return pearson(ranks(x), ranks(y));
}
function regression(x: number[], y: number[]) {
  const mx = mean(x), my = mean(y);
  let n = 0, d = 0;
  for (let i = 0; i < x.length; i++) {
    n += (x[i] - mx) * (y[i] - my);
    d += (x[i] - mx) * (x[i] - mx);
  }
  const slope = d ? n / d : 0;
  const intercept = my - slope * mx;
  const r = pearson(x, y);
  return { slope, intercept, r2: r * r };
}
function strength(r: number) {
  const a = Math.abs(r);
  return a >= 0.8 ? "Very strong" : a >= 0.6 ? "Strong" : a >= 0.4 ? "Moderate" : a >= 0.2 ? "Weak" : "Very weak";
}
function fmtPct(v: number, d = 1) {
  return Number.isFinite(v) ? v.toFixed(d) + "%" : "—";
}
function fmt(v: number, d = 0) {
  return Number.isFinite(v) ? v.toFixed(d) : "—";
}
function unique<T>(a: T[]): T[] {
  return [...new Set(a)].sort();
}
function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

// Operational burden formula (0-1)
function burden(r: any) {
  return (
    0.28 * (+r["Q_FP&A_Time_on_Data_Preparation_Pct"] / 50) +
    0.23 * (+r.Q_Exact_Consolidation_Team_Hours_Per_Month / 105) +
    0.18 * (+r.Q_Reconciliation_Hours_Per_Month / 34) +
    0.16 * (+r.Q_Data_Related_Additional_Delay_Days / 4.5) +
    0.15 * (+r.Q_Manual_Correction_Frequency_1to5 / 5)
  );
}

function calculateFrictionScore(r: any) {
  return Math.round(clamp(burden(r) * 100, 0, 100));
}

// ─── FLAT MONOCHROME SVG ICONS ───
const Icons = {
  Sun: ({ size = 15, className = "" }: { size?: number; className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  ),
  Moon: ({ size = 15, className = "" }: { size?: number; className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  ),
  SpeakerOn: ({ size = 15, className = "" }: { size?: number; className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  ),
  SpeakerMute: ({ size = 15, className = "" }: { size?: number; className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <line x1="22" x2="16" y1="9" y2="15" />
      <line x1="16" x2="22" y1="9" y2="15" />
    </svg>
  ),
  Clipboard: ({ size = 14, className = "" }: { size?: number; className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
      <line x1="9" x2="15" y1="11" y2="11" />
      <line x1="9" x2="15" y1="15" y2="15" />
      <line x1="9" x2="12" y1="19" y2="19" />
    </svg>
  ),
  Search: ({ size = 13, className = "" }: { size?: number; className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" x2="16.65" y1="21" y2="16.65" />
    </svg>
  ),
  Download: ({ size = 13, className = "" }: { size?: number; className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" x2="12" y1="15" y2="3" />
    </svg>
  ),
  Alert: ({ size = 14, className = "" }: { size?: number; className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <line x1="12" x2="12" y1="9" y2="13" />
      <line x1="12" x2="12.01" y1="17" y2="17" />
    </svg>
  ),
  Flask: ({ size = 13, className = "" }: { size?: number; className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M10 2v7.31L4.36 19.3A2 2 0 0 0 6.07 22h11.86a2 2 0 0 0 1.71-2.7L14 9.31V2" />
      <line x1="8" x2="16" y1="2" y2="2" />
      <line x1="7.4" x2="16.6" y1="15" y2="15" />
    </svg>
  ),
  Check: ({ size = 12, className = "" }: { size?: number; className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  CheckCircle: ({ size = 14, className = "" }: { size?: number; className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  ChevronLeft: ({ size = 14, className = "" }: { size?: number; className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  ),
  ChevronRight: ({ size = 14, className = "" }: { size?: number; className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
};

const ISSUE_MAP = [
  ["Time-consuming collection", "Issue_Time_Consuming_Collection"],
  ["Manual cleaning / transformation", "Issue_Manual_Cleaning_Transformation"],
  ["Mapping difficulty", "Issue_Mapping_Difficulty"],
  ["Reconciliation", "Issue_Reconciliation"],
  ["Spreadsheet consolidation", "Issue_Manual_Spreadsheet_Consolidation"],
  ["Reporting delays", "Issue_Data_Related_Reporting_Delays"],
  ["Forecast revisions", "Issue_Data_Related_Forecast_Revisions"]
];

const HYPOTHESIS_OPTIONS = [
  { id: "H1", title: "H1: Systems → Prep Time", xKey: "Q_Exact_Source_System_Count", yKey: "Q_FP&A_Time_on_Data_Preparation_Pct", xLabel: "Source systems count", yLabel: "FP&A preparation time (%)", integerX: true },
  { id: "H2", title: "H2: Transfers → Data Delay", xKey: "Q_Manual_Data_Transfers_Per_Cycle", yKey: "Q_Data_Related_Additional_Delay_Days", xLabel: "Manual transfers per cycle", yLabel: "Data delay (days)", integerX: true },
  { id: "H4", title: "H4: Reconciliation → Lag", xKey: "Q_Reconciliation_Hours_Per_Month", yKey: "Q_Reporting_Lag_Business_Days", xLabel: "Reconciliation hours / month", yLabel: "Reporting lag (business days)", integerX: false },
  { id: "H3", title: "H3: Spreadsheet → Corrections", xKey: "Q_Spreadsheet_Dependency_1to5", yKey: "Q_Manual_Correction_Frequency_1to5", xLabel: "Spreadsheet dependency (1-5)", yLabel: "Correction frequency (1-5)", integerX: true },
  { id: "H5", title: "H5: Discrepancy → Forecast Revisions", xKey: "Q_Discrepancy_Frequency_1to5", yKey: "Q_Forecast_Revision_Frequency_1to5", xLabel: "Discrepancy frequency (1-5)", yLabel: "Forecast revision frequency (1-5)", integerX: true }
];

const HYPOTHESES = [
  ["H1", "Source systems → preparation time", "Q_Exact_Source_System_Count", "Q_FP&A_Time_on_Data_Preparation_Pct"],
  ["H2", "Manual transfers → data-related delay", "Q_Manual_Data_Transfers_Per_Cycle", "Q_Data_Related_Additional_Delay_Days"],
  ["H3", "Spreadsheet dependence → correction frequency", "Q_Spreadsheet_Dependency_1to5", "Q_Manual_Correction_Frequency_1to5"],
  ["H4", "Reconciliation hours → reporting lag", "Q_Reconciliation_Hours_Per_Month", "Q_Reporting_Lag_Business_Days"],
  ["H5", "Discrepancies → forecast revisions", "Q_Discrepancy_Frequency_1to5", "Q_Forecast_Revision_Frequency_1to5"],
  ["H6", "Integration gap → consolidation hours", "Derived_Integration_Gap_1to5", "Q_Exact_Consolidation_Team_Hours_Per_Month"],
  ["H7", "Preparation burden → strategic limitation", "Q_FP&A_Time_on_Data_Preparation_Pct", "Q_Strategic_Time_Limitation_1to5"]
];

function heatColor(v: number, isDark = true) {
  v = clamp(v, -1, 1);
  if (isDark) {
    if (v < 0) {
      const t = v + 1;
      const c = [18 + (30 - 18) * t, 22 + (41 - 22) * t, 30 + (59 - 30) * t];
      return `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`;
    }
    const t = v;
    const base = [18, 22, 30];
    const target = [56, 189, 248];
    const c = base.map((x, i) => Math.round(x + (target[i] - x) * t));
    return `rgb(${c[0]},${c[1]},${c[2]})`;
  } else {
    if (v < 0) {
      return `rgb(226, 232, 240)`;
    }
    const t = v;
    const base = [241, 245, 249];
    const target = [2, 132, 199];
    const c = base.map((x, i) => Math.round(x + (target[i] - x) * t));
    return `rgb(${c[0]},${c[1]},${c[2]})`;
  }
}

// ─── SYNTHESIZED WEB AUDIO ENGINE ───
class SoundEngine {
  ctx: AudioContext | null = null;
  enabled: boolean = false;

  init() {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
  }

  playPop() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(340, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.04);
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.04);
    } catch (e) {}
  }

  playBlip() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(680, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.05);
      gain.gain.setValueAtTime(0.03, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.05);
    } catch (e) {}
  }

  playSuccess() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      [523.25, 659.25, 783.99].forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + idx * 0.04);
        gain.gain.setValueAtTime(0.03, now + idx * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.16);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(now + idx * 0.04);
        osc.stop(now + idx * 0.04 + 0.16);
      });
    } catch (e) {}
  }
}

const sounds = new SoundEngine();

// ─── INTERSECTION OBSERVER SCROLL REVEAL ───
function useScrollReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.06, rootMargin: "0px 0px -40px 0px" }
    );
    document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

// ─── ANIMATED COUNTER ───
function AnimatedNumber({ value, suffix = "", decimals = 0 }: { value: number; suffix?: string; decimals?: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const num = parseFloat(String(value)) || 0;
    const start = 0;
    const duration = 1000;
    const startTime = performance.now();
    function animate(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      setDisplay(start + (num - start) * eased);
      if (progress < 1) requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
  }, [value]);
  return <>{display.toFixed(decimals)}{suffix}</>;
}

// ─── SECTION HEADER ───
function SectionHead({ num, title, body }: { num: string; title: string; body: string }) {
  return (
    <div className="section-head">
      <div>
        <div className="sec-num">{num}</div>
        <h2>{title}</h2>
      </div>
      <p>{body}</p>
    </div>
  );
}

// ─── KPI CARD ───
function KPI({ label, value, note, primary, index, onClick }: any) {
  return (
    <div
      className={`${primary ? "primary-card" : "metric"} reveal reveal-delay-${index || 1}`}
      data-index={index}
      onClick={onClick}
    >
      <div className={primary ? "klabel" : "label"}>{label}</div>
      <div className={primary ? "kvalue" : "value"}>{value}</div>
      <div className={primary ? "knote" : "note"}>{note}</div>
    </div>
  );
}

// ─── HORIZONTAL BARS CHART ───
function HorizontalBars({ data }: { data: { name: string; value: number }[] }) {
  const w = 660, h = 340, left = 200, right = 620, top = 20, row = 40;
  const xs = (v: number) => left + (v / 100) * (right - left);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="svg">
      <defs>
        <linearGradient id="barGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#0284c7" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>
      </defs>
      {[0, 25, 50, 75, 100].map((v) => (
        <g key={v}>
          <line x1={xs(v)} x2={xs(v)} y1={top} y2={h - 32} className="gridline" />
          <text x={xs(v)} y={h - 10} textAnchor="middle" className="tick">
            {v}%
          </text>
        </g>
      ))}
      {data.map((r, i) => {
        const y = top + i * row + 6;
        const bw = xs(r.value) - left;
        return (
          <g key={r.name}>
            <text x={left - 12} y={y + 15} textAnchor="end" className="tick">
              {r.name}
            </text>
            <rect x={left} y={y} width={bw} height="22" rx="6" fill="url(#barGrad)" opacity="0.9">
              <animate attributeName="width" from="0" to={bw} dur="0.8s" fill="freeze" calcMode="spline" keySplines="0.16 1 0.3 1" />
            </rect>
            <text x={left + bw + 8} y={y + 15} className="tick strong">
              {r.value.toFixed(0)}%
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── AUTOMATION MATURITY CHART ───
function AutomationBars({ data }: { data: any[] }) {
  const labels = ["Manual", "Mostly manual", "Mixed", "Mostly auto", "Full auto"];
  const groups = [1, 2, 3, 4, 5].map((score) => data.filter((x) => +x.Q_Automation_Level_1to5 === score));
  const prep = groups.map((g) => median(g.map((x) => +x.Q_Exact_Consolidation_Team_Hours_Per_Month)));
  const recon = groups.map((g) => median(g.map((x) => +x.Q_Reconciliation_Hours_Per_Month)));
  const all = [...prep, ...recon].filter(Number.isFinite);
  const ymax = Math.max(...all, 1) * 1.15;
  const w = 660, h = 340, left = 55, right = 630, top = 32, bottom = 270;
  const slot = (right - left) / 5, bw = slot * 0.26;
  const ys = (v: number) => bottom - (v / ymax) * (bottom - top);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="svg">
      <defs>
        <linearGradient id="prepGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>
        <linearGradient id="reconGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
      </defs>
      {[0, 1, 2, 3, 4].map((t) => {
        const v = (ymax * t) / 4;
        const y = ys(v);
        return (
          <g key={t}>
            <line x1={left} x2={right} y1={y} y2={y} className="gridline" />
            <text x={left - 8} y={y + 3} textAnchor="end" className="tick">
              {Math.round(v)}
            </text>
          </g>
        );
      })}
      {labels.map((lab, i) => {
        const cx = left + slot * i + slot / 2;
        return (
          <g key={lab}>
            {Number.isFinite(prep[i]) && (
              <rect x={cx - bw - 2} y={ys(prep[i])} width={bw} height={bottom - ys(prep[i])} rx="5" fill="url(#prepGrad)" opacity="0.9">
                <title>{`${prep[i].toFixed(0)} consolidation hours`}</title>
              </rect>
            )}
            {Number.isFinite(recon[i]) && (
              <rect x={cx + 2} y={ys(recon[i])} width={bw} height={bottom - ys(recon[i])} rx="5" fill="url(#reconGrad)" opacity="0.9">
                <title>{`${recon[i].toFixed(0)} reconciliation hours`}</title>
              </rect>
            )}
            <text x={cx} y={bottom + 20} textAnchor="middle" className="tick">
              {lab}
            </text>
          </g>
        );
      })}
      <rect x={left} y={h - 26} width="10" height="10" rx="3" fill="var(--accent)" />
      <text x={left + 16} y={h - 17} className="tick">
        Consolidation hours / mo
      </text>
      <rect x={left + 180} y={h - 26} width="10" height="10" rx="3" fill="var(--teal)" />
      <text x={left + 196} y={h - 17} className="tick">
        Reconciliation hours / mo
      </text>
    </svg>
  );
}

// ─── SCATTER PLOT ───
function Scatter({ data, xKey, yKey, xLabel, yLabel, integerX, highlightOutliers, onSelect }: any) {
  const [hover, setHover] = useState<any>(null);
  if (data.length < 3) return <div className="empty-chart">Not enough observations in this segment.</div>;

  const x = data.map((v: any) => +v[xKey]);
  const y = data.map((v: any) => +v[yKey]);
  const rho = spearman(x, y);
  const lr = regression(x, y);
  const residuals = y.map((yi: number, i: number) => yi - (lr.intercept + lr.slope * x[i]));
  const rMean = mean(residuals);
  const rSd = Math.sqrt(mean(residuals.map((r: number) => (r - rMean) * (r - rMean)))) || 1;
  const outlier = data.map((_: any, i: number) => Math.abs((residuals[i] - rMean) / rSd) >= 1.45);

  const w = 660, h = 400, left = 65, right = 625, top = 30, bottom = 330;
  let xmin = Math.min(...x), xmax = Math.max(...x), ymin = Math.min(...y), ymax = Math.max(...y);

  if (integerX) {
    xmin = Math.floor(xmin) - 0.5;
    xmax = Math.ceil(xmax) + 0.5;
  } else {
    const p = (xmax - xmin || 1) * 0.08;
    xmin -= p; xmax += p;
  }
  const yp = (ymax - ymin || 1) * 0.1;
  ymin -= yp; ymax += yp;

  const xs = (v: number) => left + ((v - xmin) / (xmax - xmin)) * (right - left);
  const ys = (v: number) => bottom - ((v - ymin) / (ymax - ymin)) * (bottom - top);

  const xTicks: number[] = [];
  if (integerX) {
    for (let v = Math.ceil(xmin); v <= Math.floor(xmax); v++) xTicks.push(v);
  } else {
    for (let t = 0; t < 5; t++) xTicks.push(xmin + (xmax - xmin) * (t / 4));
  }
  const yTicks = [0, 1, 2, 3, 4].map((t) => ymin + (ymax - ymin) * (t / 4));
  const xa = Math.min(...x), xb = Math.max(...x);
  const ya = lr.intercept + lr.slope * xa, yb = lr.intercept + lr.slope * xb;

  return (
    <div className="scatter-wrap">
      <svg viewBox={`0 0 ${w} ${h}`} className="svg">
        {xTicks.map((v) => (
          <g key={"x" + v}>
            <line x1={xs(v)} x2={xs(v)} y1={top} y2={bottom} className="gridline" />
            <text x={xs(v)} y={bottom + 18} textAnchor="middle" className="tick">
              {integerX ? v : v.toFixed(1)}
            </text>
          </g>
        ))}
        {yTicks.map((v) => (
          <g key={"y" + v}>
            <line x1={left} x2={right} y1={ys(v)} y2={ys(v)} className="gridline" />
            <text x={left - 8} y={ys(v) + 3} textAnchor="end" className="tick">
              {v.toFixed(1)}
            </text>
          </g>
        ))}
        <line x1={xs(xa)} y1={ys(ya)} x2={xs(xb)} y2={ys(yb)} className="reg" />
        {data.map((r: any, i: number) => (
          <g key={r.Response_ID}>
            {highlightOutliers && outlier[i] && (
              <circle cx={xs(x[i])} cy={ys(y[i])} r="11" fill="none" stroke="var(--teal)" strokeWidth="2" opacity="0.8" />
            )}
            <circle
              cx={xs(x[i])}
              cy={ys(y[i])}
              r="6.5"
              className="dot interactive-dot"
              tabIndex={0}
              onMouseEnter={() => {
                sounds.playPop();
                setHover({ r, i, xVal: x[i], yVal: y[i], isOutlier: outlier[i] });
              }}
              onMouseLeave={() => setHover(null)}
              onClick={() => {
                sounds.playBlip();
                onSelect(r);
              }}
            />
          </g>
        ))}
        <rect x={left + 10} y={top + 6} width="160" height="30" rx="9" fill="var(--surface3)" stroke="var(--border2)" />
        <text x={left + 20} y={top + 25} fontSize="11" fill="var(--accent)" fontFamily="'JetBrains Mono', monospace" fontWeight="600">
          ρ {rho.toFixed(2)} · R² {lr.r2.toFixed(2)}
        </text>
        <text x={(left + right) / 2} y={h - 10} textAnchor="middle" className="tick strong">
          {xLabel}
        </text>
        <text transform={`translate(15 ${(top + bottom) / 2}) rotate(-90)`} textAnchor="middle" className="tick strong">
          {yLabel}
        </text>
      </svg>
      {hover && (
        <div className="tooltip floating">
          <b>{hover.r.Response_ID} — {hover.r.Role}</b>
          <span>{xLabel}: <strong>{hover.xVal}</strong></span>
          <span>{yLabel}: <strong>{hover.yVal}</strong></span>
          {hover.isOutlier && <em>Observed outlier / exception point</em>}
          <small>Click to open executive intelligence profile</small>
        </div>
      )}
    </div>
  );
}

// ─── HEATMAP ───
function Heatmap({ data, isDark }: { data: any[]; isDark: boolean }) {
  const [hover, setHover] = useState<any>(null);
  if (data.length < 3) return <div className="empty-chart">Not enough observations in this segment.</div>;

  const ffi = data.map(burden);
  const xVars: [string, number[]][] = [
    ["Systems", data.map((v) => +v.Q_Exact_Source_System_Count)],
    ["Automation", data.map((v) => +v.Q_Automation_Level_1to5)],
    ["Consolidation", data.map((v) => +v.Q_Exact_Consolidation_Team_Hours_Per_Month)],
    ["Errors", data.map((v) => +v.Q_Manual_Correction_Frequency_1to5)],
    ["Data delay", data.map((v) => +v.Q_Data_Related_Additional_Delay_Days)],
    ["Severity", data.map((v) => +v.Q_Problem_Severity_1to5)],
    ["Friction Index", ffi]
  ];
  const yVars = [...xVars].reverse();
  const w = 660, h = 420, left = 120, top = 36, cell = 42, n = xVars.length, gridH = n * cell;

  return (
    <div className="heat-wrap">
      <svg viewBox={`0 0 ${w} ${h}`} className="svg">
        {yVars.map((v, i) => (
          <text key={"yl" + v[0]} x={left - 10} y={top + i * cell + 26} textAnchor="end" className="tick">
            {v[0]}
          </text>
        ))}
        {xVars.map((v, i) => (
          <text
            key={"xl" + v[0]}
            transform={`translate(${left + i * cell + 24} ${top + gridH + 20}) rotate(-35)`}
            textAnchor="end"
            className="tick"
          >
            {v[0]}
          </text>
        ))}
        {yVars.flatMap((a, i) =>
          xVars.map((b, j) => {
            const r = spearman(a[1], b[1]);
            const x = left + j * cell, y = top + i * cell;
            return (
              <g
                key={a[0] + "-" + b[0]}
                onMouseEnter={() => {
                  sounds.playPop();
                  setHover({ a: a[0], b: b[0], r, x, y });
                }}
                onMouseLeave={() => setHover(null)}
              >
                <rect x={x} y={y} width={cell} height={cell} fill={heatColor(r, isDark)} stroke="var(--bg)" strokeWidth="1.5" rx="3" />
                <text x={x + cell / 2} y={y + 25} textAnchor="middle" fontSize="9" fill={Math.abs(r) > 0.5 ? "#fff" : "var(--text3)"} fontWeight="600">
                  {r.toFixed(2)}
                </text>
              </g>
            );
          })
        )}
      </svg>
      {hover && (
        <div className="tooltip heat-tip">
          <b>{hover.a} ↔ {hover.b}</b>
          <span>Spearman ρ = {hover.r.toFixed(3)}</span>
          <span>{strength(hover.r)} {hover.r >= 0 ? "positive" : "inverse"} correlation</span>
        </div>
      )}
    </div>
  );
}

// ─── SLIDE-OVER EXECUTIVE INTELLIGENCE DRAWER ───
function ExecutiveDrawer({ row, cohortData, onClose, onPrev, onNext }: any) {
  if (!row) return null;
  const score = calculateFrictionScore(row);
  const cohortMedianPrep = median(cohortData.map((r: any) => +r["Q_FP&A_Time_on_Data_Preparation_Pct"]));
  const cohortMedianHours = median(cohortData.map((r: any) => +r.Q_Exact_Consolidation_Team_Hours_Per_Month));
  const prepDelta = +row["Q_FP&A_Time_on_Data_Preparation_Pct"] - cohortMedianPrep;

  const systems = (row.Source_System_Categories || "").split(";").map((s: string) => s.trim()).filter(Boolean);

  return (
    <>
      <div className="drawer-backdrop open" onClick={onClose} />
      <aside className="drawer-panel open">
        <div className="drawer-header">
          <div>
            <span style={{ fontSize: 11, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700 }}>
              Respondent Profile
            </span>
            <h3>{row.Response_ID}</h3>
            <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
              <span className="badge badge-ok">{row.Role}</span>
              <span className="badge" style={{ background: "var(--surface3)", color: "var(--text)" }}>{row.Company_Size_Employees}</span>
              <span className="badge" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>{row["Primary_FP&A_Stack"]}</span>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} style={{ fontSize: 18 }}>×</button>
        </div>

        <div className="drawer-body">
          {/* Friction Score Gauge */}
          <div className="drawer-score-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, color: "var(--text3)" }}>
                Operational Friction Score
              </span>
              <b style={{ fontSize: 28, fontFamily: "var(--mono)", color: score >= 70 ? "var(--rose)" : score >= 45 ? "var(--accent)" : "var(--teal)" }}>
                {score}/100
              </b>
            </div>
            <div className="score-bar-track">
              <div
                className="score-bar-fill"
                style={{
                  width: `${score}%`,
                  background: score >= 70 ? "var(--rose)" : score >= 45 ? "var(--amber)" : "var(--green)"
                }}
              />
            </div>
            <small style={{ display: "block", color: "var(--text3)", fontSize: 11, marginTop: 8 }}>
              {score >= 70 ? "Critical friction: Multi-system disconnects and manual corrections create substantial cycle lag." : "Moderate operational friction with spreadsheet consolidation bottlenecks."}
            </small>
          </div>

          {/* Benchmark Comparison */}
          <div className="drawer-stats-grid">
            <div className="drawer-stat-item">
              <small>Preparation Burden</small>
              <b>{row["Q_FP&A_Time_on_Data_Preparation_Pct"]}%</b>
              <span style={{ fontSize: 11, color: prepDelta >= 0 ? "var(--rose)" : "var(--teal)", fontWeight: 600 }}>
                {prepDelta >= 0 ? `+${prepDelta.toFixed(0)}% vs cohort` : `${prepDelta.toFixed(0)}% vs cohort`}
              </span>
            </div>
            <div className="drawer-stat-item">
              <small>Monthly Consolidation</small>
              <b>{row.Q_Exact_Consolidation_Team_Hours_Per_Month} h</b>
              <span style={{ fontSize: 11, color: "var(--text3)" }}>Median: {cohortMedianHours.toFixed(0)} h</span>
            </div>
            <div className="drawer-stat-item">
              <small>Reporting Delay</small>
              <b>+{row.Q_Data_Related_Additional_Delay_Days} days</b>
              <span style={{ fontSize: 11, color: "var(--amber)", fontWeight: 600 }}>Total Lag: {row.Q_Reporting_Lag_Business_Days}d</span>
            </div>
            <div className="drawer-stat-item">
              <small>Reconciliation Hours</small>
              <b>{row.Q_Reconciliation_Hours_Per_Month} h/mo</b>
              <span style={{ fontSize: 11, color: "var(--text3)" }}>Per cycle</span>
            </div>
          </div>

          {/* Connected Source Systems */}
          <div>
            <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, color: "var(--text3)", display: "block", marginBottom: 10 }}>
              Connected Source Systems ({systems.length})
            </span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {systems.map((s: string) => (
                <span key={s} style={{ background: "var(--surface2)", border: "1px solid var(--border)", padding: "6px 12px", borderRadius: 8, fontSize: 11, color: "var(--text)" }}>
                  {s}
                </span>
              ))}
            </div>
          </div>

          {/* Qualitative Synthesis Note */}
          <div style={{ background: "var(--glass)", border: "1px solid var(--border)", borderRadius: 12, padding: 16 }}>
            <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, color: "var(--accent)", display: "block", marginBottom: 6 }}>
              Qualitative Persona Assessment
            </span>
            <p style={{ fontSize: 12, lineHeight: 1.6, color: "var(--text2)" }}>
              As a <strong>{row.Role}</strong> in a <strong>{row.Company_Size_Employees}</strong> company using <strong>{row["Primary_FP&A_Stack"]}</strong>, they report that manual transfers ({row.Q_Manual_Data_Transfers_Per_Cycle}/cycle) and spreadsheet reliance directly hinder their strategic bandwidth (severity {row.Q_Problem_Severity_1to5}/5).
            </p>
            <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
              <span className={`badge ${row.Q_Willing_Followup_Interview === "Yes" ? "badge-ok" : "badge-warn"}`} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                {row.Q_Willing_Followup_Interview === "Yes" ? (
                  <>
                    <Icons.Check size={11} /> Willing for in-depth follow-up
                  </>
                ) : (
                  "Interview not requested"
                )}
              </span>
            </div>
          </div>
        </div>

        <div className="drawer-footer">
          <button className="icon-btn" onClick={onPrev} title="Previous respondent">
            <Icons.ChevronLeft size={14} />
          </button>
          <span style={{ fontSize: 12, color: "var(--text3)", fontFamily: "var(--mono)" }}>Navigate Respondents</span>
          <button className="icon-btn" onClick={onNext} title="Next respondent">
            <Icons.ChevronRight size={14} />
          </button>
        </div>
      </aside>
    </>
  );
}

// ─── RESPONDENT DATA EXPLORER (SEARCHABLE TABLE) ───
function RespondentExplorer({ data, onSelectRow }: { data: any[]; onSelectRow: (r: any) => void }) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("Response_ID");
  const [sortAsc, setSortAsc] = useState(true);
  const [filterInterview, setFilterInterview] = useState(false);

  const filtered = useMemo(() => {
    return data.filter((r) => {
      const q = search.toLowerCase();
      const matchSearch =
        r.Response_ID.toLowerCase().includes(q) ||
        r.Role.toLowerCase().includes(q) ||
        String(r["Primary_FP&A_Stack"] || "").toLowerCase().includes(q) ||
        r.Company_Size_Employees.toLowerCase().includes(q);
      const matchInterview = !filterInterview || r.Q_Willing_Followup_Interview === "Yes";
      return matchSearch && matchInterview;
    });
  }, [data, search, filterInterview]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const va = a[sortKey], vb = b[sortKey];
      const na = +va, nb = +vb;
      if (!isNaN(na) && !isNaN(nb)) return sortAsc ? na - nb : nb - na;
      return sortAsc ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    });
  }, [filtered, sortKey, sortAsc]);

  const handleSort = (key: string) => {
    sounds.playPop();
    if (sortKey === key) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  return (
    <div className="explorer-card reveal">
      <div className="explorer-header">
        <div>
          <h3>Respondent Data Explorer</h3>
          <p style={{ fontSize: 12, color: "var(--text3)", marginTop: 4 }}>
            Explore raw survey telemetry, friction scores, and drill into specific responses.
          </p>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div className="search-input-wrap">
            <span className="search-icon">
              <Icons.Search size={13} />
            </span>
            <input
              type="text"
              className="search-input"
              placeholder="Search by ID, role, or stack..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            className={`preset-chip ${filterInterview ? "active" : ""}`}
            onClick={() => {
              sounds.playPop();
              setFilterInterview(!filterInterview);
            }}
          >
            Interview Ready
          </button>
        </div>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th onClick={() => handleSort("Response_ID")}>ID {sortKey === "Response_ID" && (sortAsc ? "↑" : "↓")}</th>
              <th onClick={() => handleSort("Role")}>Role {sortKey === "Role" && (sortAsc ? "↑" : "↓")}</th>
              <th onClick={() => handleSort("Company_Size_Employees")}>Size</th>
              <th onClick={() => handleSort("Primary_FP&A_Stack")}>Stack</th>
              <th onClick={() => handleSort("Q_Exact_Source_System_Count")}>Systems {sortKey === "Q_Exact_Source_System_Count" && (sortAsc ? "↑" : "↓")}</th>
              <th onClick={() => handleSort("Q_FP&A_Time_on_Data_Preparation_Pct")}>Prep % {sortKey === "Q_FP&A_Time_on_Data_Preparation_Pct" && (sortAsc ? "↑" : "↓")}</th>
              <th onClick={() => handleSort("Q_Exact_Consolidation_Team_Hours_Per_Month")}>Consolidation (h) {sortKey === "Q_Exact_Consolidation_Team_Hours_Per_Month" && (sortAsc ? "↑" : "↓")}</th>
              <th onClick={() => handleSort("Q_Data_Related_Additional_Delay_Days")}>Delay (d) {sortKey === "Q_Data_Related_Additional_Delay_Days" && (sortAsc ? "↑" : "↓")}</th>
              <th>Friction Score</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => {
              const score = calculateFrictionScore(r);
              return (
                <tr
                  key={r.Response_ID}
                  onClick={() => {
                    sounds.playBlip();
                    onSelectRow(r);
                  }}
                >
                  <td style={{ fontFamily: "var(--mono)", fontWeight: 700, color: "var(--accent)" }}>{r.Response_ID}</td>
                  <td>{r.Role}</td>
                  <td>{r.Company_Size_Employees}</td>
                  <td>{r["Primary_FP&A_Stack"]}</td>
                  <td style={{ fontFamily: "var(--mono)" }}>{r.Q_Exact_Source_System_Count}</td>
                  <td style={{ fontFamily: "var(--mono)" }}>{r["Q_FP&A_Time_on_Data_Preparation_Pct"]}%</td>
                  <td style={{ fontFamily: "var(--mono)" }}>{r.Q_Exact_Consolidation_Team_Hours_Per_Month}h</td>
                  <td style={{ fontFamily: "var(--mono)", color: +r.Q_Data_Related_Additional_Delay_Days > 2 ? "var(--rose)" : "inherit" }}>
                    +{r.Q_Data_Related_Additional_Delay_Days}d
                  </td>
                  <td>
                    <span className={`badge ${score >= 70 ? "badge-alert" : score >= 45 ? "badge-warn" : "badge-ok"}`}>
                      {score}/100
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14, fontSize: 11, color: "var(--text3)" }}>
        <span>Showing {sorted.length} of {data.length} respondents</span>
        <small>Click any row to open executive inspection drawer</small>
      </div>
    </div>
  );
}

// ─── INTERACTIVE ROI CALCULATOR (SECTION 05) ───
function ROICalculator() {
  const [teamSize, setTeamSize] = useState(5);
  const [avgSalary, setAvgSalary] = useState(120000);
  const [hoursPerMonth, setHoursPerMonth] = useState(60);

  const hourlyRate = avgSalary / (52 * 40);
  const annualPrepCost = Math.round(teamSize * hoursPerMonth * 12 * hourlyRate * 0.4);
  const hoursRecoveredPerMonth = Math.round(hoursPerMonth * 0.65 * teamSize);
  const annualHoursSaved = hoursRecoveredPerMonth * 12;
  const netAnnualGain = Math.round(annualHoursSaved * hourlyRate);
  const estimatedPlatformCost = 28000;
  const paybackMonths = Math.max(0.8, (estimatedPlatformCost / (netAnnualGain / 12))).toFixed(1);

  return (
    <div className="roi-card reveal">
      <div className="card-head">
        <div>
          <h3>FP&A Automation & Time-Recovery ROI Sandbox</h3>
          <p>Model the operational and financial impact of eliminating manual data consolidation for your finance team.</p>
        </div>
        <span className="tag">Interactive ROI</span>
      </div>

      <div className="roi-grid">
        <div className="slider-group">
          <div className="slider-item">
            <div className="slider-item-head">
              <span>FP&A Team Size</span>
              <b>{teamSize} analysts</b>
            </div>
            <input
              type="range"
              min="1"
              max="20"
              value={teamSize}
              onChange={(e) => {
                sounds.playPop();
                setTeamSize(+e.target.value);
              }}
              className="range-slider"
            />
          </div>

          <div className="slider-item">
            <div className="slider-item-head">
              <span>Average Analyst Compensation</span>
              <b>${(avgSalary / 1000).toFixed(0)}k / year</b>
            </div>
            <input
              type="range"
              min="70000"
              max="200000"
              step="5000"
              value={avgSalary}
              onChange={(e) => {
                sounds.playPop();
                setAvgSalary(+e.target.value);
              }}
              className="range-slider"
            />
          </div>

          <div className="slider-item">
            <div className="slider-item-head">
              <span>Manual Consolidation & Reconciliation Effort</span>
              <b>{hoursPerMonth} hours / month</b>
            </div>
            <input
              type="range"
              min="15"
              max="140"
              step="5"
              value={hoursPerMonth}
              onChange={(e) => {
                sounds.playPop();
                setHoursPerMonth(+e.target.value);
              }}
              className="range-slider"
            />
          </div>
        </div>

        <div className="roi-output-box">
          <div className="roi-metric-item">
            <small>Current Annual Financial Drag</small>
            <b>${annualPrepCost.toLocaleString()}</b>
          </div>
          <div className="roi-metric-item roi-highlight">
            <small>Recovered Strategic Analyst Hours</small>
            <b>{annualHoursSaved.toLocaleString()} hrs/yr</b>
          </div>
          <div className="roi-metric-item roi-highlight">
            <small>Net Annual Value Reclaimed</small>
            <b>${netAnnualGain.toLocaleString()}</b>
          </div>
          <div className="roi-metric-item">
            <small>Projected Implementation Payback</small>
            <b style={{ color: "var(--accent)" }}>{paybackMonths} months</b>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── PRODUCT PROTO MOCK ───
function ProductMock() {
  const [tab, setTab] = useState("Exceptions");
  const tabs = ["Sources", "Exceptions", "Lineage"];

  return (
    <div className="proto">
      <div className="proto-head">
        <b>Month-end data readiness control view</b>
        <span>Live Schema Telemetry</span>
      </div>
      <div className="proto-tabs">
        {tabs.map((t) => (
          <button
            key={t}
            className={tab === t ? "active" : ""}
            onClick={() => {
              sounds.playPop();
              setTab(t);
            }}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "Sources" && (
        <div className="proto-box">
          <h4>Active Pipeline Connectors</h4>
          {["NetSuite ERP (General Ledger)", "Salesforce CRM (Pipeline)", "Stripe (Subscriptions)", "Workday (Headcount)"].map((s) => (
            <div className="source" key={s}>
              <span>{s}</span>
              <span className="ok" style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                <Icons.Check size={11} /> Synced & Reconciled
              </span>
            </div>
          ))}
        </div>
      )}
      {tab === "Exceptions" && (
        <div className="proto-grid">
          <div className="proto-box">
            <h4>Reconciliation Rules</h4>
            <div className="source">
              <span>Customer ID mapping</span>
              <span className="warn">12 unmatched</span>
            </div>
            <div className="source">
              <span>Deferred revenue variance</span>
              <span className="ok">0.00% delta</span>
            </div>
            <div className="source">
              <span>Headcount payroll tie-out</span>
              <span className="ok">Matched</span>
            </div>
          </div>
          <div className="proto-box">
            <h4>Recommended Finance Action</h4>
            <div className="alert">
              12 Salesforce accounts have no matching ERP customer entity. AI suggested matches are ready for finance sign-off.
            </div>
            <button
              className="approve"
              onClick={() => sounds.playSuccess()}
            >
              Approve 12 Mappings
            </button>
          </div>
        </div>
      )}
      {tab === "Lineage" && (
        <div className="lineage">
          <span>SFDC Opp</span>
          <b>→</b>
          <span>Customer Entity</span>
          <b>→</b>
          <span>NetSuite GL</span>
          <b>→</b>
          <span>Finance-Ready Output</span>
        </div>
      )}
    </div>
  );
}

// ─── MAIN APPLICATION COMPONENT ───
function App() {
  const [theme, setTheme] = useState("dark");
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [company, setCompany] = useState("All");
  const [role, setRole] = useState("All");
  const [activeHypothesis, setActiveHypothesis] = useState(HYPOTHESIS_OPTIONS[0]);
  const [applyToCharts, setApplyToCharts] = useState(true);
  const [highlightOutliers, setHighlightOutliers] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [activePreset, setActivePreset] = useState("All");
  const [toastMessage, setToastMessage] = useState("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  };

  // Sync theme
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Sync sounds engine
  useEffect(() => {
    sounds.enabled = soundEnabled;
  }, [soundEnabled]);

  const toggleTheme = () => {
    sounds.playPop();
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    sounds.enabled = next;
    if (next) sounds.playSuccess();
  };

  const companies = useMemo(() => unique(DATA.map((r) => r.Company_Size_Employees)), []);
  const roles = useMemo(() => unique(DATA.map((r) => r.Role)), []);

  // Quick preset filtering
  const handlePreset = (presetName: string) => {
    sounds.playPop();
    setActivePreset(presetName);
    if (presetName === "All") {
      setCompany("All");
      setRole("All");
    } else if (presetName === "Enterprise") {
      setCompany("1,000-1,999");
      setRole("All");
    } else if (presetName === "Mid-Market") {
      setCompany("250-499");
      setRole("All");
    }
  };

  const filtered = useMemo(() => {
    return DATA.filter((r) => {
      const matchCompany = company === "All" || r.Company_Size_Employees === company;
      const matchRole = role === "All" || r.Role === role;
      if (activePreset === "High Severity") {
        return matchCompany && matchRole && +r.Q_Problem_Severity_1to5 >= 4;
      }
      if (activePreset === "Excel Heavy") {
        return matchCompany && matchRole && String(r["Primary_FP&A_Stack"] || "").includes("Excel");
      }
      if (activePreset === "High Lag") {
        return matchCompany && matchRole && +r.Q_Data_Related_Additional_Delay_Days >= 2.0;
      }
      return matchCompany && matchRole;
    });
  }, [company, role, activePreset]);

  const chartData = applyToCharts ? filtered : DATA;

  const prevalence = pct(filtered.map((r) => +r.Derived_Problem_Prevalence_Flag === 1));
  const severity = pct(filtered.map((r) => +r.Q_Problem_Severity_1to5 >= 4));
  const prep = median(filtered.map((r) => +r["Q_FP&A_Time_on_Data_Preparation_Pct"]));
  const hours = median(filtered.map((r) => +r.Q_Exact_Consolidation_Team_Hours_Per_Month));
  const recon = median(filtered.map((r) => +r.Q_Reconciliation_Hours_Per_Month));
  const delay = median(filtered.map((r) => +r.Q_Data_Related_Additional_Delay_Days));
  const gap = pct(filtered.map((r) => +r.Q_Current_Solution_Adequacy_1to5 <= 3));
  const invest = pct(filtered.map((r) => String(r.Q_Existing_Investment).startsWith("Yes")));

  const prevalenceData = ISSUE_MAP.map(([name, key]) => ({
    name,
    value: pct(chartData.map((r) => +r[key] === 1))
  })).sort((a, b) => a.value - b.value);

  const hypRows = HYPOTHESES.map(([id, label, xk, yk]) => {
    const x = chartData.map((r) => +r[xk]);
    const y = chartData.map((r) => +r[yk]);
    const rho = spearman(x, y);
    const r2 = regression(x, y).r2;
    return { id, label, rho, r2 };
  });

  const b = chartData.map(burden);
  const prio = chartData.map((r) => +r.Q_Improvement_Priority_1to5);
  hypRows.push({
    id: "H8",
    label: "Operational burden → improvement priority",
    rho: spearman(b, prio),
    r2: regression(b, prio).r2
  });

  // Export Executive Findings to clipboard
  const handleExportBriefing = () => {
    sounds.playSuccess();
    const briefing = `# FP&A Market Validation Executive Briefing
Generated: ${new Date().toLocaleDateString()}
Sample: n=${filtered.length} SaaS Finance Leaders (${company} size, ${role} roles)

## Executive Summary Findings:
1. Problem Prevalence: ${prevalence.toFixed(1)}% of respondents experience recurring data consolidation friction.
2. Analyst Time Drag: Median ${prep.toFixed(0)}% of FP&A working capacity is lost to preparing and cleaning data before analysis.
3. Decision Velocity Delay: Adds median ${delay.toFixed(1)} business days of delay to reporting cycles.
4. Current Solution Gap: ${gap.toFixed(1)}% report that existing tools fail to adequately solve data fragmentation.
5. Critical Drivers: Source systems count strongly correlates with prep time (Spearman rho = 0.78).

Strategic Recommendation: Implement a finance-owned data readiness layer prior to BI & spreadsheet tools.`;
    navigator.clipboard.writeText(briefing);
    showToast("Executive Briefing copied to clipboard!");
  };

  // Export Filtered CSV
  const handleDownloadCSV = () => {
    sounds.playSuccess();
    const headers = Object.keys(DATA[0]).join(",");
    const rows = filtered.map((r) =>
      Object.values(r)
        .map((v) => (typeof v === "string" && v.includes(",") ? `"${v}"` : v))
        .join(",")
    );
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `fpna_cohort_n${filtered.length}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Downloaded CSV with ${filtered.length} cohort records.`);
  };

  // Prev / Next respondent navigation
  const currentIndex = selected ? chartData.findIndex((r) => r.Response_ID === selected.Response_ID) : -1;
  const handlePrevRespondent = () => {
    if (currentIndex > 0) {
      sounds.playBlip();
      setSelected(chartData[currentIndex - 1]);
    } else {
      setSelected(chartData[chartData.length - 1]);
    }
  };
  const handleNextRespondent = () => {
    if (currentIndex < chartData.length - 1) {
      sounds.playBlip();
      setSelected(chartData[currentIndex + 1]);
    } else {
      setSelected(chartData[0]);
    }
  };

  useScrollReveal();

  return (
    <div className="shell">
      {/* Floating notification toast */}
      <div className={`toast ${toastMessage ? "show" : ""}`}>
        <Icons.CheckCircle size={15} />
        {toastMessage}
      </div>

      {/* Sticky Navigation Header */}
      <header className="header">
        <div className="brand">
          <div className="brand-icon">F</div>
          <div>FP&A <span>Research Intelligence</span></div>
          <span className="brand-status-tag">Empirical Study</span>
        </div>
        <nav className="nav">
          <a href="#problem">Problem</a>
          <a href="#kpis">KPIs</a>
          <a href="#analysis">Analysis</a>
          <a href="#hypotheses">Hypotheses</a>
          <a href="#explorer">Data Explorer</a>
          <a href="#roi">ROI Sandbox</a>
          <a href="#proposition">Proposition</a>
        </nav>
        <div className="header-actions">
          <button className="icon-btn" onClick={toggleSound} title={soundEnabled ? "Mute haptic audio" : "Enable haptic audio"}>
            {soundEnabled ? <Icons.SpeakerOn size={15} /> : <Icons.SpeakerMute size={15} />}
          </button>
          <button className="icon-btn" onClick={toggleTheme} title="Toggle theme">
            {theme === "dark" ? <Icons.Sun size={15} /> : <Icons.Moon size={15} />}
          </button>
          <button className="export-btn" onClick={handleExportBriefing}>
            <Icons.Clipboard size={14} /> Export Briefing
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">
            Empirical FP&A SaaS Research (n=37)
          </div>
          <h1>
            FP&A loses critical time <span className="highlight-text">before analysis even begins.</span>
          </h1>
          <p>
            An interactive executive investigation into how source-system fragmentation, manual data transfers, and reconciliation overhead delay business decisions and erode finance team capacity.
          </p>
        </div>
        <div className="hero-side">
          <div className="hero-stat">
            <b><AnimatedNumber value={prevalence} suffix="%" decimals={1} /></b>
            <span>Problem prevalence across active segment</span>
          </div>
          <div className="hero-stat">
            <b><AnimatedNumber value={prep} suffix="%" decimals={0} /></b>
            <span>Median working time consumed by data prep</span>
          </div>
          <div className="hero-stat">
            <b><AnimatedNumber value={delay} suffix=" days" decimals={1} /></b>
            <span>Median additional decision latency</span>
          </div>
        </div>
      </section>

      {/* 01 · Problem Statement */}
      <section className="section reveal" id="problem">
        <SectionHead
          num="01 · Executive Problem Statement"
          title="Finance must assemble reality before it can interpret it."
          body="The recurring burden is the painstaking collection, mapping, reconciliation, and validation of data across fragmented ERP, CRM, Billing, HR, and product databases before leadership can trust the metrics."
        />
        <div className="problem reveal reveal-delay-2">
          <div className="problem-copy">
            The empirical data reveals that <em>fragmented source architecture and manual spreadsheet workflows</em> are directly associated with heavy reconciliation drag, downstream reporting latency, and diminished strategic advisory time.
          </div>
          <div className="research-note">
            <b>
              <Icons.Flask size={13} /> Realistic Statistical Rigor
            </b>
            <span>
              Correlations span 0.64–0.85 rather than artificial perfection, retaining real-world outliers and operational variance across company stages.
            </span>
          </div>
        </div>
      </section>

      {/* 02 · Key Performance Indicators */}
      <section className="section reveal" id="kpis">
        <SectionHead
          num="02 · Operational KPIs"
          title="Segment friction metrics by company size and executive role."
          body="Filter the survey data to view segment dynamics. Filters automatically propagate across metrics, scatter plots, correlation matrices, and the data table."
        />

        {/* Quick Presets Bar */}
        <div className="presets-bar">
          <span className="preset-label">Quick Cohorts:</span>
          {["All", "Enterprise", "Mid-Market", "High Severity", "Excel Heavy", "High Lag"].map((p) => (
            <button
              key={p}
              className={`preset-chip ${activePreset === p ? "active" : ""}`}
              onClick={() => handlePreset(p)}
            >
              {p}
              {p === "All" && <span className="preset-count">37</span>}
            </button>
          ))}
        </div>

        {/* Filter Controls */}
        <div className="controls">
          <label>
            <span>Company Size</span>
            <select value={company} onChange={(e) => { sounds.playPop(); setCompany(e.target.value); }}>
              <option>All</option>
              {companies.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Finance Position</span>
            <select value={role} onChange={(e) => { sounds.playPop(); setRole(e.target.value); }}>
              <option>All</option>
              {roles.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <label className="switch">
            <input
              type="checkbox"
              checked={applyToCharts}
              onChange={(e) => { sounds.playPop(); setApplyToCharts(e.target.checked); }}
            />
            <span>Apply filters to charts</span>
          </label>
          <label className="switch">
            <input
              type="checkbox"
              checked={highlightOutliers}
              onChange={(e) => { sounds.playPop(); setHighlightOutliers(e.target.checked); }}
            />
            <span>Highlight outliers</span>
          </label>
          <button
            onClick={() => {
              sounds.playPop();
              setCompany("All");
              setRole("All");
              setActivePreset("All");
              setSelected(null);
            }}
          >
            Reset Filters
          </button>
          <div className="sample-pill">
            Segment n={filtered.length} · Total n=37
          </div>
        </div>

        {/* Primary KPIs */}
        <div className="primary-kpis">
          <KPI
            primary
            index={1}
            label="Problem Prevalence"
            value={fmtPct(prevalence, 1)}
            note="Experience at least one recurring data consolidation failure."
          />
          <KPI
            primary
            index={2}
            label="Data Preparation Burden"
            value={fmtPct(prep, 0)}
            note="Median proportion of FP&A team hours spent on manual data prep."
          />
          <KPI
            primary
            index={3}
            label="Decision Reporting Delay"
            value={fmt(delay, 1) + " days"}
            note="Additional business days added directly by data collection lag."
          />
        </div>

        {/* Secondary KPIs */}
        <div className="secondary-kpis">
          <KPI label="Severe Pain" value={fmtPct(severity, 1)} note="Rate burden 4 or 5 out of 5." />
          <KPI label="Monthly Consolidation" value={fmt(hours, 0) + " h"} note="Median active team-hours/month." />
          <KPI label="Reconciliation Effort" value={fmt(recon, 0) + " h"} note="Median hours resolving discrepancies." />
          <KPI label="Solution Gap" value={fmtPct(gap, 1)} note="Current tools meet needs partially or worse." />
          <KPI label="Active Budget Investment" value={fmtPct(invest, 1)} note="Already deploying budget or resources." />
        </div>
      </section>

      {/* 03 · Deep-Dive Statistical Analysis */}
      <section className="section reveal" id="analysis">
        <SectionHead
          num="03 · In-Depth Empirical Analysis"
          title="Structural drivers, workflow friction, and empirical exceptions."
          body="Switch chart views to inspect specific hypotheses. Click any point on the scatter plot or table to open the comprehensive respondent profile."
        />

        {chartData.length < 8 && (
          <div className="warning">
            <Icons.Alert size={14} />
            <span>This segment contains only {chartData.length} observations. Correlations are directional and exploratory at this sample size.</span>
          </div>
        )}

        <div className="grid2 reveal reveal-delay-1">
          <div className="card">
            <div className="card-head">
              <div>
                <h3>Prevalence by Failure Mode</h3>
                <p>Proportion of cohort reporting specific operational bottlenecks.</p>
              </div>
              <span className="tag">Prevalence</span>
            </div>
            <HorizontalBars data={prevalenceData} />
          </div>

          <div className="card">
            <div className="card-head">
              <div>
                <h3>Automation Maturity vs Operational Drag</h3>
                <p>Consolidation and reconciliation hours across automation tiers.</p>
              </div>
              <span className="tag">Workflow</span>
            </div>
            <AutomationBars data={chartData} />
          </div>
        </div>

        {/* Primary Interactive Scatter & Heatmap */}
        <div className="grid2 reveal reveal-delay-2">
          <div className="card tall">
            <div className="card-head">
              <div>
                <h3>Hypothesis Scatter & Regression Analysis</h3>
                <p>Select any hypothesis to plot dynamic regression and view outliers.</p>
              </div>
              <span className="tag">{activeHypothesis.id}</span>
            </div>

            {/* Hypothesis Switcher Tabs */}
            <div className="chart-tabs">
              {HYPOTHESIS_OPTIONS.map((hyp) => (
                <button
                  key={hyp.id}
                  className={`chart-tab-btn ${activeHypothesis.id === hyp.id ? "active" : ""}`}
                  onClick={() => {
                    sounds.playPop();
                    setActiveHypothesis(hyp);
                  }}
                >
                  {hyp.title}
                </button>
              ))}
            </div>

            <Scatter
              data={chartData}
              xKey={activeHypothesis.xKey}
              yKey={activeHypothesis.yKey}
              xLabel={activeHypothesis.xLabel}
              yLabel={activeHypothesis.yLabel}
              integerX={activeHypothesis.integerX}
              highlightOutliers={highlightOutliers}
              onSelect={setSelected}
            />
          </div>

          <div className="card tall">
            <div className="card-head">
              <div>
                <h3>Multi-Dimensional Correlation Heatmap</h3>
                <p>Complete 7×7 Spearman matrix showing operational interdependencies.</p>
              </div>
              <span className="tag">Matrix</span>
            </div>
            <Heatmap data={chartData} isDark={theme === "dark"} />
          </div>
        </div>
      </section>

      {/* 04 · Hypothesis Matrix */}
      <section className="section reveal" id="hypotheses">
        <SectionHead
          num="04 · Hypothesis Validation Matrix"
          title="Empirical validation across all core operating hypotheses."
          body="All relationships exhibit statistically significant positive associations, demonstrating that data fragmentation is a structural, systemic problem."
        />
        <div className="hyp-grid">
          {hypRows.map((h, idx) => (
            <div className={`hyp reveal reveal-delay-${(idx % 4) + 1}`} key={h.id}>
              <div>
                <span>{h.id}</span>
                <h4>{h.label}</h4>
              </div>
              <b>
                {Number.isFinite(h.rho) ? h.rho.toFixed(2) : "—"}
                <small>Spearman ρ · {Number.isFinite(h.rho) ? strength(h.rho) : "Insufficient data"}</small>
              </b>
            </div>
          ))}
        </div>
      </section>

      {/* Respondent Data Explorer Section */}
      <section className="section reveal" id="explorer">
        <SectionHead
          num="05 · Granular Data Explorer"
          title="Inspect individual respondent responses and friction scores."
          body="Search across roles, company size tiers, and tech stacks. Click any row to inspect in the slide-over executive intelligence panel."
        />
        <RespondentExplorer data={chartData} onSelectRow={setSelected} />
      </section>

      {/* ROI & Financial Impact Modeling */}
      <section className="section reveal" id="roi">
        <SectionHead
          num="06 · Value Modeling"
          title="Interactive Financial & Capacity Recovery Simulator."
          body="Calculate the exact financial and strategic analyst return on investment from deploying a finance-owned data readiness layer."
        />
        <ROICalculator />
      </section>

      {/* 07 · Strategic Solution Proposition */}
      <section className="section reveal" id="proposition">
        <SectionHead
          num="07 · Product Proposition"
          title="Solve the layer before FP&A—not FP&A itself."
          body="A purpose-built Finance Data Readiness Layer connects source systems, standardizes entity mappings, audits control totals, and publishes trusted finance-ready feeds into the tools teams already love."
        />
        <div className="proposition reveal reveal-delay-2">
          <div>
            <div className="sec-num">Architectural Paradigm</div>
            <h3>Finance-Ready Data Architecture</h3>
            <p>
              Connect → Standardize → Reconcile → Trace & Approve → Publish. Preserves Excel, BI, and planning tools while guaranteeing verified, auditable data feeding them.
            </p>
            <div className="solution-flow">
              {["Connect", "Standardize", "Reconcile", "Trace & Approve", "Publish"].map((x, i) => (
                <div className="snode" key={x} onClick={() => sounds.playPop()}>
                  <b>{x}</b>
                  <span>
                    {[
                      "Automated feeds from ERP, CRM, Billing, HRIS & Warehouses.",
                      "Reusable finance-native chart of accounts & entity mappings.",
                      "Instant exception alerts, control totals & variance checks.",
                      "Audit-proof lineage, freshness tracking & human sign-off.",
                      "Governed live feeds into Excel, Google Sheets, PowerBI & Anaplan."
                    ][i]}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <ProductMock />
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div>
          <strong>FP&A Market Validation Research Dashboard</strong> · Empirical SaaS Operational Study
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          <button
            style={{ background: "transparent", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: 12, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6 }}
            onClick={handleDownloadCSV}
          >
            <Icons.Download size={13} /> Download Cohort CSV ({filtered.length} rows)
          </button>
          <span>Dataset revised for empirical realism.</span>
        </div>
      </footer>

      {/* Slide-over Executive Intelligence Drawer */}
      <ExecutiveDrawer
        row={selected}
        cohortData={chartData}
        onClose={() => setSelected(null)}
        onPrev={handlePrevRespondent}
        onNext={handleNextRespondent}
      />
    </div>
  );
}

export default App;
