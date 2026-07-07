import React from "react";
import { NavLink, Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { TOKENS } from "./theme";

export default function AppShell() {
  const { user, loading, logout } = useAuth();

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

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: TOKENS.bg }}>
      <aside style={{
        width: 240, flexShrink: 0,
        background: TOKENS.panel,
        borderRight: `1px solid ${TOKENS.border}`,
        display: "flex", flexDirection: "column",
        position: "sticky", top: 0, height: "100vh",
      }}>
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
          <SidebarLink to="/" end icon="⬆" label="Upload Data" />
          <SidebarLink to="/dashboards" icon="📁" label="Dashboard Saya" />
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
      </aside>

      <main style={{ flex: 1, overflow: "auto", minWidth: 0 }}>
        <Outlet />
      </main>
    </div>
  );
}

function SidebarLink({ to, icon, label, end }) {
  return (
    <NavLink
      to={to}
      end={end}
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
