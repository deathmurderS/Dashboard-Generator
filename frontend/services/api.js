// frontend/services/api.js
// Helper terpusat buat semua panggilan ke backend FastAPI.

export const API_BASE_URL = import.meta?.env?.VITE_API_BASE_URL || "http://localhost:8000";
const TOKEN_KEY = "dg_token";

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

function authHeaders(extra = {}) {
  const headers = { ...extra };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function handleResponse(res) {
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const detail = data?.detail;
    const message =
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? detail.map((d) => d.msg).join(", ")
          : "Terjadi kesalahan.";
    throw new ApiError(message, res.status);
  }
  return data;
}

async function apiFetch(path, options = {}) {
  let res;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: authHeaders(options.headers || {}),
    });
  } catch {
    throw new ApiError(
      "Tidak bisa terhubung ke server. Pastikan backend berjalan di " + API_BASE_URL,
      0
    );
  }
  return handleResponse(res);
}

// ─── Auth ───────────────────────────────────────────────────────────────────

export async function register({ email, password, name }) {
  return apiFetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name }),
  });
}

export async function login({ email, password }) {
  const data = await apiFetch("/api/auth/login/json", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  setToken(data.access_token);
  return data;
}

export async function fetchMe() {
  return apiFetch("/api/auth/me");
}

export function logout() {
  setToken(null);
}

// ─── Upload ─────────────────────────────────────────────────────────────────

export async function detectSheets(file) {
  const formData = new FormData();
  formData.append("file", file);
  return apiFetch("/api/detect-sheets", { method: "POST", body: formData });
}

export async function uploadSheets({ file, sheetNames, datasetId, filename }) {
  const formData = new FormData();
  formData.append("sheets", sheetNames.join(","));
  if (datasetId) {
    formData.append("dataset_id", datasetId);
    formData.append("filename", filename || file?.name || "");
  } else if (file) {
    formData.append("file", file);
  }
  return apiFetch("/api/upload", { method: "POST", body: formData });
}

/** @deprecated Pakai detectSheets + uploadSheets */
export async function uploadDataset(file) {
  const data = await uploadSheets({ file, sheetNames: [] });
  return Array.isArray(data) ? data[0] : data;
}

// ─── Dashboard CRUD ─────────────────────────────────────────────────────────

export async function saveDashboard(dashboard, title) {
  return apiFetch("/api/dashboards", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
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
    }),
  });
}

export async function listDashboards() {
  return apiFetch("/api/dashboards");
}

export async function getDashboard(id) {
  return apiFetch(`/api/dashboards/${id}`);
}

export async function deleteDashboard(id) {
  const res = await fetch(`${API_BASE_URL}/api/dashboards/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok && res.status !== 204) {
    const data = await res.json().catch(() => null);
    throw new ApiError(data?.detail || "Gagal menghapus dashboard.", res.status);
  }
}

export async function reorderCharts(dashboardId, charts) {
  return apiFetch(`/api/dashboards/${dashboardId}/charts-reorder`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ charts }),
  });
}

export async function updateKpis(dashboardId, kpis) {
  return apiFetch(`/api/dashboards/${dashboardId}/kpis`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kpis }),
  });
}

export async function addChart(dashboardId, chart) {
  return apiFetch(`/api/dashboards/${dashboardId}/charts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(chart),
  });
}

export async function deleteChart(dashboardId, chartId) {
  const res = await fetch(`${API_BASE_URL}/api/dashboards/${dashboardId}/charts/${chartId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok && res.status !== 204) {
    const data = await res.json().catch(() => null);
    throw new ApiError(data?.detail || "Gagal menghapus chart.", res.status);
  }
}

export async function updateChart(dashboardId, chartId, payload) {
  return apiFetch(`/api/dashboards/${dashboardId}/charts/${chartId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
