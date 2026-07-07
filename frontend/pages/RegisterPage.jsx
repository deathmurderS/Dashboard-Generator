import React, { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import { useAuth, ApiError } from "../context/AuthContext";
import { AuthLayout } from "./LoginPage";
import { TOKENS } from "../components/theme";

const inputStyle = {
  width: "100%", boxSizing: "border-box",
  background: TOKENS.panelAlt, border: `1px solid ${TOKENS.border}`,
  borderRadius: 10, padding: "11px 14px", fontSize: 14,
  color: TOKENS.text, outline: "none",
};

export default function RegisterPage() {
  const { user, loading, register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) return <Navigate to="/" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) {
      setError("Password minimal 6 karakter.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await register(email, password, name);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Registrasi gagal.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Buat akun baru"
      subtitle="Mulai analisis data dan buat dashboard interaktif"
    >
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {[
          { label: "Nama", icon: <User size={15} />, value: name, set: setName, type: "text", placeholder: "Nama Anda" },
          { label: "Email", icon: <Mail size={15} />, value: email, set: setEmail, type: "email", placeholder: "nama@email.com" },
        ].map(({ label, icon, value, set, type, placeholder }) => (
          <div key={label}>
            <label style={{
              display: "flex", alignItems: "center", gap: 6,
              fontSize: 12, fontWeight: 600, color: TOKENS.textMuted, marginBottom: 8,
            }}>
              <span style={{ color: TOKENS.accent }}>{icon}</span>
              {label}
            </label>
            <input
              type={type} value={value} onChange={(e) => set(e.target.value)}
              placeholder={placeholder} required={label !== "Nama"}
              style={inputStyle}
            />
          </div>
        ))}

        <div>
          <label style={{
            display: "flex", alignItems: "center", gap: 6,
            fontSize: 12, fontWeight: 600, color: TOKENS.textMuted, marginBottom: 8,
          }}>
            <span style={{ color: TOKENS.accent }}><Lock size={15} /></span>
            Password
          </label>
          <div style={{ position: "relative" }}>
            <input
              type={showPw ? "text" : "password"} required value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimal 6 karakter"
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
        </div>

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
          {submitting ? "Memproses..." : "Daftar"}
        </button>
      </form>

      <p style={{ textAlign: "center", marginTop: 24, fontSize: 13, color: TOKENS.textMuted }}>
        Sudah punya akun?{" "}
        <Link to="/login" style={{ color: TOKENS.accent, textDecoration: "none", fontWeight: 600 }}>
          Masuk
        </Link>
      </p>
    </AuthLayout>
  );
}
