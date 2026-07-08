import React, { useCallback, useRef, useState } from "react";
import {
  UploadCloud, FileSpreadsheet, X, AlertTriangle,
  Save, Check, ChevronRight, Layers,
} from "lucide-react";
import { saveDashboard, detectSheets, uploadSheets, ApiError } from "../services/api";
import DashboardView from "./DashboardView";
import { TOKENS } from "./theme";

const MAX_FILE_MB = 25;

// ─── Komponen pilih sheet ─────────────────────────────────────────────────
function SheetSelector({ sheets, selected, onChange }) {
  const allSelected = selected.length === sheets.length;

  function toggleAll() {
    onChange(allSelected ? [] : [...sheets]);
  }

  function toggleSheet(name) {
    onChange(
      selected.includes(name)
        ? selected.filter((s) => s !== name)
        : [...selected, name]
    );
  }

  return (
    <div style={{
      background: TOKENS.panel, border: `1px solid ${TOKENS.border}`,
      borderRadius: 10, padding: 16, marginTop: 16,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Layers size={15} style={{ color: TOKENS.accent }} />
          <span style={{ color: TOKENS.text, fontWeight: 600, fontSize: 13 }}>
            Pilih sheet yang akan diproses
          </span>
        </div>
        <button onClick={toggleAll} style={{
          background: "transparent", border: `1px solid ${TOKENS.border}`,
          borderRadius: 5, padding: "3px 10px", fontSize: 11,
          color: TOKENS.textMuted, cursor: "pointer",
        }}>
          {allSelected ? "Batal semua" : "Pilih semua"}
        </button>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {sheets.map((name) => {
          const isSelected = selected.includes(name);
          return (
            <button key={name} onClick={() => toggleSheet(name)} style={{
              background: isSelected ? TOKENS.accent + "22" : TOKENS.panelAlt,
              border: `1px solid ${isSelected ? TOKENS.accent : TOKENS.border}`,
              borderRadius: 6, padding: "5px 12px",
              color: isSelected ? TOKENS.accent : TOKENS.textMuted,
              fontSize: 12, cursor: "pointer", fontWeight: isSelected ? 600 : 400,
              transition: "all 0.12s",
            }}>
              {name}
            </button>
          );
        })}
      </div>

      {selected.length === 0 && (
        <p style={{ color: "#e06c75", fontSize: 11, margin: "10px 0 0" }}>
          Pilih minimal 1 sheet.
        </p>
      )}
    </div>
  );
}

// ─── Tab navigasi antar sheet result ─────────────────────────────────────
function SheetTabs({ dashboards, activeIdx, onChange }) {
  if (dashboards.length <= 1) return null;
  return (
    <div style={{
      display: "flex", gap: 4, borderBottom: `1px solid ${TOKENS.border}`,
      marginBottom: 20, overflowX: "auto",
    }}>
      {dashboards.map((d, i) => {
        const sheetLabel = d.filename.match(/\[(.+)\]$/)?.[1] ?? d.filename;
        const active = i === activeIdx;
        return (
          <button key={i} onClick={() => onChange(i)} style={{
            background: "transparent",
            borderBottom: `2px solid ${active ? TOKENS.accent : "transparent"}`,
            border: "none", borderRadius: 0,
            padding: "8px 16px", fontSize: 12, cursor: "pointer",
            color: active ? TOKENS.accent : TOKENS.textMuted,
            fontWeight: active ? 700 : 400, whiteSpace: "nowrap",
            transition: "color 0.12s",
          }}>
            {sheetLabel}
          </button>
        );
      })}
    </div>
  );
}

// ─── Komponen utama ────────────────────────────────────────────────────────
export default function UploadPreview() {
  const [status, setStatus]           = useState("idle");      // idle | detecting | sheet_select | scanning | ready | error
  const [fileMeta, setFileMeta]       = useState(null);
  const [fileObj, setFileObj]         = useState(null);
  const [sheets, setSheets]           = useState([]);
  const [selectedSheets, setSelected] = useState([]);
  const [dashboards, setDashboards]   = useState([]);          // list hasil per sheet
  const [activeTab, setActiveTab]     = useState(0);
  const [saveStates, setSaveStates]   = useState({});          // { idx: "idle"|"saving"|"saved"|"error" }
  const [error, setError]             = useState("");
  const [dragOver, setDragOver]       = useState(false);
  const inputRef = useRef(null);

  // ── Step 1: detect sheets ──
  const handleFile = useCallback(async (file) => {
    if (!file) return;
    setError("");
    const ext = file.name.split(".").pop().toLowerCase();
    if (!["csv", "xlsx", "xls"].includes(ext)) {
      setStatus("error");
      setError("Format tidak didukung. Gunakan file .csv, .xlsx, atau .xls.");
      return;
    }
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setStatus("error");
      setError(`File terlalu besar. Maksimal ${MAX_FILE_MB}MB.`);
      return;
    }

    setStatus("detecting");
    setFileMeta({ name: file.name, size: file.size, ext });
    setFileObj(file);

    try {
      const info = await detectSheets(file);
      setSheets(info.sheets);
      setSelected(info.sheets); // default: semua dipilih

      if (!info.is_multi_sheet) {
        // CSV atau Excel 1 sheet — langsung proses
        await processSheets(file, info.sheets);
      } else {
        setStatus("sheet_select");
      }
    } catch (err) {
      setStatus("error");
      setError(err.message);
    }
  }, []);

  // ── Step 2: proses sheet terpilih ──
  async function processSheets(file, sheetNames) {
    setStatus("scanning");
    try {
      const start = performance.now();
      const results = await uploadSheets(file, sheetNames);
      const elapsed = performance.now() - start;
      await new Promise((r) => setTimeout(r, Math.max(0, 400 - elapsed)));
      setDashboards(results);
      setActiveTab(0);
      setSaveStates({});
      setStatus("ready");
    } catch (err) {
      setStatus("error");
      setError(err.message);
    }
  }

  const handleProcess = () => {
    if (selectedSheets.length === 0) return;
    processSheets(fileObj, selectedSheets);
  };

  const onDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  const reset = () => {
    setStatus("idle"); setFileMeta(null); setFileObj(null);
    setSheets([]); setSelected([]); setDashboards([]);
    setActiveTab(0); setSaveStates({}); setError("");
    if (inputRef.current) inputRef.current.value = "";
  };

  // ── Save per tab ──
  async function handleSave(idx) {
    const d = dashboards[idx];
    if (!d) return;
    setSaveStates((prev) => ({ ...prev, [idx]: "saving" }));
    try {
      await saveDashboard(d);
      setSaveStates((prev) => ({ ...prev, [idx]: "saved" }));
    } catch (err) {
      setSaveStates((prev) => ({ ...prev, [idx]: "error" }));
    }
  }

  async function handleSaveAll() {
    for (let i = 0; i < dashboards.length; i++) {
      if (saveStates[i] !== "saved") await handleSave(i);
    }
  }

  const activeDashboard = dashboards[activeTab];
  const saveState = saveStates[activeTab] ?? "idle";
  const allSaved = dashboards.length > 0 && dashboards.every((_, i) => saveStates[i] === "saved");

  return (
    <div style={{ background: TOKENS.bg, color: TOKENS.text, fontFamily: "Inter, sans-serif", minHeight: "100%" }}>
      <div style={{
        borderBottom: `1px solid ${TOKENS.border}`,
        background: TOKENS.panel,
        padding: "0 32px",
        display: "flex", alignItems: "center",
        height: 56,
        position: "sticky", top: 0, zIndex: 50,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{
            color: TOKENS.accent, fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10, textTransform: "uppercase", letterSpacing: "0.15em",
            border: `1px solid ${TOKENS.accent}44`, borderRadius: 4, padding: "2px 8px",
          }}>
            UPLOAD
          </span>
          <span style={{ color: TOKENS.text, fontWeight: 700, fontSize: 15 }}>
            Analisis Data Baru
          </span>
        </div>
      </div>

      {/* ── Konten ── */}
      <div style={{ padding: "32px 40px" }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 26, fontWeight: 800, margin: "0 0 6px" }}>
            Upload &amp; pratinjau data
          </h1>
          <p style={{ color: TOKENS.textMuted, fontSize: 13, margin: 0 }}>
            Jatuhkan file CSV atau Excel — server akan memindai struktur kolom secara otomatis.
          </p>
        </div>

        {/* ── Upload area ── */}
        {["idle", "detecting", "error"].includes(status) && (
          <>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              style={{
                background: TOKENS.panel,
                border: `1.5px dashed ${dragOver ? TOKENS.accent : TOKENS.border}`,
                borderRadius: 12, padding: "56px 0",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                cursor: "pointer", position: "relative", overflow: "hidden",
                transition: "border-color 120ms ease",
              }}
            >
              {status === "detecting" && (
                <div style={{
                  position: "absolute", left: 0, right: 0, height: "2px",
                  background: TOKENS.accent, boxShadow: `0 0 12px ${TOKENS.accent}`,
                  animation: "scanline 1.1s ease-in-out infinite",
                }} />
              )}
              <style>{`@keyframes scanline { 0% { top: 0% } 50% { top: 100% } 100% { top: 0% } }`}</style>
              <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: "none" }}
                onChange={(e) => handleFile(e.target.files?.[0])} />
              {status === "detecting" ? (
                <>
                  <FileSpreadsheet size={32} style={{ color: TOKENS.accent }} />
                  <p style={{ color: TOKENS.textMuted, fontSize: 13, marginTop: 14 }}>
                    Membaca sheet dari <span style={{ color: TOKENS.text }}>{fileMeta?.name}</span>…
                  </p>
                </>
              ) : (
                <>
                  <UploadCloud size={32} style={{ color: TOKENS.textMuted }} />
                  <p style={{ fontSize: 14, fontWeight: 500, marginTop: 14, marginBottom: 4 }}>
                    Tarik file ke sini, atau klik untuk memilih
                  </p>
                  <p style={{ color: TOKENS.textMuted, fontSize: 12, margin: 0 }}>
                    Mendukung .csv, .xlsx, .xls — maksimal {MAX_FILE_MB}MB
                  </p>
                </>
              )}
            </div>
            {status === "error" && (
              <div style={{
                background: "#1A0A0A", border: "1px solid #e06c75", color: "#e06c75",
                borderRadius: 8, padding: "12px 16px", fontSize: 13,
                display: "flex", alignItems: "center", gap: 8, marginTop: 12,
              }}>
                <AlertTriangle size={16} /> {error}
              </div>
            )}
          </>
        )}

        {/* ── Sheet selector ── */}
        {status === "sheet_select" && (
          <div>
            <div style={{
              background: TOKENS.panel, border: `1px solid ${TOKENS.border}`,
              borderRadius: 10, padding: "12px 16px",
              display: "flex", alignItems: "center", gap: 10,
            }}>
              <FileSpreadsheet size={18} style={{ color: TOKENS.accent }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{fileMeta?.name}</p>
                <p style={{ color: TOKENS.textMuted, fontSize: 11, margin: 0 }}>
                  {sheets.length} sheet ditemukan
                </p>
              </div>
              <button onClick={reset} style={{
                border: `1px solid ${TOKENS.border}`, color: TOKENS.textMuted,
                background: "transparent", borderRadius: 7, padding: "6px 14px",
                fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
              }}>
                <X size={13} /> Ganti file
              </button>
            </div>

            <SheetSelector sheets={sheets} selected={selectedSheets} onChange={setSelected} />

            <button
              onClick={handleProcess}
              disabled={selectedSheets.length === 0}
              style={{
                marginTop: 16,
                background: selectedSheets.length > 0 ? TOKENS.accent : TOKENS.border,
                color: selectedSheets.length > 0 ? "#000" : TOKENS.textMuted,
                border: "none", borderRadius: 8,
                padding: "10px 24px", fontSize: 13, fontWeight: 700,
                cursor: selectedSheets.length > 0 ? "pointer" : "not-allowed",
                display: "flex", alignItems: "center", gap: 8,
              }}
            >
              Proses {selectedSheets.length} sheet <ChevronRight size={15} />
            </button>
          </div>
        )}

        {/* ── Scanning ── */}
        {status === "scanning" && (
          <div style={{
            background: TOKENS.panel,
            border: `1.5px dashed ${TOKENS.accent}`,
            borderRadius: 12, padding: "56px 0",
            display: "flex", flexDirection: "column", alignItems: "center",
            position: "relative", overflow: "hidden",
          }}>
            <div style={{
              position: "absolute", left: 0, right: 0, height: "2px",
              background: TOKENS.accent, boxShadow: `0 0 12px ${TOKENS.accent}`,
              animation: "scanline 1.1s ease-in-out infinite",
            }} />
            <FileSpreadsheet size={32} style={{ color: TOKENS.accent }} />
            <p style={{ color: TOKENS.textMuted, fontSize: 13, marginTop: 14 }}>
              Memproses {selectedSheets.length > 1 ? `${selectedSheets.length} sheet` : "data"}…
            </p>
          </div>
        )}

        {/* ── Ready: hasil per sheet ── */}
        {status === "ready" && activeDashboard && (
          <div>
            {/* File info bar */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              background: TOKENS.panel, border: `1px solid ${TOKENS.border}`,
              borderRadius: 10, padding: "12px 16px", marginBottom: 16,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <FileSpreadsheet size={18} style={{ color: TOKENS.accent }} />
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{fileMeta?.name}</p>
                  <p style={{ color: TOKENS.textMuted, fontSize: 11, margin: 0 }}>
                    {fileMeta ? `${(fileMeta.size / 1024).toFixed(0)} KB · ` : ""}
                    {dashboards.length} sheet diproses
                  </p>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {/* Save all — hanya muncul kalau lebih dari 1 sheet */}
                {dashboards.length > 1 && !allSaved && (
                  <button onClick={handleSaveAll} style={{
                    border: `1px solid ${TOKENS.accent}`,
                    color: TOKENS.accent, background: TOKENS.accent + "15",
                    borderRadius: 7, padding: "6px 14px", fontSize: 12,
                    cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                  }}>
                    <Save size={13} /> Simpan semua
                  </button>
                )}
                {/* Save current tab */}
                <button
                  onClick={() => handleSave(activeTab)}
                  disabled={saveState === "saving" || saveState === "saved"}
                  style={{
                    border: `1px solid ${saveState === "saved" ? TOKENS.accent : TOKENS.border}`,
                    color: saveState === "saved" ? TOKENS.accent : TOKENS.text,
                    background: saveState === "saved" ? `${TOKENS.accent}15` : "transparent",
                    borderRadius: 7, padding: "6px 14px", fontSize: 12,
                    cursor: saveState === "saving" || saveState === "saved" ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", gap: 6,
                  }}
                >
                  {saveState === "saved" ? <><Check size={13} /> Tersimpan</> :
                   saveState === "saving" ? "Menyimpan…" :
                   <><Save size={13} /> Simpan sheet ini</>}
                </button>
                <button onClick={reset} style={{
                  border: `1px solid ${TOKENS.border}`, color: TOKENS.textMuted,
                  background: "transparent", borderRadius: 7, padding: "6px 14px",
                  fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                }}>
                  <X size={13} /> Ganti file
                </button>
              </div>
            </div>

            {activeDashboard.was_truncated && (
              <div style={{
                background: "#1A1200", border: "1px solid #E8A23D", color: "#E8A23D",
                borderRadius: 8, padding: "10px 14px", fontSize: 12,
                display: "flex", alignItems: "center", gap: 8, marginBottom: 16,
              }}>
                <AlertTriangle size={14} />
                Sheet ini berisi {activeDashboard.original_row_count.toLocaleString("id-ID")} baris.
                Hanya {activeDashboard.total_rows.toLocaleString("id-ID")} baris pertama yang diproses.
              </div>
            )}

            {/* Tab per sheet */}
            <SheetTabs dashboards={dashboards} activeIdx={activeTab} onChange={setActiveTab} />

            <DashboardView dashboard={activeDashboard} />
          </div>
        )}
      </div>
    </div>
  );
}