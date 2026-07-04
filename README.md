# Frontend — Upload & Preview (Phase 1)

## Apa yang sudah jadi
- `components/UploadPreview.jsx` — drag & drop upload CSV/XLSX, parsing di sisi browser
  (papaparse untuk CSV, SheetJS/xlsx untuk Excel), deteksi tipe kolom (Date / Numeric /
  Category), preview tabel hingga 50 baris pertama, dan KPI ringkas (total baris, total
  kolom, jumlah tipe terdeteksi).
- `pages/UploadPage.jsx` — pembungkus halaman, tinggal di-route sesuai router yang dipakai
  (Next.js app router, React Router, dll).

## Dependencies
```
npm install papaparse xlsx lucide-react
```

## Yang masih perlu disambungkan ke backend
- Saat ini deteksi tipe kolom & parsing dilakukan 100% di browser (client-side), supaya UI
  preview-nya bisa langsung jalan tanpa backend dulu. Begitu `backend/analyzer/detector.py`
  siap, ganti logika `parseCSV`/`parseXLSX`/`detectColumns` dengan call API:
  `POST /api/upload` -> kirim file -> backend balikin `{ headers, rows, columns }`.
- Validasi ukuran file (saat ini hard limit 25MB di frontend) sebaiknya juga divalidasi
  ulang di backend.
- Field "Generate minimal 3 jenis chart otomatis" dan "Generate KPI Cards" dari KPI doc
  belum masuk di sini — itu nyambung ke `frontend/charts/` setelah backend `charts.py`
  dan `kpi.py` mengembalikan data agregat.

## Catatan desain
Tema "lab scanner": panel gelap, garis pemindai (scan-line) saat file sedang dianalisis,
dan badge warna per tipe kolom (ungu = date, teal = numeric, amber = category) supaya
deteksi tipe kolom terasa seperti instrumen yang benar-benar "membaca" data, bukan cuma
tabel statis.
