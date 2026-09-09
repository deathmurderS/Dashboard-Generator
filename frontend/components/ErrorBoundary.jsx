import React from "react";
import { TOKENS } from "./theme";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "100vh",
          background: TOKENS.bg,
          color: TOKENS.text,
          fontFamily: "Inter, sans-serif",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
        }}>
          <div style={{
            background: TOKENS.panel,
            border: `1px solid ${TOKENS.danger}44`,
            borderRadius: 12,
            padding: "32px 40px",
            maxWidth: 420,
            textAlign: "center",
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: "50%",
              background: `${TOKENS.danger}18`,
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 16px",
              fontSize: 24,
            }}>
              ⚠️
            </div>
            <h2 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 700 }}>
              Terjadi kesalahan
            </h2>
            <p style={{ color: TOKENS.textMuted, fontSize: 13, margin: "0 0 20px", lineHeight: 1.5 }}>
              Maaf, terjadi kesalahan tak terduga. Silakan muat ulang halaman atau coba lagi.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button onClick={this.handleReset} style={{
                background: TOKENS.accent,
                color: "#000",
                border: "none",
                borderRadius: 8,
                padding: "8px 20px",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
              }}>
                Coba lagi
              </button>
              <button onClick={() => window.location.reload()} style={{
                background: "transparent",
                border: `1px solid ${TOKENS.border}`,
                color: TOKENS.textMuted,
                borderRadius: 8,
                padding: "8px 20px",
                fontSize: 13,
                cursor: "pointer",
              }}>
                Muat ulang
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}