import React, { useState } from "react";
import UploadPreview from "../components/UploadPreview";
import SavedDashboards from "../components/SavedDashboards";

/**
 * UploadPage — pembungkus yang switch antara dua tampilan:
 * - "upload": flow upload & preview dashboard baru (UploadPreview.jsx)
 * - "saved": daftar dashboard tersimpan + detail (SavedDashboards.jsx)
 */
export default function UploadPage() {
  const [view, setView] = useState("upload");

  if (view === "saved") {
    return <SavedDashboards onBack={() => setView("upload")} />;
  }
  return <UploadPreview onViewSaved={() => setView("saved")} />;
}