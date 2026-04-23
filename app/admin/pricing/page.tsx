"use client";

// ============================================================
// FILE: app/admin/pricing/page.tsx
// ROUTE: /admin/pricing
// DESCRIPTION: SAAD STUDIO Pricing Constitution
//   - Single source of truth for ALL credit costs
//   - Every generation route reads from this table
//   - Admin-only, Clerk auth enforced
//   - Dynamic per-second billing for video/cinema
//   - Flat billing for image/audio/3d
// ============================================================

import { useEffect, useState, useCallback } from "react";
import {
  type BillingType,
  type ModelType,
  type Provider,
  type PricingModel,
  type KiePackage,
  type SaadPlan,
  KIE_PACKAGES,
  SAAD_PLANS,
  DEFAULT_MODELS,
  calcProviderCost,
  calcUserCredits,
} from "@/lib/pricing-models";

// ─── Main Page Component ───────────────────────────────────────────────────────

export default function PricingConstitutionPage() {
  const [models, setModels] = useState<PricingModel[]>(DEFAULT_MODELS);
  const [selPkg, setSelPkg] = useState(1);
  const [selPlan, setSelPlan] = useState(1);
  const [previewDur, setPreviewDur] = useState(5);
  const [durations, setDurations] = useState([3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]);
  const [filter, setFilter] = useState<ModelType | "all">("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBuf, setEditBuf] = useState<Partial<PricingModel>>({});
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [newDurInput, setNewDurInput] = useState("");
  const [providerBalances, setProviderBalances] = useState<{ kie: number | null; wavespeed: number | null }>({ kie: null, wavespeed: null });
  const [dbLoaded, setDbLoaded] = useState(false);

  // Load from DB on mount
  useEffect(() => {
    fetch("/api/admin/pricing-constitution")
      .then(r => r.json())
      .then(d => {
        if (d.models?.length) { setModels(d.models); setDbLoaded(true); }
      })
      .catch(() => {});
  }, []);

  // Load provider balances
  useEffect(() => {
    fetch("/api/admin/provider-balances")
      .then(r => r.json())
      .then(setProviderBalances)
      .catch(() => {});
  }, []);

  // ─── Calculations ─────────────────────────────────────────────────────────

  const kieCrUsd = KIE_PACKAGES[selPkg].costPerCredit;
  const planCrUsd = SAAD_PLANS[selPlan].monthlyUsd / SAAD_PLANS[selPlan].credits;

  function providerCost(m: PricingModel, dur: number) {
    return calcProviderCost(m, dur, kieCrUsd);
  }
  function userCr(m: PricingModel, dur: number) {
    return calcUserCredits(m, dur);
  }
  function revenue(m: PricingModel, dur: number) {
    return userCr(m, dur) * planCrUsd;
  }
  function margin(m: PricingModel, dur: number) {
    const c = providerCost(m, dur);
    return c > 0 ? ((revenue(m, dur) - c) / c) * 100 : 0;
  }

  // ─── Save to DB ───────────────────────────────────────────────────────────

  const saveToDb = useCallback(async () => {
    setSaveState("saving");
    try {
      const res = await fetch("/api/admin/pricing-constitution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ models, kiePkgIndex: selPkg }),
      });
      if (!res.ok) throw new Error();
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 3000);
    } catch {
      setSaveState("error");
      setTimeout(() => setSaveState("idle"), 3000);
    }
  }, [models, selPkg]);

  // ─── Edit handlers ────────────────────────────────────────────────────────

  function startEdit(id: string) {
    setEditingId(id);
    setEditBuf({ ...models.find(m => m.id === id) });
  }
  function cancelEdit() { setEditingId(null); setEditBuf({}); }
  function saveEdit() {
    setModels(prev => prev.map(m => m.id === editingId ? { ...m, ...editBuf } as PricingModel : m));
    setEditingId(null);
    setEditBuf({});
  }
  function toggleActive(id: string) {
    setModels(prev => prev.map(m => m.id === id ? { ...m, isActive: !m.isActive } : m));
  }
  function addDuration() {
    const v = parseInt(newDurInput);
    if (v > 0 && v <= 120 && !durations.includes(v)) {
      setDurations(prev => [...prev, v].sort((a, b) => a - b));
      setNewDurInput("");
    }
  }

  // ─── Derived stats ────────────────────────────────────────────────────────

  const activeModels = models.filter(m => m.isActive);
  const margins = activeModels.map(m => margin(m, previewDur));
  const avgMargin = margins.length ? margins.reduce((a, b) => a + b, 0) / margins.length : 0;
  const losingCount = activeModels.filter(m => revenue(m, previewDur) < providerCost(m, previewDur)).length;
  const filtered = filter === "all" ? models : models.filter(m => m.type === filter);

  function marginColor(pct: number) {
    if (pct >= 200) return "#16a34a";
    if (pct >= 100) return "#0891b2";
    if (pct >= 40)  return "#d97706";
    return "#dc2626";
  }

  const typeColors: Record<string, string> = {
    image: "#0891b2", video: "#7c3aed", cinema: "#b45309",
    audio: "#15803d", "3d": "#6b7280",
  };

  const saveBtnText = {
    idle: "Save Constitution",
    saving: "Saving…",
    saved: "✓ Saved to DB",
    error: "Error — Retry",
  }[saveState];
  const saveBtnColor = {
    idle: "#0891b2",
    saving: "#6b7280",
    saved: "#16a34a",
    error: "#dc2626",
  }[saveState];

  return (
    <div style={S.page}>

      {/* ── Header ── */}
      <div style={S.header}>
        <div>
          <div style={S.breadcrumb}>Admin / Pricing Constitution</div>
          <h1 style={S.title}>Pricing Constitution</h1>
          <p style={S.sub}>
            Single source of truth · Every generation route reads from this table ·{" "}
            {dbLoaded ? "✓ Loaded from DB" : "Using defaults (DB not connected)"}
          </p>
        </div>
        <button
          onClick={saveToDb}
          disabled={saveState === "saving"}
          style={{ ...S.saveBtn, background: saveBtnColor }}
        >
          {saveBtnText}
        </button>
      </div>

      {/* ── Provider balances ── */}
      <div style={S.balanceRow}>
        {[
          { label: "Provider A Balance", val: providerBalances.kie,       color: "#0891b2", url: "/admin/pricing" },
          { label: "Provider B Balance", val: providerBalances.wavespeed, color: "#7c3aed", url: "/admin/pricing" },
        ].map(b => {
          const isCrit = b.val !== null && b.val < 5;
          const isLow  = b.val !== null && b.val < 20;
          const c = isCrit ? "#dc2626" : isLow ? "#d97706" : b.color;
          return (
            <div key={b.label} style={S.balancePill}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: c, boxShadow: `0 0 8px ${c}` }} />
              <div>
                <div style={S.balanceLabel}>{b.label}</div>
                <div style={{ ...S.balanceVal, color: c }}>
                  {b.val === null ? "—" : `$${b.val.toFixed(2)}`}
                  {isLow && (
                    <a href={b.url} target="_blank" rel="noreferrer" style={S.topupLink}> Top up ↗</a>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        <div style={S.balanceDivider} />

        {/* Package selector */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" as const }}>
          <span style={S.smallLabel}>Package tier:</span>
          {KIE_PACKAGES.map((p, i) => (
            <button key={p.label} onClick={() => setSelPkg(i)} style={{ ...S.chip, ...(i === selPkg ? S.chipActive : {}) }}>
              {p.label}{" "}
              <span style={{ opacity: 0.6, fontSize: 10 }}>${p.costPerCredit.toFixed(5)}/cr</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Summary metrics ── */}
      <div style={S.metricsRow}>
        {[
          { label: "Active Models",              val: String(activeModels.length),       sub: `${models.length - activeModels.length} inactive`,  color: "#0891b2"                 },
          { label: `Avg Margin @ ${previewDur}s`, val: `${Math.round(avgMargin)}%`,      sub: `${SAAD_PLANS[selPlan].name} plan`,                 color: marginColor(avgMargin)    },
          { label: "Credit Value",               val: `$${planCrUsd.toFixed(4)}`,        sub: "per credit to user",                               color: "#7c3aed"                 },
          { label: losingCount > 0 ? `⚠ ${losingCount} Losing Money` : "All Profitable",
            val: losingCount > 0 ? "Fix Now" : "✓",
            sub: "at preview duration",
            color: losingCount > 0 ? "#dc2626" : "#16a34a" },
        ].map(c => (
          <div key={c.label} style={S.metricCard}>
            <div style={S.metricLabel}>{c.label}</div>
            <div style={{ ...S.metricVal, color: c.color }}>{c.val}</div>
            <div style={S.metricSub}>{c.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Controls ── */}
      <div style={S.controlsRow}>
        <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
          {/* Plan selector */}
          <div style={S.ctrlRow}>
            <span style={S.smallLabel}>Calc for plan:</span>
            {SAAD_PLANS.map((p, i) => (
              <button key={p.id} onClick={() => setSelPlan(i)} style={{ ...S.chip, ...(i === selPlan ? S.chipActive : {}) }}>
                {p.name} ${p.monthlyUsd}
              </button>
            ))}
          </div>
          {/* Duration preview selector */}
          <div style={S.ctrlRow}>
            <span style={S.smallLabel}>Preview at:</span>
            <div style={{ display: "flex", gap: 3, flexWrap: "wrap" as const }}>
              {durations.map(d => (
                <button key={d} onClick={() => setPreviewDur(d)} style={{ ...S.chip, ...(d === previewDur ? S.chipDur : {}) }}>
                  {d}s
                </button>
              ))}
            </div>
            <input
              type="number" min={1} max={120} placeholder="add s"
              value={newDurInput}
              onChange={e => setNewDurInput(e.target.value)}
              style={S.miniInput}
            />
            <button onClick={addDuration} style={S.addBtn}>+ Add</button>
          </div>
        </div>
      </div>

      {/* ── Type filter tabs ── */}
      <div style={S.filterRow}>
        {(["all", "image", "video", "cinema", "audio", "3d"] as const).map(t => {
          const isOn = filter === t;
          const col = t === "all" ? "#0891b2" : (typeColors[t] ?? "#6b7280");
          return (
            <button
              key={t}
              onClick={() => setFilter(t)}
              style={{ ...S.chip, ...(isOn ? { background: col + "18", color: col, borderColor: col + "55" } : {}) }}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          );
        })}
      </div>

      {/* ── Models table ── */}
      <div style={S.tableWrap}>
        <table style={S.table}>
          <thead>
            <tr style={S.thead}>
              {["Model","Type","Provider","Billing","Source units or USD","Rate (user)","Credits charged","Your cost","Revenue","Margin","Max s","Status",""] .map(h => (
                <th key={h} style={{ ...S.th, textAlign: h === "Model" ? "left" : "center" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(m => {
              const isEditing = editingId === m.id;
              const em = isEditing ? { ...m, ...editBuf } as PricingModel : m;
              const effDur = em.maxDuration ? Math.min(previewDur, em.maxDuration) : previewDur;
              const isCapped = em.maxDuration !== null && previewDur > em.maxDuration;
              const cr   = userCr(em, previewDur);
              const cost = providerCost(em, previewDur);
              const rev  = revenue(em, previewDur);
              const mg   = margin(em, previewDur);
              const mc   = marginColor(mg);
              const isLosing = rev < cost;
              const typeCol  = typeColors[em.type] ?? "#6b7280";

              return (
                <tr key={m.id} style={{
                  ...S.tr,
                  opacity: em.isActive ? 1 : 0.4,
                  background: isEditing
                    ? "rgba(8,145,178,0.06)"
                    : isLosing && em.isActive
                      ? "rgba(220,38,38,0.04)"
                      : "transparent",
                }}>
                  {/* Model name */}
                  <td style={{ ...S.td, textAlign: "left" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: typeCol, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontWeight: 500, fontSize: 12 }}>{em.name}</div>
                        <div style={{ fontSize: 10, color: "#6b7280" }}>{em.notes}</div>
                      </div>
                    </div>
                  </td>

                  {/* Type badge */}
                  <td style={S.td}>
                    <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 99, background: typeCol + "15", color: typeCol, border: `0.5px solid ${typeCol}44` }}>
                      {em.type}
                    </span>
                  </td>

                  {/* Provider */}
                  <td style={{ ...S.td, fontSize: 11, color: em.provider === "kie" ? "#0891b2" : "#7c3aed" }}>
                    {em.provider === "kie" ? "Provider A" : "Provider B"}
                  </td>

                  {/* Billing */}
                  <td style={{ ...S.td, fontSize: 10, color: em.billing === "per_sec" ? "#d97706" : "#6b7280" }}>
                    {em.billing === "per_sec" ? "per sec" : "flat"}
                  </td>

                  {/* Source credits or USD — editable */}
                  <td style={S.td}>
                    {em.provider === "wavespeed"
                      ? <span style={{ fontFamily: "monospace", fontSize: 11, color: "#d97706" }}>${em.waveUsd.toFixed(3)}</span>
                      : isEditing
                        ? <input
                            type="number" step={0.5} min={0}
                            value={editBuf.kieCredits ?? em.kieCredits}
                            onChange={e => setEditBuf(b => ({ ...b, kieCredits: parseFloat(e.target.value) || 0 }))}
                            style={S.editInput}
                          />
                        : <span style={{ fontFamily: "monospace", fontSize: 11, color: "#6b7280" }}>
                            {em.kieCredits}{em.billing === "per_sec" ? " cr/s" : " cr"}
                          </span>
                    }
                  </td>

                  {/* User credits rate — editable */}
                  <td style={S.td}>
                    {isEditing
                      ? <input
                          type="number" step={0.5} min={0.5}
                          value={editBuf.userCreditsRate ?? em.userCreditsRate}
                          onChange={e => setEditBuf(b => ({ ...b, userCreditsRate: parseFloat(e.target.value) || 1 }))}
                          style={S.editInput}
                        />
                      : <span style={{ fontFamily: "monospace", fontSize: 11 }}>
                          {em.userCreditsRate}{em.billing === "per_sec" ? " cr/s" : " cr"}
                        </span>
                    }
                  </td>

                  {/* Credits charged at preview duration */}
                  <td style={S.td}>
                    {em.billing === "per_sec"
                      ? <span style={{ fontFamily: "monospace", fontSize: 11, color: "#d97706", fontWeight: 600 }}>
                          {cr}{" "}
                          <span style={{ fontSize: 9, opacity: 0.6 }}>
                            {isCapped ? `(cap ${em.maxDuration}s)` : `(×${effDur})`}
                          </span>
                        </span>
                      : <span style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 600 }}>{cr}</span>
                    }
                  </td>

                  {/* Your cost */}
                  <td style={{ ...S.td, fontFamily: "monospace", fontSize: 11, color: "#dc2626" }}>
                    ${cost.toFixed(3)}
                  </td>

                  {/* Revenue */}
                  <td style={{ ...S.td, fontFamily: "monospace", fontSize: 11 }}>
                    ${rev.toFixed(3)}
                  </td>

                  {/* Margin */}
                  <td style={S.td}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                      <div style={{ width: 40, height: 3, background: "#e5e7eb", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ width: `${Math.min(Math.max(mg / 3, 0), 100)}%`, height: "100%", background: mc, borderRadius: 2 }} />
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 600, color: mc }}>{Math.round(mg)}%</span>
                    </div>
                  </td>

                  {/* Max duration — editable */}
                  <td style={S.td}>
                    {em.billing === "flat"
                      ? <span style={{ fontSize: 10, color: "#9ca3af" }}>—</span>
                      : isEditing
                        ? <input
                            type="number" step={1} min={1} max={120}
                            value={editBuf.maxDuration ?? em.maxDuration ?? ""}
                            placeholder="∞"
                            onChange={e => setEditBuf(b => ({ ...b, maxDuration: parseInt(e.target.value) || null }))}
                            style={S.editInput}
                          />
                        : <span style={{ fontSize: 10, color: isCapped ? "#d97706" : "#6b7280" }}>
                            {em.maxDuration ? `${em.maxDuration}s` : "∞"}
                          </span>
                    }
                  </td>

                  {/* Status toggle */}
                  <td style={S.td}>
                    <button
                      onClick={() => toggleActive(m.id)}
                      style={{ ...S.toggleBtn, color: em.isActive ? "#16a34a" : "#6b7280", borderColor: em.isActive ? "#16a34a55" : "#6b728055" }}
                    >
                      {em.isActive ? "ON" : "OFF"}
                    </button>
                  </td>

                  {/* Inline edit actions */}
                  <td style={{ ...S.td, width: 60 }}>
                    {isEditing ? (
                      <div style={{ display: "flex", gap: 3 }}>
                        <button onClick={saveEdit}   style={{ ...S.iconBtn, color: "#16a34a", borderColor: "#16a34a55" }}>✓</button>
                        <button onClick={cancelEdit} style={{ ...S.iconBtn, color: "#dc2626", borderColor: "#dc262655" }}>✕</button>
                      </div>
                    ) : (
                      <button onClick={() => startEdit(m.id)} style={S.iconBtn}>✎</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Monthly profit per plan ── */}
      <div style={S.sectionHead}>
        <div style={S.sectionBar} />
        <span style={S.sectionTitle}>ESTIMATED MONTHLY PROFIT PER PLAN</span>
      </div>
      <div style={S.planCards}>
        {SAAD_PLANS.map((p, i) => {
          const cpCost = p.monthlyUsd / p.credits;
          const vidModels = activeModels.filter(m => m.type === "video" || m.type === "cinema");
          const avgVidCost = vidModels.length
            ? vidModels.reduce((s, m) => s + providerCost(m, previewDur), 0) / vidModels.length
            : 0;
          const sessEst    = p.credits / 10;
          const apiCostEst = sessEst * avgVidCost * 0.7;
          const netProfit  = p.monthlyUsd - apiCostEst;
          const netMargin  = (netProfit / p.monthlyUsd) * 100;
          const mc = marginColor(netMargin * 1.5);
          return (
            <div key={p.id} style={{ ...S.planCard, ...(i === selPlan ? S.planCardActive : {}) }}>
              <div style={S.planCardName}>{p.name.toUpperCase()}</div>
              <div style={S.planCardPrice}>
                ${p.monthlyUsd}<span style={{ fontSize: 12, color: "#6b7280" }}>/mo</span>
              </div>
              <div style={S.planRow}><span>Credits</span><span>{p.credits} cr</span></div>
              <div style={S.planRow}><span>$/credit</span><span>${cpCost.toFixed(4)}</span></div>
              <div style={S.planRow}>
                <span>Est. API cost @ {previewDur}s</span>
                <span style={{ color: "#dc2626" }}>~${apiCostEst.toFixed(2)}</span>
              </div>
              <div style={S.planRow}>
                <span>Est. net profit</span>
                <span style={{ color: "#16a34a", fontWeight: 600 }}>~${netProfit.toFixed(2)}</span>
              </div>
              <div style={{ width: "100%", height: 3, background: "#e5e7eb", borderRadius: 2, overflow: "hidden", margin: "8px 0 3px" }}>
                <div style={{ width: `${Math.min(netMargin, 100)}%`, height: "100%", background: mc, borderRadius: 2 }} />
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: mc }}>{Math.round(netMargin)}% margin</div>
            </div>
          );
        })}
      </div>

      {/* ── Competitor comparison ── */}
      <div style={{ ...S.sectionHead, marginTop: 32 }}>
        <div style={S.sectionBar} />
        <span style={S.sectionTitle}>COMPETITOR COMPARISON</span>
      </div>
      <div style={S.compGrid}>
        {[
          {
            name: "SAAD Studio",
            tag: "You",
            you: true,
            rows: [
              ["Starter plan", "$15/mo · 250 cr"],
              ["Plus plan",    "$35/mo · 600 cr"],
              ["Pro plan",     "$70/mo · 1,200 cr"],
              ["Max plan",     "$99/mo · 3,000 cr"],
              ["Kling 3.0 @ 5s", `${userCr(models.find(m=>m.id==="kling30") ?? DEFAULT_MODELS[0], 5)} cr`],
            ],
          },
          {
            name: "Pika Labs",
            tag: "Competitor",
            rows: [
              ["Basic",   "$8/mo · 700 cr"],
              ["Standard","$28/mo · 2,000 cr"],
              ["Unlimited","$72/mo · ∞"],
              ["1s video","~10 cr"],
              ["5s video","~50 cr"],
            ],
          },
          {
            name: "Runway ML",
            tag: "Competitor",
            rows: [
              ["Standard","$15/mo · 125 cr"],
              ["Pro",     "$35/mo · 2,250 cr"],
              ["Unlimited","$95/mo · ∞"],
              ["5s Gen-4","~25 cr"],
              ["10s Gen-4","~50 cr"],
            ],
          },
          {
            name: "HeyGen",
            tag: "Competitor",
            rows: [
              ["Creator", "$29/mo · 5 vids"],
              ["Business","$89/mo · 30 vids"],
              ["Enterprise","Custom"],
              ["1 video","~$6"],
              ["Avatar gen","~$3"],
            ],
          },
        ].map(comp => (
          <div key={comp.name} style={{ ...S.compCard, ...(comp.you ? S.compCardYou : {}) }}>
            <div style={S.compHead}>
              <div style={S.compName}>{comp.name}</div>
              <div style={S.compTag}>{comp.tag}</div>
              {comp.you && <span style={S.winBadge}>✓ Best value</span>}
            </div>
            <div style={S.compBody}>
              {comp.rows.map(([label, val]) => (
                <div key={label} style={S.compRow}>
                  <span>{label}</span>
                  <span style={{ fontFamily: "monospace", fontSize: 10 }}>{val}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const S: Record<string, React.CSSProperties> = {
  page:          { minHeight: "100vh", background: "#f9fafb", color: "#111827", fontFamily: "'DM Sans', system-ui, sans-serif", padding: "32px 28px 100px", maxWidth: 1400, margin: "0 auto" },
  header:        { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, gap: 16, flexWrap: "wrap" },
  breadcrumb:    { fontSize: 11, color: "#9ca3af", marginBottom: 4, fontFamily: "monospace" },
  title:         { fontSize: 24, fontWeight: 700, margin: 0, color: "#111827" },
  sub:           { fontSize: 12, color: "#6b7280", marginTop: 4 },
  saveBtn:       { color: "#fff", border: "none", padding: "10px 24px", borderRadius: 10, fontWeight: 600, cursor: "pointer", fontSize: 13, whiteSpace: "nowrap", transition: "background 0.2s" },
  balanceRow:    { display: "flex", alignItems: "center", gap: 20, background: "#fff", border: "0.5px solid #e5e7eb", borderRadius: 12, padding: "12px 18px", marginBottom: 18, flexWrap: "wrap" },
  balancePill:   { display: "flex", alignItems: "center", gap: 10 },
  balanceLabel:  { fontSize: 10, color: "#9ca3af", fontFamily: "monospace", marginBottom: 2 },
  balanceVal:    { fontSize: 14, fontWeight: 600, fontFamily: "monospace" },
  topupLink:     { fontSize: 11, color: "#0891b2", textDecoration: "underline", marginLeft: 6 },
  balanceDivider:{ width: 1, height: 32, background: "#e5e7eb", flexShrink: 0 },
  smallLabel:    { fontSize: 11, color: "#6b7280", whiteSpace: "nowrap" },
  chip:          { padding: "4px 10px", borderRadius: 8, border: "0.5px solid #e5e7eb", background: "transparent", color: "#6b7280", cursor: "pointer", fontSize: 11, fontFamily: "inherit" },
  chipActive:    { background: "#e0f2fe", color: "#0891b2", borderColor: "#7dd3fc" },
  chipDur:       { background: "#fef3c7", color: "#d97706", borderColor: "#fcd34d" },
  metricsRow:    { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 18 },
  metricCard:    { background: "#fff", border: "0.5px solid #e5e7eb", borderRadius: 12, padding: "14px 16px" },
  metricLabel:   { fontSize: 10, color: "#9ca3af", fontFamily: "monospace", marginBottom: 6 },
  metricVal:     { fontSize: 22, fontWeight: 700, fontFamily: "monospace" },
  metricSub:     { fontSize: 11, color: "#6b7280", marginTop: 4 },
  controlsRow:   { marginBottom: 12 },
  ctrlRow:       { display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" },
  miniInput:     { width: 56, padding: "3px 6px", border: "0.5px solid #e5e7eb", borderRadius: 8, fontSize: 11, outline: "none", fontFamily: "inherit", color: "#111827", background: "#fff" },
  addBtn:        { padding: "3px 10px", border: "0.5px dashed #e5e7eb", borderRadius: 8, background: "transparent", color: "#6b7280", cursor: "pointer", fontSize: 11, fontFamily: "inherit" },
  filterRow:     { display: "flex", gap: 4, marginBottom: 12, flexWrap: "wrap" },
  tableWrap:     { background: "#fff", border: "0.5px solid #e5e7eb", borderRadius: 14, overflow: "hidden", marginBottom: 32 },
  table:         { width: "100%", borderCollapse: "collapse" },
  thead:         { background: "#f9fafb" },
  th:            { fontSize: 10, color: "#6b7280", fontWeight: 400, padding: "8px 8px", borderBottom: "0.5px solid #e5e7eb", whiteSpace: "nowrap" },
  tr:            { borderBottom: "0.5px solid #f3f4f6", transition: "background 0.1s" },
  td:            { padding: "8px 8px", verticalAlign: "middle", fontSize: 12, textAlign: "center" },
  editInput:     { width: 58, padding: "3px 5px", border: "1px solid #7dd3fc", borderRadius: 6, fontSize: 11, textAlign: "center", outline: "none", background: "#f0f9ff", color: "#111827" },
  toggleBtn:     { padding: "2px 8px", borderRadius: 99, border: "0.5px solid", cursor: "pointer", fontSize: 10, background: "transparent", fontFamily: "monospace" },
  iconBtn:       { width: 24, height: 24, borderRadius: 6, border: "0.5px solid #e5e7eb", cursor: "pointer", background: "transparent", fontSize: 12, color: "#6b7280", display: "flex", alignItems: "center", justifyContent: "center" },
  sectionHead:   { display: "flex", alignItems: "center", gap: 10, marginBottom: 14 },
  sectionBar:    { width: 3, height: 16, borderRadius: 2, background: "#0891b2" },
  sectionTitle:  { fontSize: 12, fontWeight: 600, color: "#6b7280", fontFamily: "monospace", letterSpacing: "0.05em" },
  planCards:     { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 },
  planCard:      { background: "#fff", border: "0.5px solid #e5e7eb", borderRadius: 12, padding: "16px" },
  planCardActive:{ border: "2px solid #7dd3fc", boxShadow: "0 0 0 4px #e0f2fe" },
  planCardName:  { fontSize: 10, color: "#0891b2", fontFamily: "monospace", marginBottom: 4, letterSpacing: "0.1em" },
  planCardPrice: { fontSize: 22, fontWeight: 700, marginBottom: 10 },
  planRow:       { display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6b7280", padding: "3px 0", borderBottom: "0.5px solid #f3f4f6" },
  compGrid:      { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 40 },
  compCard:      { background: "#fff", border: "0.5px solid #e5e7eb", borderRadius: 12, overflow: "hidden" },
  compCardYou:   { border: "2px solid #16a34a55", boxShadow: "0 0 0 4px #dcfce7" },
  compHead:      { padding: "10px 14px", borderBottom: "0.5px solid #e5e7eb" },
  compName:      { fontSize: 13, fontWeight: 600, marginBottom: 2 },
  compTag:       { fontSize: 10, color: "#9ca3af" },
  winBadge:      { display: "inline-block", fontSize: 10, padding: "2px 8px", borderRadius: 99, background: "#dcfce7", color: "#16a34a", border: "0.5px solid #86efac", marginTop: 6 },
  compBody:      { padding: "10px 14px" },
  compRow:       { display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6b7280", padding: "3px 0", borderBottom: "0.5px solid #f3f4f6" },
};
