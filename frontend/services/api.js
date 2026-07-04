// frontend/services/api.js
// Helper terpusat buat semua panggilan ke backend FastAPI.

export const API_BASE_URL = import.meta?.env?.VITE_API_BASE_URL || "http://localhost:8000";

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

// ─── helper internal ────────────────────────────────────────────────────────
async function handleResponse(res) {
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(data?.detail || "Terjadi kesalahan.", res.status);
  }
  return data;
}

// ─── Upload (lama — single sheet, backward compat) ──────────────────────────
/**
 * @deprecated Pakai detectSheets + uploadSheets untuk multi-sheet support.
 * Masih dipakai kalau ada kode lain yang belum dimigrasikan.
 */
export async function uploadDataset(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("sheets", "");   // kosong = semua sheet (biasanya 1)

  let res;
  try {
    res = await fetch(`${API_BASE_URL}/api/upload`, {
      method: "POST",
      body: formData,
    });
  } catch {
    throw new ApiError(
      "Tidak bisa terhubung ke server. Pastikan backend berjalan di " + API_BASE_URL,
      0
    );
  }

  const data = await handleResponse(res);
  // Backend sekarang return list — ambil item pertama supaya backward compat
  return Array.isArray(data) ? data[0] : data;
}

// ─── Detect sheets ──────────────────────────────────────────────────────────
/**
 * Kirim file ke backend, dapatkan daftar nama sheet.
 * CSV selalu return ["Sheet1"].
 *
 * @returns {{ dataset_id, filename, ext, sheets: string[], is_multi_sheet: boolean }}
 */
export async function detectSheets(file) {
  const formData = new FormData();
  formData.append("file", file);

  let res;
  try {
    res = await fetch(`${API_BASE_URL}/api/detect-sheets`, {
      method: "POST",
      body: formData,
    });
  } catch {
    throw new ApiError(
      "Tidak bisa terhubung ke server. Pastikan backend berjalan di " + API_BASE_URL,
      0
    );
  }

  return handleResponse(res);
}

// ─── Upload multi-sheet ─────────────────────────────────────────────────────
/**
 * Proses satu atau lebih sheet dari file yang sama.
 *
 * @param {File}     file        - File asli (harus dikirim ulang)
 * @param {string[]} sheetNames  - Sheet yang mau diproses, e.g. ["Sheet1", "Data"]
 * @returns {UploadResponse[]}   - Satu item per sheet
 */
export async function uploadSheets(file, sheetNames) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("sheets", sheetNames.join(","));

  let res;
  try {
    res = await fetch(`${API_BASE_URL}/api/upload`, {
      method: "POST",
      body: formData,
    });
  } catch {
    throw new ApiError(
      "Tidak bisa terhubung ke server. Pastikan backend berjalan di " + API_BASE_URL,
      0
    );
  }

  return handleResponse(res); // list[UploadResponse]
}

// ─── Dashboard CRUD ─────────────────────────────────────────────────────────
/**
 * Simpan snapshot dashboard (Phase 2).
 */
export async function saveDashboard(dashboard, title) {
  const body = {
    dataset_id: dashboard.dataset_id,
    filename: dashboard.filename,
    title: title || dashboard.filename,
    total_rows: dashboard.total_rows,
    total_columns: dashboard.total_columns,
    columns: dashboard.columns,
    preview_rows: dashboard.preview_rows,
    all_rows: dashboard.all_rows,
    kpis: dashboard.kpis,
    charts: dashboard.charts,
  };

  const res = await fetch(`${API_BASE_URL}/api/dashboards`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return handleResponse(res);
}

export async function listDashboards() {
  const res = await fetch(`${API_BASE_URL}/api/dashboards`);
  return handleResponse(res);
}

export async function getDashboard(id) {
  const res = await fetch(`${API_BASE_URL}/api/dashboards/${id}`);
  return handleResponse(res);
}

export async function deleteDashboard(id) {
  const res = await fetch(`${API_BASE_URL}/api/dashboards/${id}`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) {
    const data = await res.json().catch(() => null);
    throw new ApiError(data?.detail || "Gagal menghapus dashboard.", res.status);
  }
}