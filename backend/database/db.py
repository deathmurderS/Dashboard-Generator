"""
backend/database/db.py

Setup koneksi PostgreSQL pakai SQLAlchemy untuk Phase 2
("Dashboard dapat disimpan dan dibuka kembali").
"""

from __future__ import annotations

import os
import psycopg2

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg2://postgres:postgres@localhost:5432/dashboard_generator",
)

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def init_db() -> None:
    """Buat semua tabel kalau belum ada. Dipanggil sekali saat startup app."""
    from models import db_models  # noqa: F401  -- registrasi model ke Base.metadata

    Base.metadata.create_all(bind=engine)


def get_db() -> Session:
    """Dependency FastAPI: kasih session DB per-request, auto close setelahnya."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()