import React, { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { BarChart3, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useAuth, ApiError } from "../context/AuthContext";
import { TOKENS } from "../components/theme";

export default function LoginPage() {
  const { user, loading, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) return <Navigate to="/" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login gagal.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Selamat datang kembali"
      subtitle="Masuk untuk mengakses dashboard analisis data Anda"
    >
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Field label="Email" icon={<Mail size={15} />}>
          <input
            type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="nama@email.com"
            style={inputStyle}
          />
        </Field>

        <Field label="Password" icon={<Lock size={15} />}>
          <div style={{ position: "relative" }}>
            <input
              type={showPw ? "text" : "password"} required value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{ ...inputStyle, paddingRight: 40 }}
            />
            <button type="button" onClick={() => setShowPw((v) => !v)} style={{
              position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
              background: "none", border: "none", color: TOKENS.textMuted, cursor: "pointer",
              display: "flex", padding: 4,
            }}>
              {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </Field>

        {error && (
          <div style={{
            background: TOKENS.danger + "18", border: `1px solid ${TOKENS.danger}44`,
            borderRadius: 8, padding: "10px 14px", fontSize: 13, color: TOKENS.danger,
          }}>
            {error}
          </div>
        )}

        <button type="submit" disabled={submitting} style={{
          marginTop: 4, padding: "12px 0", borderRadius: 10, border: "none",
          background: `linear-gradient(135deg, ${TOKENS.accent}, ${TOKENS.accent2})`,
          color: "#050D18", fontWeight: 700, fontSize: 14, cursor: submitting ? "wait" : "pointer",
          opacity: submitting ? 0.7 : 1,
          boxShadow: `0 4px 24px ${TOKENS.accent}44`,
        }}>
          {submitting ? "Memproses..." : "Masuk"}
        </button>
      </form>

      <p style={{ textAlign: "center", marginTop: 24, fontSize: 13, color: TOKENS.textMuted }}>
        Belum punya akun?{" "}
        <Link to="/register" style={{ color: TOKENS.accent, textDecoration: "none", fontWeight: 600 }}>
          Daftar sekarang
        </Link>
      </p>
    </AuthLayout>
  );
}

export function AuthLayout({ title, subtitle, children }) {
  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: TOKENS.bg, fontFamily: "Inter, sans-serif", position: "relative", overflow: "hidden",
    }}>
      {/* Background effects */}
      <div className="auth-grid" />
      <div style={{
        position: "absolute", width: 600, height: 600, borderRadius: "50%",
        background: `radial-gradient(circle, ${TOKENS.accent}18 0%, transparent 70%)`,
        top: "-10%", right: "-10%", pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", width: 500, height: 500, borderRadius: "50%",
        background: `radial-gradient(circle, ${TOKENS.accent2}12 0%, transparent 70%)`,
        bottom: "-15%", left: "-10%", pointerEvents: "none",
      }} />

      <div style={{
        position: "relative", width: "100%", maxWidth: 420, margin: "24px 16px",
        background: TOKENS.panel + "ee",
        backdropFilter: "blur(20px)",
        border: `1px solid ${TOKENS.border}`,
        borderRadius: 20, padding: "40px 36px",
        boxShadow: `0 24px 80px #00000066, 0 0 0 1px ${TOKENS.accent}11`,
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14, margin: "0 auto 16px",
            background: `linear-gradient(135deg, ${TOKENS.accent}, ${TOKENS.accent2})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 8px 32px ${TOKENS.accent}55`,
          }}>
            <BarChart3 size={26} color="#050D18" />
          </div>
          <h1 style={{
            margin: 0, fontSize: 22, fontWeight: 700, color: TOKENS.text,
            fontFamily: "'Space Grotesk', sans-serif",
          }}>
            {title}
          </h1>
          <p style={{ margin: "8px 0 0", fontSize: 13, color: TOKENS.textMuted, lineHeight: 1.5 }}>
            {subtitle}
          </p>
        </div>

        {children}
      </div>
    </div>
  );
}

function Field({ label, icon, children }) {
  return (
    <div>
      <label style={{
        display: "flex", alignItems: "center", gap: 6,
        fontSize: 12, fontWeight: 600, color: TOKENS.textMuted, marginBottom: 8,
      }}>
        <span style={{ color: TOKENS.accent }}>{icon}</span>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle = {
  width: "100%", boxSizing: "border-box",
  background: TOKENS.panelAlt, border: `1px solid ${TOKENS.border}`,
  borderRadius: 10, padding: "11px 14px", fontSize: 14,
  color: TOKENS.text, outline: "none",
};
