"""
backend/database/db.py

Setup koneksi PostgreSQL pakai SQLAlchemy.
Mendukung local Docker (port 5434) dan Railway PostgreSQL.
"""

from __future__ import annotations

import os

from dotenv import load_dotenv
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

load_dotenv()

_DEFAULT_URL = "postgresql+psycopg2://postgres:postgres@localhost:5434/dashboard_generator"


def _normalize_database_url(url: str) -> str:
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+psycopg2://", 1)
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+psycopg2://", 1)
    return url


DATABASE_URL = _normalize_database_url(os.getenv("DATABASE_URL", _DEFAULT_URL))

_connect_args: dict = {}
if os.getenv("DATABASE_SSL", "").lower() in ("1", "true", "require"):
    _connect_args["sslmode"] = "require"
elif "railway" in DATABASE_URL.lower():
    _connect_args["sslmode"] = "require"

engine = create_engine(DATABASE_URL, pool_pre_ping=True, connect_args=_connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def _migrate_schema() -> None:
    """Tambah kolom/tabel baru tanpa Alembic (dev-friendly)."""
    insp = inspect(engine)
    tables = insp.get_table_names()

    if "dashboards" in tables:
        cols = {c["name"] for c in insp.get_columns("dashboards")}
        if "user_id" not in cols:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE dashboards ADD COLUMN user_id VARCHAR(12)"))
                conn.execute(text("CREATE INDEX IF NOT EXISTS ix_dashboards_user_id ON dashboards (user_id)"))


def init_db() -> None:
    """Buat semua tabel kalau belum ada. Dipanggil sekali saat startup app."""
    from models import db_models  # noqa: F401

    Base.metadata.create_all(bind=engine)
    _migrate_schema()


def get_db() -> Session:
    """Dependency FastAPI: kasih session DB per-request, auto close setelahnya."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
