# Backend — Phase 1 (MVP Auto Dashboard)

## Setup
```bash
cd backend
python3 -m venv venv && source venv/bin/activate   # opsional
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Cek: `http://localhost:8000/health` -> `{"status": "ok"}`

## Endpoint

### `POST /api/upload`
Form-data, field `file` = CSV/XLSX/XLS (maks 25MB, maks 50.000 baris).

Response:
```json
{
  "dataset_id": "70579c93062d",
  "filename": "sales.csv",
  "total_rows": 8,
  "total_columns": 4,
  "columns": [{"name": "tanggal", "type": "Date"}, ...],
  "preview_rows": [...],
  "kpis": [{"id": "revenue_total", "label": "Total revenue", "value": 11360000, "type": "total"}, ...],
  "charts": [{"id": "line_tanggal_revenue", "type": "line", "title": "...", "data": [...]}, ...],
  "processing_time_ms": 4.2
}
```

Sudah dites end-to-end (request HTTP asli, bukan cuma logika di kode):
deteksi kolom, KPI, dan chart semua konsisten dengan data input.

## Struktur

| File | Tanggung jawab |
|---|---|
| `analyzer/detector.py` | Deteksi tipe kolom (Date/Numeric/Category) pakai pandas, dengan threshold toleransi 90% agar tahan data kotor |
| `analyzer/kpi.py` | Generate KPI cards (Total, Average, Count) dari kolom numerik |
| `analyzer/charts.py` | Generate minimal 3 chart (line/bar/pie) otomatis berdasar kombinasi tipe kolom |
| `services/file_service.py` | Validasi file & parsing CSV/XLSX ke DataFrame |
| `services/dashboard_service.py` | Orkestrasi detector -> kpi -> charts jadi satu payload |
| `api/upload.py` | Route `POST /api/upload` |
| `models/schemas.py` | Kontrak response (Pydantic) |
| `database/db.py` | Placeholder, baru dipakai Phase 2 untuk simpan/buka dashboard |

## Yang belum (sengaja, sesuai phase)
- Belum ada persistensi dashboard (Phase 2: "Dashboard dapat disimpan dan dibuka kembali")
- Belum ada insight otomatis (Phase 3 -> `analyzer/insights.py`)
- Belum ada AI chat (Phase 4 -> `ai/qwen.py`)
- Validasi tambahan untuk dataset >50.000 baris masih hard-reject; Phase 1 requirement-nya cuma proses <10 detik untuk 50.000 baris, belum sempat di-benchmark dengan dataset sebesar itu — perlu load test terpisah.

## Sambungan ke frontend
`frontend/components/UploadPreview.jsx` saat ini parsing di browser. Untuk
pindah ke backend: ganti `parseCSV`/`parseXLSX`/`detectColumns` dengan:
```js
const formData = new FormData();
formData.append("file", file);
const res = await fetch("http://localhost:8000/api/upload", { method: "POST", body: formData });
const data = await res.json();
```
