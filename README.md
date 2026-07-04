# Dashboard Generator 🧪📊

**Dashboard Generator** adalah aplikasi full-stack untuk mengunggah file data (CSV/XLSX), menganalisis secara otomatis, dan menghasilkan dashboard visual interaktif dengan berbagai jenis chart serta ringkasan KPI.

Dibangun dengan tema **lab scanner** — dark theme, scan-line animation, dan badge warna per tipe kolom — memberikan nuansa seperti instrumen laboratorium yang "membaca" data Anda.

---

## ✨ Fitur Utama

### 📂 Upload & Preview
- Drag & drop upload file CSV dan XLSX
- Parsing client-side dengan **PapaParse** (CSV) dan **SheetJS** (XLSX)
- Deteksi tipe kolom otomatis (Date / Numeric / Category)
- Preview tabel hingga 50 baris pertama
- Ringkasan KPI: total baris, total kolom, jumlah tipe terdeteksi
- Tema lab scanner: panel gelap, scan-line animation, badge warna

### 📈 Analisis Otomatis
- **Deteksi tipe kolom** backend dengan `analyzer/detector.py`
- **KPI generation** — statistik deskriptif, agregasi otomatis
- **Chart recommendation** — rekomendasi chart berdasarkan tipe data
- **Data quality check** — deteksi missing values, outliers, anomali

### 📊 Dashboard Interaktif
- **ChartGrid** — grid chart dinamis (bar, line, pie, scatter, area, heatmap)
- **KPI Cards** — ringkasan metrik penting
- **Dashboard Editor** — edit, hapus, atur ulang chart
- **Dashboard View** — tampilan full dashboard yang bisa di-share
- **Saved Dashboards** — simpan dan kelola banyak dashboard

### 🎨 Tema
- Dark theme dengan aksen scan-line
- Color-coded badges (ungu=Date, teal=Numeric, amber=Category)
- Responsive layout

---

## 🏗️ Arsitektur Proyek

```
Dashboard_Generator_2/
├── backend/                        # FastAPI Backend
│   ├── main.py                     # Entry point FastAPI
│   ├── requirements.txt            # Python dependencies
│   ├── docker-compose.yml          # Docker setup
│   ├── .env                        # Environment variables
│   ├── analyzer/                   # Data analysis engine
│   │   ├── detector.py             # Column type detection
│   │   ├── charts.py               # Chart generation logic
│   │   ├── kpi.py                  # KPI computation
│   │   └── quality.py              # Data quality checks
│   ├── api/                        # REST API endpoints
│   │   ├── upload.py               # File upload endpoint
│   │   └── dashboards.py           # Dashboard CRUD
│   ├── database/                   # Database layer
│   │   └── db.py                   # SQLAlchemy connection
│   ├── models/                     # Data models
│   │   ├── schemas.py              # Pydantic schemas
│   │   └── db_models.py            # SQLAlchemy models
│   └── services/                   # Business logic
│       ├── file_service.py         # File handling
│       └── dashboard_service.py    # Dashboard management
│
├── frontend/                       # React Frontend (Vite)
│   ├── main.jsx                    # Entry point
│   ├── index.html                  # HTML template
│   ├── vite.config.js              # Vite configuration
│   ├── tailwind.config.js          # Tailwind CSS config
│   ├── postcss.config.js           # PostCSS config
│   ├── package.json                # Node dependencies
│   ├── charts/
│   │   └── ChartGrid.jsx           # Chart grid component
│   ├── components/
│   │   ├── DashboardEditor.jsx     # Dashboard editor
│   │   ├── DashboardView.jsx       # Dashboard viewer
│   │   ├── SavedDashboards.jsx     # Dashboard list/save
│   │   ├── UploadPreview.jsx       # File upload & preview
│   │   └── theme.js                # Theme configuration
│   ├── pages/
│   │   └── UploadPage.jsx          # Upload page wrapper
│   └── services/
│       └── api.js                  # API client
│
├── test_dashboard.py               # Backend test script
└── README.md                       # This file
```

---

## 🚀 Cara Menjalankan

### Backend (FastAPI)

```bash
cd backend

# Buat virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# atau
venv\Scripts\activate     # Windows

# Install dependencies
pip install -r requirements.txt

# Jalankan server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend (React + Vite)

```bash
cd frontend

# Install dependencies
npm install

# Jalankan dev server
npm run dev
```

### Atau dengan Docker

```bash
cd backend
docker-compose up --build
```

---

## 🛠️ Tech Stack

### Backend
- **FastAPI** — REST API framework
- **SQLAlchemy** — ORM database
- **Pandas / NumPy** — Data processing & analysis
- **Python-multipart** — File upload handling
- **ReportLab / WeasyPrint** — PDF generation (opsional)

### Frontend
- **React 18** + **Vite** — Frontend framework
- **Tailwind CSS** — Utility-first styling
- **PapaParse** — CSV parsing (client-side)
- **SheetJS (xlsx)** — Excel parsing (client-side)
- **Recharts** — Chart rendering
- **Lucide React** — Icon library

---

## 📡 API Endpoints

| Method | Endpoint            | Deskripsi                      |
|--------|---------------------|--------------------------------|
| POST   | `/api/upload`       | Upload file CSV/XLSX           |
| GET    | `/api/upload/{id}`  | Get file info by ID            |
| POST   | `/api/dashboards`   | Create new dashboard           |
| GET    | `/api/dashboards`   | List all dashboards            |
| GET    | `/api/dashboards/{id}` | Get dashboard detail        |
| PUT    | `/api/dashboards/{id}` | Update dashboard            |
| DELETE | `/api/dashboards/{id}` | Delete dashboard            |

---

## 👨‍💻 Developer

Dibangun oleh **deathmurderS** — Dashboard Generator untuk otomatisasi analisis data dan pembuatan dashboard interaktif.