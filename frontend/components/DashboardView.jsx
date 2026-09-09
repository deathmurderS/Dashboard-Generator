import React, { useState, useRef, useCallback } from "react";
import { Calendar, Hash, Type, Download, Pencil, Table2, Activity } from "lucide-react";
import { toPng } from "html-to-image";
import ChartGrid from "../charts/ChartGrid";
import DataTable from "./DataTable";
import DataQualityPanel from "./DataQualityPanel";
import { reorderCharts } from "../services/api";
import { TOKENS } from "./theme";
import DashboardEditor from "./DashboardEditor";

const TYPE_META = {
  Date:     { color: TOKENS.date,     icon: Calendar, label: "date" },
  Numeric:  { color: TOKENS.accent,   icon: Hash,     label: "numeric" },
  Category: { color: TOKENS.category, icon: Type,     label: "category" },
};

function formatKpiValue(value) {
  if (typeof value !== "number") return value;
  if (Math.abs(value) >= 1_000_000)
    return (value / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 2 }) + " jt";
  if (Math.abs(value) >= 100_000)
    return (value / 1_000).toLocaleString("id-ID", { maximumFractionDigits: 1 }) + " rb";
  return value.toLocaleString("id-ID", { maximumFractionDigits: 2 });
}

function KpiCard({ kpi }) {
  const kpiColor = kpi.color ?? TOKENS.accent;
  return (
    <div style={{
      background: TOKENS.panel,
      border: `1px solid ${TOKENS.border}`,
      borderTop: `3px solid ${kpiColor}`,
      borderRadius: 10,
      padding: "14px 16px",
      display: "flex", flexDirection: "column", gap: 4,
      minWidth: 0,
    }}>
      <p style={{
        color: kpiColor, fontSize: 11, fontWeight: 700,
        textTransform: "uppercase", letterSpacing: "0.06em",
        margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
      }}>
        {kpi.label}
      </p>
      <p style={{
        fontFamily: "'JetBrains Mono', monospace",
        color: TOKENS.text, fontSize: 22, fontWeight: 800,
        margin: 0, lineHeight: 1.2,
      }}>
        {formatKpiValue(kpi.value)}
      </p>
    </div>
  );
}

export default function DashboardView({ dashboard, onUpdate }) {
  const [editMode, setEditMode] = useState(false);
  const [current, setCurrent] = useState(dashboard);
  const [exporting, setExporting] = useState(false);
  const [dataTab, setDataTab] = useState("data"); // "data" | "quality"
  const dashboardRef = useRef(null);

  function handleUpdate(updated) {
    setCurrent(updated);
    if (onUpdate) onUpdate(updated);
  }

  // FIX: setelah drag-reorder, panggil onUpdate juga supaya DashboardEditor
  // (kalau sedang terbuka) ikut sinkron dengan urutan baru, bukan urutan basi
  // dari saat editor pertama kali dibuka.
  async function handleReorder(newCharts) {
    const updated = { ...current, charts: newCharts };
    setCurrent(updated);
    if (onUpdate) onUpdate(updated);
    try {
      await reorderCharts(current.id, newCharts);
    } catch (e) {
      console.error("Gagal simpan urutan chart:", e);
    }
  }

  const handleExportDashboard = useCallback(async () => {
    if (!dashboardRef.current) return;
    setExporting(true);
    try {
      const dataUrl = await toPng(dashboardRef.current, {
        backgroundColor: "#0f0f13", pixelRatio: 2,
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${(current.title || "dashboard").replace(/\s+/g, "_")}.png`;
      a.click();
    } catch (e) {
      console.error("Export gagal:", e);
    } finally {
      setExporting(false);
    }
  }, [current.title]);

  const columns = current?.columns || [];
  const rows    = current?.preview_rows || [];
  const kpis    = current?.kpis || [];
  const charts  = current?.charts || [];

  const kpiRow1 = kpis.slice(0, 4);
  const kpiRow2 = kpis.slice(4);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button onClick={handleExportDashboard} disabled={exporting} style={{
          display: "flex", alignItems: "center", gap: 6,
          background: "transparent", border: `1px solid ${TOKENS.border}`,
          borderRadius: 7, padding: "6px 14px", color: TOKENS.textMuted,
          fontSize: 12, cursor: exporting ? "not-allowed" : "pointer",
          opacity: exporting ? 0.5 : 1,
        }}>
          <Download size={13} />
          {exporting ? "Mengekspor…" : "Export PNG"}
        </button>
        {current?.id && (
          <button onClick={() => setEditMode((v) => !v)} style={{
            display: "flex", alignItems: "center", gap: 6,
            background: editMode ? TOKENS.accent + "22" : "transparent",
            border: `1px solid ${editMode ? TOKENS.accent : TOKENS.border}`,
            borderRadius: 7, padding: "6px 14px",
            color: editMode ? TOKENS.accent : TOKENS.textMuted,
            fontSize: 12, cursor: "pointer", fontWeight: editMode ? 700 : 400,
            transition: "all 0.15s",
          }}>
            <Pencil size={13} />
            {editMode ? "Tutup editor" : "Edit Dashboard"}
          </button>
        )}
      </div>

      {editMode && (
        <DashboardEditor
          dashboard={current}
          onUpdate={handleUpdate}
          onClose={() => setEditMode(false)}
        />
      )}

      <div ref={dashboardRef} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        {kpiRow1.length > 0 && (
          <div style={{
            display: "grid",
            gridTemplateColumns: `repeat(${Math.min(kpiRow1.length, 4)}, 1fr)`,
            gap: 12,
          }}>
            {kpiRow1.map((kpi) => <KpiCard key={kpi.id} kpi={kpi} />)}
          </div>
        )}

        {kpiRow2.length > 0 && (
          <div style={{
            display: "grid",
            gridTemplateColumns: `repeat(${Math.min(kpiRow2.length, 4)}, 1fr)`,
            gap: 12,
          }}>
            {kpiRow2.map((kpi) => <KpiCard key={kpi.id} kpi={kpi} />)}
          </div>
        )}

        <ChartGrid
          charts={charts}
          editable={editMode}
          onReorder={handleReorder}
        />

        {columns.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {/* Tab toggle: Data | Kualitas */}
            <div style={{ display: "flex", gap: 4, borderBottom: `1px solid ${TOKENS.border}`, paddingBottom: 8 }}>
              <button onClick={() => setDataTab("data")} style={{
                display: "flex", alignItems: "center", gap: 6,
                background: dataTab === "data" ? TOKENS.accent + "18" : "transparent",
                border: `1px solid ${dataTab === "data" ? TOKENS.accent : "transparent"}`,
                borderRadius: 6, padding: "5px 14px",
                color: dataTab === "data" ? TOKENS.accent : TOKENS.textMuted,
                fontSize: 12, cursor: "pointer", fontWeight: dataTab === "data" ? 700 : 400,
              }}>
                <Table2 size={13} /> Data
              </button>
              {current?.id && (
                <button onClick={() => setDataTab("quality")} style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: dataTab === "quality" ? TOKENS.accent + "18" : "transparent",
                  border: `1px solid ${dataTab === "quality" ? TOKENS.accent : "transparent"}`,
                  borderRadius: 6, padding: "5px 14px",
                  color: dataTab === "quality" ? TOKENS.accent : TOKENS.textMuted,
                  fontSize: 12, cursor: "pointer", fontWeight: dataTab === "quality" ? 700 : 400,
                }}>
                  <Activity size={13} /> Kualitas Data
                </button>
              )}
            </div>

            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              {Object.entries(TYPE_META).map(([type, meta]) => (
                <span key={type} style={{
                  display: "flex", alignItems: "center", gap: 5,
                  color: TOKENS.textMuted, fontSize: 11,
                }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: 2,
                    background: meta.color, display: "inline-block", flexShrink: 0,
                  }} />
                  {type}
                </span>
              ))}
            </div>

            {dataTab === "quality" && current?.id ? (
              <DataQualityPanel dashboardId={current.id} />
            ) : current?.id ? (
              <DataTable
                dashboardId={current.id}
                columns={columns}
                totalRows={current.total_rows}
              />
            ) : (
              <div style={{
                background: TOKENS.panel, border: `1px solid ${TOKENS.border}`,
                borderRadius: 10, overflow: "auto", maxHeight: 340,
              }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
                    <tr style={{ background: TOKENS.panelAlt }}>
                      {columns.map((col) => {
                        const meta = TYPE_META[col.type];
                        const Icon = meta.icon;
                        return (
                          <th key={col.name} style={{
                            borderBottom: `1px solid ${TOKENS.border}`,
                            color: TOKENS.text, textAlign: "left",
                            padding: "10px 14px", fontWeight: 600,
                            whiteSpace: "nowrap",
                          }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                              <Icon size={12} style={{ color: meta.color, flexShrink: 0 }} />
                              {col.name}
                            </div>
                            <span style={{
                              color: meta.color,
                              fontFamily: "'JetBrains Mono', monospace",
                              fontSize: 9, fontWeight: 400,
                            }}>
                              {meta.label}
                            </span>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={i} style={{
                        borderBottom: `1px solid ${TOKENS.border}`,
                        background: i % 2 === 0 ? "transparent" : TOKENS.panelAlt + "66",
                      }}>
                        {columns.map((col) => (
                          <td key={col.name} style={{
                            padding: "8px 14px",
                            fontFamily: col.type === "Numeric" ? "'JetBrains Mono', monospace" : "inherit",
                            color: TOKENS.text, whiteSpace: "nowrap",
                          }}>
                            {row[col.name] === null || row[col.name] === undefined
                              ? <span style={{ color: TOKENS.textMuted }}>—</span>
                              : String(row[col.name])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}