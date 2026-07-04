"""
backend/main.py

Entry point FastAPI. Jalankan dengan:
    uvicorn main:app --reload --port 8000
(dari dalam folder backend/)
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.dashboards import router as dashboards_router
from api.upload import router as upload_router
from database.db import init_db

app = FastAPI(
    title="Dashboard Generator",
    description="Backend Phase 1+2 — upload, deteksi kolom, KPI, chart otomatis, dan persistensi dashboard.",
    version="0.2.0",
)

# Sesuaikan origin dengan URL dev server frontend (Next.js/Vite default)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload_router)
app.include_router(dashboards_router)

@app.on_event("startup")
def on_startup() -> None:
    init_db()


@app.get("/health")
def health_check():
    return {"status": "ok"}
