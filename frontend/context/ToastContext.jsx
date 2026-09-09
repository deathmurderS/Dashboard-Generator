import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { TOKENS } from "../components/theme";

const ToastContext = createContext(null);

// Ikon per tipe
const ICONS = {
  success: "✅",
  error: "❌",
  warning: "⚠️",
  info: "ℹ️",
};

// Warna per tipe
const COLORS = {
  success: TOKENS.success,
  error: TOKENS.danger,
  warning: TOKENS.warning,
  info: TOKENS.accent,
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef({});

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    if (timersRef.current[id]) {
      clearTimeout(timersRef.current[id]);
      delete timersRef.current[id];
    }
  }, []);

  const show = useCallback((message, type = "info", duration = 4000) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    setToasts((prev) => [...prev, { id, message, type }]);

    if (duration > 0) {
      timersRef.current[id] = setTimeout(() => dismiss(id), duration);
    }

    return id;
  }, [dismiss]);

  const toast = useCallback({
    success: (msg, dur) => show(msg, "success", dur),
    error: (msg, dur) => show(msg, "error", dur),
    warning: (msg, dur) => show(msg, "warning", dur),
    info: (msg, dur) => show(msg, "info", dur),
  }, [show]);

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}

      {/* Toast container */}
      <div style={{
        position: "fixed",
        top: 16,
        right: 16,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        maxWidth: 360,
        pointerEvents: "none",
      }}>
        {toasts.map((t) => {
          const color = COLORS[t.type] ?? TOKENS.accent;
          return (
            <div key={t.id} style={{
              background: TOKENS.panel,
              border: `1px solid ${color}55`,
              borderLeft: `3px solid ${color}`,
              borderRadius: 8,
              padding: "12px 16px",
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
              pointerEvents: "auto",
              animation: "toastIn 0.2s ease-out",
            }}>
              <span style={{ fontSize: 15, flexShrink: 0 }}>{ICONS[t.type] ?? ICONS.info}</span>
              <span style={{
                color: TOKENS.text,
                fontSize: 13,
                lineHeight: 1.4,
                flex: 1,
                wordBreak: "break-word",
              }}>
                {t.message}
              </span>
              <button onClick={() => dismiss(t.id)} style={{
                background: "transparent",
                border: "none",
                color: TOKENS.textMuted,
                cursor: "pointer",
                padding: 2,
                fontSize: 14,
                flexShrink: 0,
                lineHeight: 1,
              }}>
                ✕
              </button>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast harus dipakai di dalam ToastProvider");
  return ctx;
}