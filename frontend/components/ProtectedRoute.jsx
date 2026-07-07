import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { TOKENS } from "../components/theme";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: TOKENS.bg,
        color: TOKENS.textMuted,
        fontFamily: "Inter, sans-serif",
      }}>
        Memuat...
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return children;
}
