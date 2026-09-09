import React, { useState, useEffect } from "react";
import { NavLink, Navigate, Outlet } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { TOKENS } from "./theme";

export default function AppShell() {
  const { user, loading, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Deteksi mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Tutup sidebar saat pindah halaman di mobile
  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [isMobile]);

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh", background: TOKENS.bg, color: TOKENS.textMuted,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "Inter, sans-serif",
      }}>
        Memuat...
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  const sidebarContent = (
    <>
      <div style={{ padding: "24px 20px 20px", borderBottom: `1px solid ${TOKENS.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: `linear-gradient(135deg, ${TOKENS.accent}, ${TOKENS.accent2})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18,
          }}>
            📊
          </div>
          <div>
            <div style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700, fontSize: 14, color: TOKENS.text,
            }}>
              Dashboard
            </div>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10, color: TOKENS.accent, letterSpacing: "0.08em",
            }}>
              GENERATOR
            </div>
          </div>
        </div>
      </div>

      <nav style={{ padding: "16px 12px", flex: 1 }}>
        <SidebarLink to="/" end icon="⬆" label="Upload Data" onClick={() => setSidebarOpen(false)} />
        <SidebarLink to="/dashboards" icon="📁" label="Dashboard Saya" onClick={() => setSidebarOpen(false)} />
        <SidebarLink to="/settings" icon="⚙️" label="Pengaturan" onClick={() => setSidebarOpen(false)} />
      </nav>

      <div style={{ padding: "16px 16px 20px", borderTop: `1px solid ${TOKENS.border}` }}>
        <div style={{
          background: TOKENS.panelAlt, borderRadius: 10, padding: "12px 14px",
          border: `1px solid ${TOKENS.border}`,
        }}>
          <div style={{ fontSize: 12, color: TOKENS.text, fontWeight: 600, marginBottom: 2 }}>
            {user.name || user.email.split("@")[0]}
          </div>
          <div style={{
            fontSize: 11, color: TOKENS.textMuted, marginBottom: 10,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {user.email}
          </div>
          <button onClick={logout} style={{
            width: "100%", padding: "7px 0", borderRadius: 7,
            border: `1px solid ${TOKENS.border}`, background: "transparent",
            color: TOKENS.textMuted, fontSize: 12, cursor: "pointer",
          }}>
            Keluar
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: TOKENS.bg }}>
      {/* Sidebar desktop */}
      {!isMobile && (
        <aside style={{
          width: 240, flexShrink: 0,
          background: TOKENS.panel,
          borderRight: `1px solid ${TOKENS.border}`,
          display: "flex", flexDirection: "column",
          position: "sticky", top: 0, height: "100vh",
        }}>
          {sidebarContent}
        </aside>
      )}

      {/* Sidebar mobile overlay */}
      {isMobile && sidebarOpen && (
        <>
          <div onClick={() => setSidebarOpen(false)} style={{
            position: "fixed", inset: 0, zIndex: 90,
            background: "rgba(0,0,0,0.6)",
          }} />
          <aside style={{
            position: "fixed", left: 0, top: 0, bottom: 0, zIndex: 100,
            width: 260, flexShrink: 0,
            background: TOKENS.panel,
            borderRight: `1px solid ${TOKENS.border}`,
            display: "flex", flexDirection: "column",
            boxShadow: "4px 0 24px rgba(0,0,0,0.4)",
            animation: "slideIn 0.2s ease-out",
          }}>
            <button onClick={() => setSidebarOpen(false)} style={{
              position: "absolute", top: 12, right: 12,
              background: "transparent", border: "none",
              color: TOKENS.textMuted, cursor: "pointer", padding: 6,
            }}>
              <X size={18} />
            </button>
            {sidebarContent}
          </aside>
          <style>{`
            @keyframes slideIn {
              from { transform: translateX(-100%); }
              to { transform: translateX(0); }
            }
          `}</style>
        </>
      )}

      <main style={{ flex: 1, overflow: "auto", minWidth: 0 }}>
        {/* Mobile top bar */}
        {isMobile && (
          <div style={{
            position: "sticky", top: 0, zIndex: 50,
            background: TOKENS.panel,
            borderBottom: `1px solid ${TOKENS.border}`,
            padding: "0 16px",
            display: "flex", alignItems: "center",
            height: 52,
          }}>
            <button onClick={() => setSidebarOpen(true)} style={{
              background: "transparent", border: "none",
              color: TOKENS.text, cursor: "pointer", padding: 6,
              display: "flex", alignItems: "center",
            }}>
              <Menu size={20} />
            </button>
            <span style={{
              marginLeft: 8,
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700, fontSize: 14, color: TOKENS.text,
            }}>
              📊 Dashboard Generator
            </span>
          </div>
        )}
        <Outlet />
      </main>
    </div>
  );
}

function SidebarLink({ to, icon, label, end, onClick }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      style={({ isActive }) => ({
        display: "flex", alignItems: "center", gap: 10,
        padding: "10px 12px", borderRadius: 8, marginBottom: 4,
        textDecoration: "none",
        background: isActive ? TOKENS.accent + "18" : "transparent",
        border: `1px solid ${isActive ? TOKENS.accent + "44" : "transparent"}`,
        color: isActive ? TOKENS.accent : TOKENS.textMuted,
        fontSize: 13, fontWeight: isActive ? 600 : 400,
      })}
    >
      <span style={{ fontSize: 15 }}>{icon}</span>
      {label}
    </NavLink>
  );
}