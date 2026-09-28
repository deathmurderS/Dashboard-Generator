"""
Visora - Vercel Serverless Function entrypoint (FastAPI)
Path: /api/index.py
"""

from __future__ import annotations

import os
import sys

# Ensure api directory modules can be imported
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import profiler, recommender

app = FastAPI(
    title="Visora Serverless API",
    version="1.0.0",
    description="Data profiling and chart recommendation service for Visora.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Support routes with and without /api prefix
app.include_router(profiler.router)
app.include_router(recommender.router)
app.include_router(profiler.router, prefix="/api")
app.include_router(recommender.router, prefix="/api")


@app.get("/health")
@app.get("/api/health")
async def health() -> dict:
    return {"status": "ok", "version": "1.0.0"}
