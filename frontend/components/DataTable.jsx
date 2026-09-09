import React, { useCallback, useEffect, useRef, useState } from "react";
import { Search, ChevronLeft, ChevronRight, Download, FileSpreadsheet, X } from "lucide-react";
import { getDashboardRows, exportDashboard } from "../services/api";
import { TOKENS } from "./theme";
import { useToast } from "../context/ToastContext";

const TYPE_META = {
  Date:     { color: TOKENS.date,     label: "date" },
  Numeric:  { color: TOKENS.accent,   label: "numeric" },
  Category: { color: TOKENS.category, label: "category" },
};

const PAGE_SIZES = [25, 50, 100, 200];

export default function DataTable({ dashboardId, columns, totalRows }) {
  const { toast } = useToast();
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [total, setTotal] = useState(totalRows ?? 0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [columnFilter, setColumnFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const searchTimer = useRef(null);

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getDashboardRows(dashboardId, {
        page,
        pageSize,
        search,
        columnFilter,
      });
      setRows(data.rows);
      setTotal(data.total);
      setTotalPages(data.total_pages);
    } catch (err) {
      toast.error(err.message || "Gagal memuat data.");
    } finally {
      setLoading(false);
    }
  }, [dashboardId, page, pageSize, search, columnFilter, toast]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  // Debounce search
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchInput(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setSearch(val);
      setPage(1);
    }, 400);
  };

  const handlePageSizeChange = (e) => {
    setPageSize(Number(e.target.value));
    setPage(1);
  };

  const handleExport = async (format) => {
    setExporting(true);
    try {
      await exportDashboard(dashboardId, format);
      toast.success(`Data berhasil diexport sebagai ${format.toUpperCase()}.`);
    } catch (err) {
      toast.error(err.message || "Gagal export data.");
    } finally {
      setExporting(false);
    }
  };

  const hasFilter = search || columnFilter;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Toolbar */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        {/* Search */}
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search size={14} style={{
            position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
            color: TOKENS.textMuted, pointerEvents: "none",
          }} />
          <input
            value={searchInput}
            onChange={handleSearchChange}
            placeholder="Cari di semua kolom…"
            style={{
              width: "100%", boxSizing: "border-box",
              background: TOKENS.panelAlt, border: `1px solid ${TOKENS.border}`,
              borderRadius: 7, padding: "7px 12px 7px 32px",
              fontSize: 12, color: TOKENS.text, outline: "none",
            }}
          />
          {searchInput && (
            <button onClick={() => { setSearchInput(""); setSearch(""); setPage(1); }} style={{
              position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
              background: "transparent", border: "none", color: TOKENS.textMuted,
              cursor: "pointer", padding: 2,
            }}>
              <X size={12} />
            </button>
          )}
        </div>

        {/* Page size */}
        <select value={pageSize} onChange={handlePageSizeChange} style={{
          background: TOKENS.panelAlt, border: `1px solid ${TOKENS.border}`,
          borderRadius: 7, padding: "7px 10px", fontSize: 12, color: TOKENS.text,
          cursor: "pointer", outline: "none",
        }}>
          {PAGE_SIZES.map((s) => (
            <option key={s} value={s}>{s} baris</option>
          ))}
        </select>

        {/* Export buttons */}
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => handleExport("csv")} disabled={exporting} style={{
            display: "flex", alignItems: "center", gap: 5,
            background: "transparent", border: `1px solid ${TOKENS.border}`,
            borderRadius: 7, padding: "7px 12px", color: TOKENS.textMuted,
            fontSize: 12, cursor: exporting ? "not-allowed" : "pointer",
            opacity: exporting ? 0.5 : 1,
          }}>
            <Download size={13} /> CSV
          </button>
          <button onClick={() => handleExport("xlsx")} disabled={exporting} style={{
            display: "flex", alignItems: "center", gap: 5,
            background: "transparent", border: `1px solid ${TOKENS.border}`,
            borderRadius: 7, padding: "7px 12px", color: TOKENS.textMuted,
            fontSize: 12, cursor: exporting ? "not-allowed" : "pointer",
            opacity: exporting ? 0.5 : 1,
          }}>
            <FileSpreadsheet size={13} /> XLSX
          </button>
        </div>
      </div>

      {/* Info bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: TOKENS.textMuted }}>
        <span>
          Menampilkan {rows.length} dari {total.toLocaleString("id-ID")} baris
        </span>
        {hasFilter && (
          <span style={{
            background: TOKENS.accent + "18", color: TOKENS.accent,
            border: `1px solid ${TOKENS.accent}44`, borderRadius: 4,
            padding: "1px 8px", fontWeight: 600,
          }}>
            Filter aktif
          </span>
        )}
        {loading && <span style={{ color: TOKENS.accent }}>Memuat…</span>}
      </div>

      {/* Table */}
      <div style={{
        background: TOKENS.panel, border: `1px solid ${TOKENS.border}`,
        borderRadius: 10, overflow: "auto", maxHeight: 400,
      }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
            <tr style={{ background: TOKENS.panelAlt }}>
              {columns.map((col) => {
                const meta = TYPE_META[col.type] ?? { color: TOKENS.textMuted, label: col.type };
                return (
                  <th key={col.name} style={{
                    borderBottom: `1px solid ${TOKENS.border}`,
                    color: TOKENS.text, textAlign: "left",
                    padding: "10px 14px", fontWeight: 600,
                    whiteSpace: "nowrap",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{
                        width: 8, height: 8, borderRadius: 2,
                        background: meta.color, display: "inline-block", flexShrink: 0,
                      }} />
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
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{
                  padding: "32px 0", textAlign: "center", color: TOKENS.textMuted,
                }}>
                  {loading ? "Memuat data…" : "Tidak ada data yang cocok dengan filter."}
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
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
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
            style={{
              display: "flex", alignItems: "center", gap: 4,
              background: "transparent", border: `1px solid ${TOKENS.border}`,
              borderRadius: 6, padding: "5px 12px", color: TOKENS.textMuted,
              fontSize: 12, cursor: page <= 1 ? "not-allowed" : "pointer",
              opacity: page <= 1 ? 0.4 : 1,
            }}
          >
            <ChevronLeft size={13} /> Sebelumnya
          </button>
          <span style={{ color: TOKENS.textMuted, fontSize: 12 }}>
            Halaman {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
            style={{
              display: "flex", alignItems: "center", gap: 4,
              background: "transparent", border: `1px solid ${TOKENS.border}`,
              borderRadius: 6, padding: "5px 12px", color: TOKENS.textMuted,
              fontSize: 12, cursor: page >= totalPages ? "not-allowed" : "pointer",
              opacity: page >= totalPages ? 0.4 : 1,
            }}
          >
            Berikutnya <ChevronRight size={13} />
          </button>
        </div>
      )}
    </div>
  );
}