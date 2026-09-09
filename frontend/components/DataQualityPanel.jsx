import React, { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Database, TrendingUp } from "lucide-react";
import { getDashboardStats } from "../services/api";
import { TOKENS } from "./theme";
import { useToast } from "../context/ToastContext";

function formatNumber(value) {
  if (value === null || value === undefined) return "—";
  if (typeof value !== "number") return String(value);
  return value.toLocaleString("id-ID", { maximumFractionDigits: 2 });
}

function formatPct(value) {
  if (value === null || value === undefined) return "—";
  return `${value.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`;
}

export default function DataQualityPanel({ dashboardId }) {
  const { toast } = useToast();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getDashboardStats(dashboardId);
      setStats(data);
    } catch (err) {
      toast.error(err.message || "Gagal memuat statistik data.");
    } finally {
      setLoading(false);
    }
  }, [dashboardId, toast]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  if (loading) {
    return (
      <div style={{
        background: TOKENS.panel, border: `1px solid ${TOKENS.border}`,
        borderRadius: 10, padding: "20px", textAlign: "center",
        color: TOKENS.textMuted, fontSize: 13,
      }}>
        Memuat statistik data…
      </div>
    );
  }

  if (!stats) return null;

  const { columns, total_rows, total_columns, total_cells, total_missing, overall_missing_percentage } = stats;
  const hasMissing = total_missing > 0;
  const hasOutliers = columns.some((c) => c.outliers_iqr > 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Ringkasan global */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
        gap: 10,
      }}>
        <SummaryCard icon={<Database size={14} />} label="Total baris" value={total_rows.toLocaleString("id-ID")} color={TOKENS.accent} />
        <SummaryCard icon={<Database size={14} />} label="Total kolom" value={total_columns.toLocaleString("id-ID")} color={TOKENS.accent} />
        <SummaryCard icon={<AlertTriangle size={14} />} label="Missing values" value={total_missing.toLocaleString("id-ID")} color={hasMissing ? TOKENS.warning : TOKENS.success} />
        <SummaryCard icon={<CheckCircle2 size={14} />} label="Missing %" value={formatPct(overall_missing_percentage)} color={hasMissing ? TOKENS.warning : TOKENS.success} />
      </div>

      {/* Peringatan */}
      {(hasMissing || hasOutliers) && (
        <div style={{
          background: hasMissing ? "#1A1200" : "#0A1A12",
          border: `1px solid ${hasMissing ? TOKENS.warning : TOKENS.success}44`,
          borderRadius: 8, padding: "10px 14px",
          display: "flex", alignItems: "center", gap: 8,
          fontSize: 12, color: hasMissing ? TOKENS.warning : TOKENS.success,
        }}>
          <AlertTriangle size={14} />
          {hasMissing && hasOutliers
            ? `Data memiliki ${total_missing.toLocaleString("id-ID")} nilai kosong dan beberapa outlier terdeteksi.`
            : hasMissing
              ? `Data memiliki ${total_missing.toLocaleString("id-ID")} nilai kosong (${formatPct(overall_missing_percentage)}).`
              : "Data memiliki beberapa outlier yang terdeteksi (IQR method)."}
        </div>
      )}

      {/* Tabel statistik per kolom */}
      <div style={{
        background: TOKENS.panel, border: `1px solid ${TOKENS.border}`,
        borderRadius: 10, overflow: "auto", maxHeight: 400,
      }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
            <tr style={{ background: TOKENS.panelAlt }}>
              {["Kolom", "Tipe", "Missing", "Missing %", "Unik", "Min", "Max", "Mean", "Median", "Outlier"].map((h) => (
                <th key={h} style={{
                  borderBottom: `1px solid ${TOKENS.border}`,
                  color: TOKENS.text, textAlign: "left",
                  padding: "10px 12px", fontWeight: 600, whiteSpace: "nowrap",
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {columns.map((col) => {
              const typeColor = col.type === "Numeric" ? TOKENS.accent : col.type === "Date" ? TOKENS.date : TOKENS.category;
              const isNumeric = col.type === "Numeric";
              return (
                <tr key={col.name} style={{
                  borderBottom: `1px solid ${TOKENS.border}`,
                  background: col.missing > 0 ? "#1A1200" : "transparent",
                }}>
                  <td style={{ padding: "8px 12px", color: TOKENS.text, fontWeight: 600, whiteSpace: "nowrap" }}>
                    {col.name}
                  </td>
                  <td style={{ padding: "8px 12px" }}>
                    <span style={{
                      background: typeColor + "18", color: typeColor,
                      border: `1px solid ${typeColor}44`, borderRadius: 4,
                      padding: "1px 7px", fontSize: 10,
                      fontFamily: "'JetBrains Mono', monospace", fontWeight: 600,
                    }}>
                      {col.type}
                    </span>
                  </td>
                  <td style={{ padding: "8px 12px", color: col.missing > 0 ? TOKENS.warning : TOKENS.textMuted, fontFamily: "'JetBrains Mono', monospace" }}>
                    {col.missing.toLocaleString("id-ID")}
                  </td>
                  <td style={{ padding: "8px 12px", color: col.missing > 0 ? TOKENS.warning : TOKENS.textMuted, fontFamily: "'JetBrains Mono', monospace" }}>
                    {formatPct(col.missing_percentage)}
                  </td>
                  <td style={{ padding: "8px 12px", color: TOKENS.textMuted, fontFamily: "'JetBrains Mono', monospace" }}>
                    {col.unique.toLocaleString("id-ID")}
                  </td>
                  <td style={{ padding: "8px 12px", color: TOKENS.textMuted, fontFamily: "'JetBrains Mono', monospace" }}>
                    {isNumeric ? formatNumber(col.min) : col.min_date ? new Date(col.min_date).toLocaleDateString("id-ID") : "—"}
                  </td>
                  <td style={{ padding: "8px 12px", color: TOKENS.textMuted, fontFamily: "'JetBrains Mono', monospace" }}>
                    {isNumeric ? formatNumber(col.max) : col.max_date ? new Date(col.max_date).toLocaleDateString("id-ID") : "—"}
                  </td>
                  <td style={{ padding: "8px 12px", color: TOKENS.textMuted, fontFamily: "'JetBrains Mono', monospace" }}>
                    {isNumeric ? formatNumber(col.mean) : "—"}
                  </td>
                  <td style={{ padding: "8px 12px", color: TOKENS.textMuted, fontFamily: "'JetBrains Mono', monospace" }}>
                    {isNumeric ? formatNumber(col.median) : "—"}
                  </td>
                  <td style={{ padding: "8px 12px", color: col.outliers_iqr > 0 ? TOKENS.warning : TOKENS.textMuted, fontFamily: "'JetBrains Mono', monospace" }}>
                    {isNumeric ? (col.outliers_iqr ?? 0).toLocaleString("id-ID") : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryCard({ icon, label, value, color }) {
  return (
    <div style={{
      background: TOKENS.panel, border: `1px solid ${TOKENS.border}`,
      borderRadius: 8, padding: "10px 14px",
      display: "flex", alignItems: "center", gap: 10,
    }}>
      <span style={{ color, display: "flex", flexShrink: 0 }}>{icon}</span>
      <div style={{ minWidth: 0 }}>
        <div style={{ color: TOKENS.textMuted, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {label}
        </div>
        <div style={{ color: TOKENS.text, fontSize: 16, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>
          {value}
        </div>
      </div>
    </div>
  );
}