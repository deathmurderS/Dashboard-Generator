/**
 * frontend/components/DashboardEditor.jsx
 */

import React, { useState, useEffect } from "react";
import { Trash2, Pencil, Plus, X, Check, Save } from "lucide-react";
import { TOKENS } from "./theme";

const API = "http://127.0.0.1:8000";

const CHART_TYPES = [
  { value: "bar",         label: "Bar",          desc: "Batang vertikal" },
  { value: "line",        label: "Line",         desc: "Garis tren" },
  { value: "pie",         label: "Pie",          desc: "Proporsi kategori" },
  { value: "donut",       label: "Donut",        desc: "Proporsi kategori (lubang tengah)" },
  { value: "trend",       label: "Trend Waktu",  desc: "Jumlah baris per menit/jam/hari/minggu" },
  { value: "hbar",        label: "H-Bar",        desc: "Batang horizontal + sortable" },
  { value: "stacked_bar", label: "Stacked Bar",  desc: "Batang bertumpuk (2 kategori)" },
];

const KPI_TYPES = [
  { value: "count",   label: "Count",     desc: "Jumlah baris" },
  { value: "total",   label: "Total",     desc: "Penjumlahan kolom numerik" },
  { value: "average", label: "Rata-rata", desc: "Rata-rata kolom numerik" },
];

// ─── Helper trend waktu ─────────────────────────────────────────────────
function pad(n) { return String(n).padStart(2, "0"); }

function getPeriodKey(date, granularity) {
  const y = date.getFullYear(), m = date.getMonth() + 1, d = date.getDate();
  const h = date.getHours(), mi = date.getMinutes();
  if (granularity === "minute") return `${y}-${pad(m)}-${pad(d)} ${pad(h)}:${pad(mi)}`;
  if (granularity === "hour")   return `${y}-${pad(m)}-${pad(d)} ${pad(h)}:00`;
  if (granularity === "day")    return `${y}-${pad(m)}-${pad(d)}`;
  const tmp = new Date(date);
  const dayNum = (tmp.getDay() + 6) % 7;
  tmp.setDate(tmp.getDate() - dayNum);
  return `Minggu ${tmp.getFullYear()}-${pad(tmp.getMonth() + 1)}-${pad(tmp.getDate())}`;
}

function buildTrendData(rows, dateCol) {
  const result = {};
  ["minute", "hour", "day", "week"].forEach((g) => {
    const counts = {};
    rows.forEach((r) => {
      const raw = r[dateCol];
      if (!raw) return;
      const date = new Date(String(raw).replace(" ", "T"));
      if (isNaN(date.getTime())) return;
      const key = getPeriodKey(date, g);
      counts[key] = (counts[key] ?? 0) + 1;
    });
    result[g] = Object.keys(counts).sort().map((k) => ({ label: k, value: counts[k] }));
  });
  return result;
}

// ─── Modal konfirmasi custom ───────────────────────────────────────────────
function ConfirmModal({ message, detail, confirmLabel = "Ya, lanjutkan", confirmColor = "#e06c75", onConfirm, onCancel }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.6)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        background: TOKENS.panel, border: `1px solid ${TOKENS.border}`,
        borderRadius: 12, padding: "24px 28px", width: 340,
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
      }}>
        <p style={{ color: TOKENS.text, fontWeight: 700, fontSize: 15, margin: "0 0 8px" }}>{message}</p>
        {detail && <p style={{ color: TOKENS.textMuted, fontSize: 13, margin: "0 0 20px" }}>{detail}</p>}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={cancelBtnStyle}>Batal</button>
          <button onClick={onConfirm} style={{
            background: confirmColor, color: "#fff", border: "none",
            borderRadius: 7, padding: "7px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer",
          }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────
function TypeBadge({ type }) {
  const colorMap = {
    bar: "#6C8EBF", line: "#82B366", pie: "#D6A520",
    hbar: "#C792EA", stacked_bar: "#E2574C",
    donut: "#D6A520", trend: "#5B9BD5",
  };
  const color = colorMap[type] ?? TOKENS.textMuted;
  return (
    <span style={{
      background: color + "22", color, border: `1px solid ${color}55`,
      borderRadius: 4, padding: "1px 7px",
      fontSize: 11, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600,
      whiteSpace: "nowrap",
    }}>{type}</span>
  );
}

// ─── Baris chart ──────────────────────────────────────────────────────────
function ChartRow({ chart, onChange, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(chart.title);
  const [type, setType] = useState(chart.type);
  const [color, setColor] = useState(chart.color ?? "#2DD4A7");
  const [sliceColors, setSliceColors] = useState(chart.slice_colors ?? {});

  function handleSave() { onChange({ ...chart, title, type, color, slice_colors: sliceColors }); setEditing(false); }
  function handleCancel() {
    setTitle(chart.title); setType(chart.type);
    setColor(chart.color ?? "#2DD4A7");
    setSliceColors(chart.slice_colors ?? {});
    setEditing(false);
  }

  return (
    <div style={{
      background: TOKENS.panel,
      border: `1px solid ${editing ? TOKENS.accent + "88" : TOKENS.border}`,
      borderRadius: 8, padding: "11px 14px", transition: "border-color 0.15s",
    }}>
      {editing ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="Judul chart" style={inputStyle} />
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {CHART_TYPES.map((t) => (
              <button key={t.value} onClick={() => setType(t.value)} title={t.desc} style={{
                background: type === t.value ? TOKENS.accent + "33" : TOKENS.panelAlt,
                border: `1px solid ${type === t.value ? TOKENS.accent : TOKENS.border}`,
                borderRadius: 6, padding: "4px 10px",
                color: type === t.value ? TOKENS.accent : TOKENS.textMuted,
                fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
                cursor: "pointer", fontWeight: type === t.value ? 700 : 400,
              }}>{t.label}</button>
            ))}
          </div>

          {/* Warna per batang — bar, hbar */}
          {["bar", "hbar"].includes(type) && chart.data?.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label style={{ color: TOKENS.textMuted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Warna per batang
              </label>
              {chart.data.map((entry, i) => {
                const DEFAULTS = ["#2DD4A7","#8B80F0","#E8A23D","#5B9BD5","#E2574C","#C792EA"];
                const sliceLabel = entry.label ?? entry.name ?? `Item ${i+1}`;
                const currentColor = sliceColors[sliceLabel] ?? DEFAULTS[i % DEFAULTS.length];
                return (
                  <div key={sliceLabel} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <input type="color" value={currentColor}
                      onChange={(e) => setSliceColors((prev) => ({ ...prev, [sliceLabel]: e.target.value }))}
                      style={{ width: 28, height: 28, border: "none", borderRadius: 5, cursor: "pointer", padding: 0, flexShrink: 0 }}
                    />
                    <span style={{ color: TOKENS.text, fontSize: 13, flex: 1 }}>{sliceLabel}</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: TOKENS.textMuted }}>{currentColor}</span>
                    <button
                      onClick={() => setSliceColors((prev) => { const n = {...prev}; delete n[sliceLabel]; return n; })}
                      style={{ background: "transparent", border: `1px solid ${TOKENS.border}`, borderRadius: 5, padding: "2px 8px", color: TOKENS.textMuted, fontSize: 11, cursor: "pointer" }}
                    >reset</button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Warna garis — line, trend */}
          {["line", "trend"].includes(type) && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <label style={{ color: TOKENS.textMuted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>Warna garis</label>
              <input type="color" value={color}
                onChange={(e) => setColor(e.target.value)}
                style={{ width: 28, height: 28, border: "none", borderRadius: 5, cursor: "pointer", padding: 0 }}
              />
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: TOKENS.textMuted }}>{color}</span>
              <button onClick={() => setColor("#8B80F0")} style={{
                background: "transparent", border: `1px solid ${TOKENS.border}`,
                borderRadius: 5, padding: "2px 8px", color: TOKENS.textMuted, fontSize: 11, cursor: "pointer",
              }}>reset</button>
            </div>
          )}

          {/* Warna per slice — pie, donut */}
          {["pie", "donut"].includes(type) && chart.data?.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label style={{ color: TOKENS.textMuted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Warna per slice
              </label>
              {chart.data.map((entry, i) => {
                const DEFAULTS = ["#2DD4A7","#8B80F0","#E8A23D","#5B9BD5","#E2574C","#C792EA"];
                const sliceLabel = entry.label ?? entry.name ?? `Slice ${i+1}`;
                const currentColor = sliceColors[sliceLabel] ?? DEFAULTS[i % DEFAULTS.length];
                return (
                  <div key={sliceLabel} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <input type="color" value={currentColor}
                      onChange={(e) => setSliceColors((prev) => ({ ...prev, [sliceLabel]: e.target.value }))}
                      style={{ width: 28, height: 28, border: "none", borderRadius: 5, cursor: "pointer", padding: 0, flexShrink: 0 }}
                    />
                    <span style={{ color: TOKENS.text, fontSize: 13, flex: 1 }}>{sliceLabel}</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: TOKENS.textMuted }}>{currentColor}</span>
                    <button
                      onClick={() => setSliceColors((prev) => { const n = {...prev}; delete n[sliceLabel]; return n; })}
                      style={{ background: "transparent", border: `1px solid ${TOKENS.border}`, borderRadius: 5, padding: "2px 8px", color: TOKENS.textMuted, fontSize: 11, cursor: "pointer" }}
                    >reset</button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Warna per stack category — stacked_bar */}
          {type === "stacked_bar" && chart.stack_categories?.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label style={{ color: TOKENS.textMuted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Warna per kategori stack
              </label>
              {chart.stack_categories.map((cat, i) => {
                const DEFAULTS = ["#2DD4A7","#8B80F0","#E8A23D","#5B9BD5","#E2574C","#C792EA"];
                const currentColor = sliceColors[cat] ?? DEFAULTS[i % DEFAULTS.length];
                return (
                  <div key={cat} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <input type="color" value={currentColor}
                      onChange={(e) => setSliceColors((prev) => ({ ...prev, [cat]: e.target.value }))}
                      style={{ width: 28, height: 28, border: "none", borderRadius: 5, cursor: "pointer", padding: 0, flexShrink: 0 }}
                    />
                    <span style={{ color: TOKENS.text, fontSize: 13, flex: 1 }}>{cat}</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: TOKENS.textMuted }}>{currentColor}</span>
                    <button
                      onClick={() => setSliceColors((prev) => { const n = {...prev}; delete n[cat]; return n; })}
                      style={{ background: "transparent", border: `1px solid ${TOKENS.border}`, borderRadius: 5, padding: "2px 8px", color: TOKENS.textMuted, fontSize: 11, cursor: "pointer" }}
                    >reset</button>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleSave} style={saveBtnStyle}><Check size={12} /> Terapkan</button>
            <button onClick={handleCancel} style={cancelBtnStyle}><X size={12} /> Batal</button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: chart.color ?? "#2DD4A7", flexShrink: 0, display: "inline-block" }} />
          <TypeBadge type={chart.type} />
          <span style={{ color: TOKENS.text, fontSize: 13, flex: 1 }}>{chart.title}</span>
          <button onClick={() => setEditing(true)} title="Edit" style={iconBtnStyle}><Pencil size={14} /></button>
          <button onClick={onDelete} title="Hapus" style={{ ...iconBtnStyle, color: "#e06c75" }}><Trash2 size={14} /></button>
        </div>
      )}
    </div>
  );
}

// ─── Baris KPI ───────────────────────────────────────────────────────────
function KpiRow({ kpi, onChange, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(kpi.label);
  const [value, setValue] = useState(String(kpi.value));
  const [color, setColor] = useState(kpi.color ?? "#2DD4A7");

  function handleSave() {
    const parsed = parseFloat(value.replace(",", "."));
    onChange({ ...kpi, label, value: isNaN(parsed) ? kpi.value : parsed, color });
    setEditing(false);
  }
  function handleCancel() {
    setLabel(kpi.label); setValue(String(kpi.value));
    setColor(kpi.color ?? "#2DD4A7"); setEditing(false);
  }

  const dotColor = kpi.color ?? TOKENS.accent;

  return (
    <div style={{
      background: TOKENS.panel,
      border: `1px solid ${editing ? TOKENS.accent + "88" : TOKENS.border}`,
      borderRadius: 8, padding: "11px 14px", transition: "border-color 0.15s",
    }}>
      {editing ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <input value={label} onChange={(e) => setLabel(e.target.value)}
            placeholder="Label KPI" style={inputStyle} />
          <input value={value} onChange={(e) => setValue(e.target.value)}
            placeholder="Nilai (angka)" style={inputStyle} />
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <label style={{ color: TOKENS.textMuted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>Warna KPI</label>
            <input type="color" value={color}
              onChange={(e) => setColor(e.target.value)}
              style={{ width: 28, height: 28, border: "none", borderRadius: 5, cursor: "pointer", padding: 0 }}
            />
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: TOKENS.textMuted }}>{color}</span>
            <button onClick={() => setColor("#2DD4A7")} style={{
              background: "transparent", border: `1px solid ${TOKENS.border}`,
              borderRadius: 5, padding: "2px 8px", color: TOKENS.textMuted, fontSize: 11, cursor: "pointer",
            }}>reset</button>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleSave} style={saveBtnStyle}><Check size={12} /> Terapkan</button>
            <button onClick={handleCancel} style={cancelBtnStyle}><X size={12} /> Batal</button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: dotColor, flexShrink: 0, display: "inline-block" }} />
          <span style={{
            background: dotColor + "18", color: dotColor,
            border: `1px solid ${dotColor}44`, borderRadius: 4,
            padding: "1px 7px", fontSize: 11,
            fontFamily: "'JetBrains Mono', monospace", fontWeight: 600,
          }}>KPI</span>
          <span style={{ color: TOKENS.text, fontSize: 13, flex: 1 }}>{kpi.label}</span>
          <span style={{ color: TOKENS.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, marginRight: 8 }}>
            {Number(kpi.value).toLocaleString("id-ID", { maximumFractionDigits: 2 })}
          </span>
          <button onClick={() => setEditing(true)} title="Edit" style={iconBtnStyle}><Pencil size={14} /></button>
          <button onClick={onDelete} title="Hapus" style={{ ...iconBtnStyle, color: "#e06c75" }}><Trash2 size={14} /></button>
        </div>
      )}
    </div>
  );
}

// ─── Form tambah KPI baru ─────────────────────────────────────────────────
function AddKpiForm({ dashboard, onAdd, onClose }) {
  const numericCols = dashboard.columns.filter((c) => c.type === "Numeric").map((c) => c.name);
  const catCols = dashboard.columns.filter((c) => c.type === "Category").map((c) => c.name);
  const rows = dashboard.preview_rows || [];

  const [label, setLabel] = useState("");
  const [kpiType, setKpiType] = useState("total");

  const [catCol, setCatCol] = useState(catCols[0] ?? "");
  const [catValue, setCatValue] = useState("");
  const [addAll, setAddAll] = useState(false);

  const [numCol, setNumCol] = useState(numericCols[0] ?? "");

  const [useFilter, setUseFilter] = useState(false);
  const [filterCol, setFilterCol] = useState(catCols[0] ?? "");
  const [filterValue, setFilterValue] = useState("");

  const [customValue, setCustomValue] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [error, setError] = useState(null);

  const uniqueCountValues = catCol
    ? [...new Set(rows.map((r) => String(r[catCol] ?? "")).filter(Boolean))].sort()
    : [];

  const uniqueFilterValues = filterCol
    ? [...new Set(rows.map((r) => String(r[filterCol] ?? "")).filter(Boolean))].sort()
    : [];

  function handleCatValueChange(val) {
    setCatValue(val);
    if (!label || uniqueCountValues.includes(label)) setLabel(val);
  }

  function handleFilterColChange(col) {
    setFilterCol(col);
    setFilterValue("");
  }

  function getFilteredRows() {
    if (!useFilter || !filterCol || !filterValue) return rows;
    return rows.filter((r) => String(r[filterCol] ?? "") === filterValue);
  }

  function countForValue(val) {
    return rows.filter((r) => String(r[catCol] ?? "") === val).length;
  }

  function computeValue() {
    if (useCustom) return parseFloat(customValue.replace(",", "."));
    if (kpiType === "count") {
      if (!catCol) return rows.length;
      if (!catValue) return NaN;
      return countForValue(catValue);
    }
    const filtered = getFilteredRows();
    const vals = filtered.map((r) => parseFloat(r[numCol])).filter((v) => !isNaN(v));
    if (!vals.length) return NaN;
    if (kpiType === "total") return vals.reduce((a, b) => a + b, 0);
    if (kpiType === "average") return vals.reduce((a, b) => a + b, 0) / vals.length;
    return NaN;
  }

  const previewValue = (() => {
    if (useCustom) return null;
    try {
      const v = computeValue();
      return isNaN(v) ? null : v;
    } catch { return null; }
  })();

  function handleAdd() {
    if (!label.trim()) { setError("Label wajib diisi."); return; }
    const value = computeValue();
    if (isNaN(value)) { setError("Tidak bisa hitung nilai — lengkapi pilihan atau input manual."); return; }

    if (addAll && kpiType === "count" && catCol) {
      uniqueCountValues.forEach((val) => {
        onAdd({
          id: `kpi_${Math.random().toString(36).slice(2, 8)}`,
          label: val,
          value: countForValue(val),
          type: kpiType,
        });
      });
    } else {
      onAdd({
        id: `kpi_${Math.random().toString(36).slice(2, 8)}`,
        label: label.trim(),
        value: Math.round(value * 100) / 100,
        type: kpiType,
      });
    }
    onClose();
  }

  return (
    <div style={{
      background: TOKENS.panelAlt, border: `1px solid ${TOKENS.accent}55`,
      borderRadius: 10, padding: 16, display: "flex", flexDirection: "column", gap: 12,
    }}>
      <p style={{ color: TOKENS.accent, fontWeight: 700, fontSize: 13, margin: 0 }}>+ Tambah KPI baru</p>

      {/* Tipe agregasi */}
      <div>
        <label style={labelStyle}>Tipe agregasi</label>
        <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
          {KPI_TYPES.map((t) => (
            <button key={t.value} onClick={() => { setKpiType(t.value); setError(null); }} title={t.desc} style={{
              background: kpiType === t.value ? TOKENS.accent + "33" : TOKENS.panel,
              border: `1px solid ${kpiType === t.value ? TOKENS.accent : TOKENS.border}`,
              borderRadius: 6, padding: "4px 12px",
              color: kpiType === t.value ? TOKENS.accent : TOKENS.textMuted,
              fontSize: 12, cursor: "pointer", fontWeight: kpiType === t.value ? 700 : 400,
            }}>{t.label}</button>
          ))}
        </div>
      </div>

      {/* COUNT */}
      {kpiType === "count" && !useCustom && (
        <>
          {catCols.length > 0 ? (
            <div>
              <label style={labelStyle}>Kolom kategori</label>
              <select value={catCol} onChange={(e) => { setCatCol(e.target.value); setCatValue(""); setLabel(""); }}
                style={{ ...inputStyle, marginTop: 6 }}>
                {catCols.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          ) : (
            <p style={{ color: TOKENS.textMuted, fontSize: 12, margin: 0 }}>Tidak ada kolom kategori.</p>
          )}
          {catCol && (
            <>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input type="checkbox" checked={addAll} onChange={(e) => setAddAll(e.target.checked)}
                  style={{ accentColor: TOKENS.accent }} />
                <span style={{ color: TOKENS.textMuted, fontSize: 12 }}>
                  Tambah semua nilai sekaligus ({uniqueCountValues.length} nilai)
                </span>
              </label>
              {!addAll && (
                <div>
                  <label style={labelStyle}>Nilai yang dihitung</label>
                  <select value={catValue} onChange={(e) => handleCatValueChange(e.target.value)}
                    style={{ ...inputStyle, marginTop: 6 }}>
                    <option value="">— pilih nilai —</option>
                    {uniqueCountValues.map((v) => (
                      <option key={v} value={v}>{v} ({countForValue(v)} baris)</option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* TOTAL / AVERAGE */}
      {kpiType !== "count" && !useCustom && (
        <>
          {numericCols.length > 0 && (
            <div>
              <label style={labelStyle}>Kolom numerik (Y)</label>
              <select value={numCol} onChange={(e) => setNumCol(e.target.value)}
                style={{ ...inputStyle, marginTop: 6 }}>
                {numericCols.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}

          {catCols.length > 0 && (
            <div style={{
              background: TOKENS.panel, border: `1px solid ${useFilter ? TOKENS.accent + "55" : TOKENS.border}`,
              borderRadius: 8, padding: 12, display: "flex", flexDirection: "column", gap: 10,
            }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input type="checkbox" checked={useFilter} onChange={(e) => setUseFilter(e.target.checked)}
                  style={{ accentColor: TOKENS.accent }} />
                <span style={{ color: useFilter ? TOKENS.accent : TOKENS.textMuted, fontSize: 12, fontWeight: useFilter ? 700 : 400 }}>
                  Filter by kolom kategori (X)
                </span>
              </label>
              {useFilter && (
                <>
                  <div>
                    <label style={labelStyle}>Kolom X (kategori)</label>
                    <select value={filterCol} onChange={(e) => handleFilterColChange(e.target.value)}
                      style={{ ...inputStyle, marginTop: 6 }}>
                      {catCols.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Nilai filter</label>
                    <select value={filterValue} onChange={(e) => {
                      setFilterValue(e.target.value);
                      if (!label) setLabel(`${kpiType === "total" ? "Total" : "Rata-rata"} ${numCol} (${e.target.value})`);
                    }}
                      style={{ ...inputStyle, marginTop: 6 }}>
                      <option value="">— semua nilai —</option>
                      {uniqueFilterValues.map((v) => {
                        const filteredCount = rows.filter((r) => String(r[filterCol] ?? "") === v).length;
                        return <option key={v} value={v}>{v} ({filteredCount} baris)</option>;
                      })}
                    </select>
                  </div>
                </>
              )}
            </div>
          )}

          {previewValue !== null && (
            <div style={{
              background: TOKENS.panel, border: `1px solid ${TOKENS.border}`,
              borderRadius: 6, padding: "8px 12px",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <span style={{ color: TOKENS.textMuted, fontSize: 12 }}>Preview nilai:</span>
              <span style={{ color: TOKENS.accent, fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 700 }}>
                {previewValue.toLocaleString("id-ID", { maximumFractionDigits: 2 })}
              </span>
              {useFilter && filterValue && (
                <span style={{ color: TOKENS.textMuted, fontSize: 11 }}>
                  (dari {getFilteredRows().length} baris {filterCol} = "{filterValue}")
                </span>
              )}
            </div>
          )}
        </>
      )}

      {!addAll && (
        <input value={label} onChange={(e) => setLabel(e.target.value)}
          placeholder="Label KPI (wajib)" style={inputStyle} />
      )}

      {!addAll && (
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <input type="checkbox" checked={useCustom} onChange={(e) => setUseCustom(e.target.checked)}
            style={{ accentColor: TOKENS.accent }} />
          <span style={{ color: TOKENS.textMuted, fontSize: 12 }}>Input nilai manual</span>
        </label>
      )}
      {useCustom && !addAll && (
        <input value={customValue} onChange={(e) => setCustomValue(e.target.value)}
          placeholder="Nilai (angka)" style={inputStyle} />
      )}

      {error && <p style={{ color: "#e06c75", fontSize: 12, margin: 0 }}>{error}</p>}

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={handleAdd} style={saveBtnStyle}>
          <Plus size={12} /> {addAll ? `Tambah ${uniqueCountValues.length} KPI` : "Tambah"}
        </button>
        <button onClick={onClose} style={cancelBtnStyle}>Batal</button>
      </div>
    </div>
  );
}

// ─── Form tambah chart baru ───────────────────────────────────────────────
function AddChartForm({ dashboard, onAdd, onClose }) {
  const numericCols = dashboard.columns.filter((c) => c.type === "Numeric").map((c) => c.name);
  const catCols = dashboard.columns.filter((c) => c.type === "Category").map((c) => c.name);
  const dateCols = dashboard.columns.filter((c) => c.type === "Date").map((c) => c.name);
  const allCols = [...catCols, ...numericCols];

  const [title, setTitle] = useState("");
  const [chartType, setChartType] = useState("bar");
  const [xCol, setXCol] = useState(allCols[0] ?? "");
  const [yCol, setYCol] = useState(numericCols[0] ?? "");
  const [stackCol, setStackCol] = useState(catCols[1] ?? catCols[0] ?? "");
  const [dateCol, setDateCol] = useState(dateCols[0] ?? "");
  const [error, setError] = useState(null);

  function buildData() {
    const rows = dashboard.preview_rows || [];
    if (!xCol) return { data: [], stack_categories: [] };

    if (chartType === "stacked_bar") {
      const groups = {};
      const stackVals = new Set();
      rows.forEach((r) => {
        const x = String(r[xCol] ?? "—");
        const s = String(r[stackCol] ?? "—");
        stackVals.add(s);
        if (!groups[x]) groups[x] = {};
        groups[x][s] = (groups[x][s] ?? 0) + 1;
      });
      const stackCategories = [...stackVals].slice(0, 6);
      const data = Object.entries(groups).slice(0, 10).map(([label, vals]) => {
        const row = { label };
        stackCategories.forEach((s) => { row[s] = vals[s] ?? 0; });
        return row;
      });
      return { data, stack_categories: stackCategories };
    }

    if (["pie", "donut"].includes(chartType) || !yCol) {
      const freq = {};
      rows.forEach((r) => { const k = String(r[xCol] ?? "—"); freq[k] = (freq[k] ?? 0) + 1; });
      return {
        data: Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([label, value]) => ({ label, value })),
        stack_categories: [],
      };
    }

    const agg = {};
    rows.forEach((r) => {
      const k = String(r[xCol] ?? "—");
      const v = parseFloat(r[yCol]);
      agg[k] = (agg[k] ?? 0) + (isNaN(v) ? 0 : v);
    });
    return {
      data: Object.entries(agg).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([label, value]) => ({ label, value })),
      stack_categories: [],
    };
  }

  function handleAdd() {
    if (!title.trim()) { setError("Judul wajib diisi."); return; }

    // ── Cabang khusus untuk trend ──
    if (chartType === "trend") {
      if (!dateCol) { setError("Pilih kolom tanggal."); return; }
      const rows = dashboard.all_rows ?? dashboard.preview_rows ?? [];
      const granularities = buildTrendData(rows, dateCol);
      const defaultGran = ["day", "hour", "minute", "week"].find((g) => granularities[g]?.length > 1) ?? "day";
      const newChart = {
        id: Math.random().toString(36).slice(2, 10),
        type: "trend",
        title: title.trim(),
        x_label: dateCol,
        y_label: "Jumlah",
        data: granularities[defaultGran] ?? [],
        stack_categories: null,
        granularities,
        active_granularity: defaultGran,
      };
      onAdd(newChart);
      onClose();
      return;
    }

    // ── Chart biasa ──
    const { data, stack_categories } = buildData();
    if (!data.length) { setError("Tidak ada data untuk kolom ini."); return; }
    const newChart = {
      id: Math.random().toString(36).slice(2, 10),
      type: chartType,
      title: title.trim(),
      x_label: xCol || null,
      y_label: yCol || null,
      data,
      stack_categories: stack_categories.length ? stack_categories : null,
    };
    onAdd(newChart);
    onClose();
  }

  const needsY = ["bar", "line", "hbar"].includes(chartType);
  const needsStack = chartType === "stacked_bar";

  return (
    <div style={{
      background: TOKENS.panelAlt, border: `1px solid ${TOKENS.accent}55`,
      borderRadius: 10, padding: 16, display: "flex", flexDirection: "column", gap: 12,
    }}>
      <p style={{ color: TOKENS.accent, fontWeight: 700, fontSize: 13, margin: 0 }}>+ Tambah chart baru</p>

      <input value={title} onChange={(e) => setTitle(e.target.value)}
        placeholder="Judul chart (wajib)" style={inputStyle} />

      {/* Tipe chart */}
      <div>
        <label style={labelStyle}>Tipe chart</label>
        <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
          {CHART_TYPES.map((t) => (
            <button key={t.value} onClick={() => setChartType(t.value)} title={t.desc} style={{
              background: chartType === t.value ? TOKENS.accent + "33" : TOKENS.panel,
              border: `1px solid ${chartType === t.value ? TOKENS.accent : TOKENS.border}`,
              borderRadius: 6, padding: "4px 12px",
              color: chartType === t.value ? TOKENS.accent : TOKENS.textMuted,
              fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
              cursor: "pointer", fontWeight: chartType === t.value ? 700 : 400,
            }}>{t.label}</button>
          ))}
        </div>
        <p style={{ color: TOKENS.textMuted, fontSize: 11, margin: "5px 0 0" }}>
          {CHART_TYPES.find((t) => t.value === chartType)?.desc}
        </p>
      </div>

      {/* ── Pilihan kolom khusus trend ── */}
      {chartType === "trend" ? (
        dateCols.length > 0 ? (
          <div>
            <label style={labelStyle}>Kolom tanggal</label>
            <select value={dateCol} onChange={(e) => setDateCol(e.target.value)}
              style={{ ...inputStyle, marginTop: 6 }}>
              {dateCols.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <p style={{ color: TOKENS.textMuted, fontSize: 11, margin: "5px 0 0" }}>
              Dihitung jumlah baris per menit/jam/hari/minggu — bisa diganti-ganti di dashboard.
            </p>
          </div>
        ) : (
          <p style={{ color: TOKENS.textMuted, fontSize: 12, margin: 0 }}>
            Tidak ada kolom bertipe Date di dataset ini.
          </p>
        )
      ) : (
        <>
          {/* Kolom X */}
          {allCols.length > 0 && (
            <div>
              <label style={labelStyle}>{needsStack ? "Kolom X (sumbu utama)" : "Kolom X (label)"}</label>
              <select value={xCol} onChange={(e) => setXCol(e.target.value)}
                style={{ ...inputStyle, marginTop: 6 }}>
                {allCols.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}

          {/* Kolom stack — khusus stacked_bar */}
          {needsStack && catCols.length > 0 && (
            <div>
              <label style={labelStyle}>Kolom stack (warna/segmen)</label>
              <select value={stackCol} onChange={(e) => setStackCol(e.target.value)}
                style={{ ...inputStyle, marginTop: 6 }}>
                {catCols.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}

          {/* Kolom Y — bar/line/hbar */}
          {needsY && numericCols.length > 0 && (
            <div>
              <label style={labelStyle}>Kolom Y (nilai numerik)</label>
              <select value={yCol} onChange={(e) => setYCol(e.target.value)}
                style={{ ...inputStyle, marginTop: 6 }}>
                {numericCols.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}
        </>
      )}

      {error && <p style={{ color: "#e06c75", fontSize: 12, margin: 0 }}>{error}</p>}
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={handleAdd} style={saveBtnStyle}><Plus size={12} /> Tambah</button>
        <button onClick={onClose} style={cancelBtnStyle}>Batal</button>
      </div>
    </div>
  );
}

// ─── Komponen utama ────────────────────────────────────────────────────────
export default function DashboardEditor({ dashboard, onUpdate, onClose }) {
  const [charts, setCharts] = useState(dashboard.charts ?? []);
  const [kpis, setKpis] = useState(dashboard.kpis ?? []);

  useEffect(() => {
    const newOrder = dashboard.charts ?? [];
    setCharts((prevCharts) => {
      const byId = new Map(prevCharts.map((c) => [c.id, c]));
      return newOrder.map((c) => byId.get(c.id) ?? c);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboard.charts.map((c) => c.id).join(",")]);

  const [showAddChart, setShowAddChart] = useState(false);
  const [showAddKpi, setShowAddKpi] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [modal, setModal] = useState(null);

  function confirm(opts) {
    return new Promise((resolve) => {
      setModal({
        ...opts,
        onConfirm: () => { setModal(null); resolve(true); },
        onCancel: () => { setModal(null); resolve(false); },
      });
    });
  }

  function handleChartChange(updated) {
    setCharts((prev) => prev.map((c) => c.id === updated.id ? updated : c));
  }
  async function handleChartDelete(chart) {
    const ok = await confirm({
      message: "Hapus chart ini?",
      detail: `"${chart.title}" akan dihapus. Belum tersimpan sampai klik Save.`,
      confirmLabel: "Hapus", confirmColor: "#e06c75",
    });
    if (ok) setCharts((prev) => prev.filter((c) => c.id !== chart.id));
  }
  async function handleChartAdd(newChart) {
    const ok = await confirm({
      message: "Tambah chart baru?",
      detail: `"${newChart.title}" akan ditambahkan.`,
      confirmLabel: "Tambah", confirmColor: TOKENS.accent,
    });
    if (ok) setCharts((prev) => [...prev, newChart]);
    setShowAddChart(false);
  }

  function handleKpiChange(updated) {
    setKpis((prev) => prev.map((k) => k.id === updated.id ? updated : k));
  }
  async function handleKpiDelete(kpi) {
    const ok = await confirm({
      message: "Hapus KPI ini?",
      detail: `"${kpi.label}" akan dihapus.`,
      confirmLabel: "Hapus", confirmColor: "#e06c75",
    });
    if (ok) setKpis((prev) => prev.filter((k) => k.id !== kpi.id));
  }
  async function handleKpiAdd(newKpi) {
    if (Array.isArray(newKpi)) {
      // bulk add (addAll)
      const ok = await confirm({
        message: `Tambah ${newKpi.length} KPI sekaligus?`,
        detail: "Semua nilai kategori akan ditambahkan.",
        confirmLabel: "Tambah", confirmColor: TOKENS.accent,
      });
      if (ok) setKpis((prev) => [...prev, ...newKpi]);
    } else {
      const ok = await confirm({
        message: "Tambah KPI baru?",
        detail: `"${newKpi.label}" (${newKpi.value.toLocaleString("id-ID")}) akan ditambahkan.`,
        confirmLabel: "Tambah", confirmColor: TOKENS.accent,
      });
      if (ok) setKpis((prev) => [...prev, newKpi]);
    }
    setShowAddKpi(false);
  }

  async function handleSave() {
    const ok = await confirm({
      message: "Simpan perubahan?",
      detail: "Semua edit pada chart dan KPI akan disimpan ke database.",
      confirmLabel: "Simpan", confirmColor: TOKENS.accent,
    });
    if (!ok) return;

    setSaving(true);
    setSaveError(null);
    try {
      const originalChartIds = new Set((dashboard.charts ?? []).map((c) => c.id));
      const currentChartIds  = new Set(charts.map((c) => c.id));

      for (const id of originalChartIds) {
        if (!currentChartIds.has(id)) {
          await fetch(`${API}/api/dashboards/${dashboard.id}/charts/${id}`, { method: "DELETE" });
        }
      }

      for (const chart of charts) {
        if (!originalChartIds.has(chart.id)) {
          await fetch(`${API}/api/dashboards/${dashboard.id}/charts`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: chart.type,
              title: chart.title,
              x_label: chart.x_label ?? null,
              y_label: chart.y_label ?? null,
              data: chart.data,
              stack_categories: chart.stack_categories ?? null,
              granularities: chart.granularities ?? null,
              active_granularity: chart.active_granularity ?? null,
            }),
          });
        }
      }

      await fetch(`${API}/api/dashboards/${dashboard.id}/charts-reorder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ charts }),
      });

      await fetch(`${API}/api/dashboards/${dashboard.id}/kpis`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kpis }),
      });

      const finalRes  = await fetch(`${API}/api/dashboards/${dashboard.id}`);
      const finalData = await finalRes.json();
      onUpdate(finalData);
      onClose();
    } catch (e) {
      setSaveError("Gagal menyimpan. Coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  const chartChanged = JSON.stringify(charts) !== JSON.stringify(dashboard.charts ?? []);
  const kpiChanged = JSON.stringify(kpis) !== JSON.stringify(dashboard.kpis ?? []);
  const hasPending = chartChanged || kpiChanged;

  return (
    <>
      {modal && <ConfirmModal {...modal} />}

      <div style={{
        background: TOKENS.bg ?? "#0f0f13",
        border: `1px solid ${hasPending ? TOKENS.accent + "66" : TOKENS.border}`,
        borderRadius: 12, padding: 20,
        display: "flex", flexDirection: "column", gap: 16,
        transition: "border-color 0.2s",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <p style={{ color: TOKENS.text, fontWeight: 700, fontSize: 15, margin: 0 }}>Edit Dashboard</p>
            <p style={{ color: TOKENS.textMuted, fontSize: 12, margin: "3px 0 0" }}>
              {charts.length} chart · {kpis.length} KPI · {dashboard.title}
              {hasPending && (
                <span style={{ marginLeft: 10, color: TOKENS.accent, fontWeight: 600, fontSize: 11 }}>
                  ● Ada perubahan yang belum disimpan
                </span>
              )}
            </p>
          </div>
          <button onClick={onClose} style={{ ...iconBtnStyle, color: TOKENS.textMuted }}><X size={16} /></button>
        </div>

        {/* ── Seksi KPI ── */}
        <div>
          <p style={sectionLabel}>KPI Cards</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {kpis.length === 0 && (
              <p style={{ color: TOKENS.textMuted, fontSize: 13, textAlign: "center", padding: "12px 0" }}>Tidak ada KPI.</p>
            )}
            {kpis.map((kpi) => (
              <KpiRow key={kpi.id} kpi={kpi} onChange={handleKpiChange} onDelete={() => handleKpiDelete(kpi)} />
            ))}
          </div>
          {showAddKpi ? (
            <div style={{ marginTop: 10 }}>
              <AddKpiForm dashboard={dashboard} onAdd={handleKpiAdd} onClose={() => setShowAddKpi(false)} />
            </div>
          ) : (
            <button onClick={() => setShowAddKpi(true)} style={addDashedBtn}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = TOKENS.accent; e.currentTarget.style.color = TOKENS.accent; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = TOKENS.border; e.currentTarget.style.color = TOKENS.textMuted; }}>
              <Plus size={14} /> Tambah KPI
            </button>
          )}
        </div>

        {/* ── Seksi Chart ── */}
        <div>
          <p style={sectionLabel}>Charts</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {charts.length === 0 && (
              <p style={{ color: TOKENS.textMuted, fontSize: 13, textAlign: "center", padding: "12px 0" }}>Belum ada chart.</p>
            )}
            {charts.map((chart) => (
              <ChartRow key={chart.id} chart={chart} onChange={handleChartChange} onDelete={() => handleChartDelete(chart)} />
            ))}
          </div>
          {showAddChart ? (
            <div style={{ marginTop: 10 }}>
              <AddChartForm dashboard={dashboard} onAdd={handleChartAdd} onClose={() => setShowAddChart(false)} />
            </div>
          ) : (
            <button onClick={() => setShowAddChart(true)} style={addDashedBtn}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = TOKENS.accent; e.currentTarget.style.color = TOKENS.accent; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = TOKENS.border; e.currentTarget.style.color = TOKENS.textMuted; }}>
              <Plus size={14} /> Tambah chart
            </button>
          )}
        </div>

        {/* Footer */}
        {saveError && <p style={{ color: "#e06c75", fontSize: 12, margin: 0 }}>{saveError}</p>}
        <div style={{
          display: "flex", gap: 10, justifyContent: "flex-end",
          paddingTop: 12, borderTop: `1px solid ${TOKENS.border}`,
        }}>
          <button onClick={onClose} style={cancelBtnStyle}>Tutup tanpa simpan</button>
          <button onClick={handleSave} disabled={saving || !hasPending} style={{
            display: "flex", alignItems: "center", gap: 6,
            background: hasPending ? TOKENS.accent : TOKENS.border,
            color: hasPending ? "#000" : TOKENS.textMuted,
            border: "none", borderRadius: 7, padding: "7px 18px",
            fontSize: 13, fontWeight: 700,
            cursor: saving || !hasPending ? "not-allowed" : "pointer",
            opacity: saving ? 0.7 : 1, transition: "all 0.2s",
          }}>
            <Save size={14} />
            {saving ? "Menyimpan…" : "Simpan perubahan"}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────
const iconBtnStyle = {
  background: "transparent", border: "none",
  color: TOKENS?.textMuted ?? "#888",
  cursor: "pointer", padding: 4, borderRadius: 4,
  display: "flex", alignItems: "center",
};
const inputStyle = {
  background: TOKENS?.panelAlt ?? "#1a1a22",
  border: `1px solid ${TOKENS?.border ?? "#2a2a35"}`,
  borderRadius: 6, padding: "6px 10px",
  color: TOKENS?.text ?? "#e0e0e0",
  fontSize: 13, outline: "none",
  width: "100%", boxSizing: "border-box",
};
const saveBtnStyle = {
  display: "flex", alignItems: "center", gap: 5,
  background: TOKENS?.accent ?? "#00bfa5", color: "#000",
  border: "none", borderRadius: 6,
  padding: "5px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer",
};
const cancelBtnStyle = {
  display: "flex", alignItems: "center", gap: 5,
  background: "transparent", color: TOKENS?.textMuted ?? "#888",
  border: `1px solid ${TOKENS?.border ?? "#2a2a35"}`,
  borderRadius: 6, padding: "5px 14px", fontSize: 12, cursor: "pointer",
};
const labelStyle = {
  color: TOKENS?.textMuted ?? "#888",
  fontSize: 11, fontWeight: 600,
  textTransform: "uppercase", letterSpacing: "0.05em",
};
const sectionLabel = {
  color: TOKENS?.textMuted ?? "#888",
  fontSize: 11, fontWeight: 700,
  textTransform: "uppercase", letterSpacing: "0.06em",
  margin: "0 0 8px",
};
const addDashedBtn = {
  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
  background: "transparent",
  border: `1px dashed ${TOKENS?.border ?? "#2a2a35"}`,
  borderRadius: 8, padding: "9px 0",
  color: TOKENS?.textMuted ?? "#888", fontSize: 13,
  cursor: "pointer", width: "100%", marginTop: 8,
  transition: "border-color 0.15s, color 0.15s",
};