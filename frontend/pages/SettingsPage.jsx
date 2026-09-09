import React, { useState } from "react";
import { User, Mail, Lock, Save, ArrowLeft } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { updateMe } from "../services/api";
import { TOKENS } from "../components/theme";

export default function SettingsPage() {
  const { user, login } = useAuth();
  const { toast } = useToast();

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {};
      if (name !== (user?.name ?? "")) payload.name = name;
      if (email !== user?.email) payload.email = email;
      if (currentPassword) {
        if (newPassword !== confirmPassword) {
          toast.error("Password baru dan konfirmasi tidak cocok.");
          setSaving(false);
          return;
        }
        payload.current_password = currentPassword;
        payload.new_password = newPassword;
      }
      if (Object.keys(payload).length === 0) {
        toast.info("Tidak ada perubahan.");
        setSaving(false);
        return;
      }
      await updateMe(payload);
      // Refresh user data
      await login(email, currentPassword || "dummy");
      toast.success("Profil berhasil diperbarui.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(err.message || "Gagal memperbarui profil.");
    } finally {
      setSaving(false);
    }
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
        <span style={{
          color: TOKENS.accent, fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10, textTransform: "uppercase", letterSpacing: "0.15em",
          border: `1px solid ${TOKENS.accent}44`, borderRadius: 4, padding: "2px 8px",
        }}>
          SETTINGS
        </span>
        <span style={{ color: TOKENS.text, fontWeight: 700, fontSize: 15 }}>
          Pengaturan Profil
        </span>
      </div>

      <div style={{ padding: "32px 40px", maxWidth: 600 }}>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 24, fontWeight: 800, margin: "0 0 6px" }}>
          Pengaturan Profil
        </h1>
        <p style={{ color: TOKENS.textMuted, fontSize: 13, margin: "0 0 24px" }}>
          Kelola informasi akun dan password Anda.
        </p>

        <form onSubmit={handleSaveProfile} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Profil */}
          <div style={{
            background: TOKENS.panel, border: `1px solid ${TOKENS.border}`,
            borderRadius: 12, padding: 20,
          }}>
            <p style={{ color: TOKENS.accent, fontWeight: 700, fontSize: 13, margin: "0 0 16px" }}>
              Informasi Profil
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={labelStyle}>
                  <User size={13} /> Nama
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nama Anda"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>
                  <Mail size={13} /> Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          {/* Password */}
          <div style={{
            background: TOKENS.panel, border: `1px solid ${TOKENS.border}`,
            borderRadius: 12, padding: 20,
          }}>
            <p style={{ color: TOKENS.accent, fontWeight: 700, fontSize: 13, margin: "0 0 16px" }}>
              Ganti Password
            </p>
            <p style={{ color: TOKENS.textMuted, fontSize: 11, margin: "0 0 12px" }}>
              Kosongkan jika tidak ingin mengganti password.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={labelStyle}>
                  <Lock size={13} /> Password saat ini
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>
                  <Lock size={13} /> Password baru
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimal 8 karakter, huruf & angka"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>
                  <Lock size={13} /> Konfirmasi password baru
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi password baru"
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          <button type="submit" disabled={saving} style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            background: TOKENS.accent, color: "#000",
            border: "none", borderRadius: 8,
            padding: "12px 0", fontSize: 14, fontWeight: 700,
            cursor: saving ? "wait" : "pointer",
            opacity: saving ? 0.7 : 1,
          }}>
            <Save size={15} />
            {saving ? "Menyimpan…" : "Simpan Perubahan"}
          </button>
        </form>
      </div>
    </div>
  );
}

const labelStyle = {
  display: "flex", alignItems: "center", gap: 6,
  fontSize: 12, fontWeight: 600, color: TOKENS.textMuted, marginBottom: 8,
};

const inputStyle = {
  width: "100%", boxSizing: "border-box",
  background: TOKENS.panelAlt, border: `1px solid ${TOKENS.border}`,
  borderRadius: 8, padding: "10px 14px", fontSize: 13,
  color: TOKENS.text, outline: "none",
};