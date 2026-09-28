"""
Visora backend — main.py

FastAPI service for the Visora analytics platform. Run from inside the
backend folder with:

    uvicorn main:app --reload --port 8000

Endpoints:
    GET  /health                 — service heartbeat
    POST /profiler/analyze       — file upload → column statistics
    POST /recommender/suggest    — schema → chart recommendations
"""

from __future__ import annotations

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import profiler, recommender

app = FastAPI(
    title="Visora Profiler Service",
    version="1.0.0",
    description="Data profiling and chart recommendation service for Visora dashboards.",
)

_origins = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _origins if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(profiler.router)
app.include_router(recommender.router)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "version": "1.0.0"}