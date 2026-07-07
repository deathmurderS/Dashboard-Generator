"""
backend/main.py

Entry point FastAPI. Jalankan dengan:
    uvicorn main:app --reload --port 8000
(dari dalam folder backend/)
"""

import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.auth import router as auth_router
from api.dashboards import router as dashboards_router
from api.upload import router as upload_router
from database.db import init_db

load_dotenv()

_cors_origins = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:3000,http://localhost:5173",
).split(",")

app = FastAPI(
    title="Dashboard Generator",
    description="Backend — upload, analisis otomatis, persistensi dashboard, dan auth.",
    version="0.3.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _cors_origins if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(upload_router)
app.include_router(dashboards_router)


@app.on_event("startup")
def on_startup() -> None:
    init_db()


@app.get("/health")
def health_check():
    return {"status": "ok"}
