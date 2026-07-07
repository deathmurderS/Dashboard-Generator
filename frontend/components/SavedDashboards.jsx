import React, { useEffect, useState } from "react";
import { ArrowLeft, Trash2, FileSpreadsheet, AlertTriangle, Inbox } from "lucide-react";
import { listDashboards, getDashboard, deleteDashboard, ApiError } from "../services/api";
import DashboardView from "./DashboardView";
import { TOKENS } from "./theme";

function formatDate(iso) {
  try { return new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }); }
  catch { return iso; }
}

export default function SavedDashboards() {
  const [items, setItems]         = useState([]);
  const [status, setStatus]       = useState("loading");
  const [error, setError]         = useState("");
  const [selected, setSelected]   = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const refresh = async () => {
    setStatus("loading");
    try { const data = await listDashboards(); setItems(data); setStatus("ready"); }
    catch (err) { setStatus("error"); setError(err instanceof ApiError ? err.message : "Gagal memuat daftar."); }
  };

  useEffect(() => { refresh(); }, []);

  const openDashboard = async (id) => {
    try { setSelected(await getDashboard(id)); }
    catch (err) { setError(err instanceof ApiError ? err.message : "Gagal membuka dashboard."); }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm("Hapus dashboard ini?")) return;
    setDeletingId(id);
    try { await deleteDashboard(id); setItems((prev) => prev.filter((d) => d.id !== id)); }
    catch (err) { setError(err instanceof ApiError ? err.message : "Gagal menghapus."); }
    finally { setDeletingId(null); }
  };

  return (
    <div style={{ background: TOKENS.bg, color: TOKENS.text, fontFamily: "Inter, sans-serif", minHeight: "100%" }}>
      <div style={{
        borderBottom: `1px solid ${TOKENS.border}`,
        background: TOKENS.panel,
        padding: "0 32px",
        display: "flex", alignItems: "center", gap: 12,
        height: 56,
        position: "sticky", top: 0, zIndex: 50,
      }}>
        {selected && (
          <button onClick={() => setSelected(null)} style={{
            border: `1px solid ${TOKENS.border}`, color: TOKENS.textMuted,
            background: "transparent", borderRadius: 7, padding: 6,
            cursor: "pointer", display: "flex", alignItems: "center",
          }}>
            <ArrowLeft size={16} />
          </button>
        )}
        <span style={{
          color: TOKENS.accent, fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10, textTransform: "uppercase", letterSpacing: "0.15em",
          border: `1px solid ${TOKENS.accent}44`, borderRadius: 4, padding: "2px 8px",
        }}>SAVED</span>
        <span style={{ color: TOKENS.text, fontWeight: 700, fontSize: 15 }}>
          {selected ? selected.title : "Dashboard Saya"}
        </span>
      </div>

      {/* ── Konten ── */}
      <div style={{ padding: "32px 40px" }}>
        {error && (
          <div style={{
            background: "#1A0A0A", border: `1px solid ${TOKENS.danger}`, color: TOKENS.danger,
            borderRadius: 8, padding: "12px 16px", fontSize: 13,
            display: "flex", alignItems: "center", gap: 8, marginBottom: 20,
          }}>
            <AlertTriangle size={16} /> {error}
          </div>
        )}

        {selected ? (
          <DashboardView dashboard={selected} />
        ) : status === "loading" ? (
          <p style={{ color: TOKENS.textMuted, fontSize: 13 }}>Memuat daftar dashboard…</p>
        ) : items.length === 0 ? (
          <div style={{
            background: TOKENS.panel, border: `1px solid ${TOKENS.border}`,
            borderRadius: 12, padding: "80px 0",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          }}>
            <Inbox size={28} style={{ color: TOKENS.textMuted }} />
            <p style={{ color: TOKENS.textMuted, fontSize: 13, marginTop: 12 }}>
              Belum ada dashboard yang disimpan.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {items.map((item) => (
              <div key={item.id} onClick={() => openDashboard(item.id)} style={{
                background: TOKENS.panel, border: `1px solid ${TOKENS.border}`,
                borderRadius: 10, padding: "14px 18px",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                cursor: "pointer", transition: "border-color 0.15s",
              }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = TOKENS.accent}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = TOKENS.border}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 8,
                    background: `${TOKENS.accent}15`,
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    <FileSpreadsheet size={18} style={{ color: TOKENS.accent }} />
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, margin: "0 0 2px" }}>{item.title}</p>
                    <p style={{ color: TOKENS.textMuted, fontSize: 11, margin: 0 }}>
                      {item.filename} · {item.total_rows.toLocaleString("id-ID")} baris ·{" "}
                      {item.total_columns} kolom · {formatDate(item.created_at)}
                    </p>
                  </div>
                </div>
                <button onClick={(e) => handleDelete(item.id, e)} disabled={deletingId === item.id}
                  style={{
                    color: TOKENS.danger, background: "transparent", border: "none",
                    padding: 8, borderRadius: 7, cursor: "pointer", flexShrink: 0,
                  }}
                  title="Hapus dashboard"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}