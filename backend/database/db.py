"""
backend/database/db.py

Setup koneksi PostgreSQL pakai SQLAlchemy.
Mendukung:
  - Supabase (via DATABASE_URL) — production
  - Docker PostgreSQL lokal (port 5434) — development fallback
  - Railway PostgreSQL

Auto-fallback: kalau Supabase tidak reachable (misal IPv6), pakai Docker lokal.
"""

from __future__ import annotations

import os
import socket

from dotenv import load_dotenv
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

load_dotenv()

_DEFAULT_URL = "postgresql+psycopg2://postgres:postgres@localhost:5434/dashboard_generator"
_LOCAL_URL = "postgresql+psycopg2://postgres:postgres@localhost:5434/dashboard_generator"
_SQLITE_URL = "sqlite:///./dashboard_generator.db"


def _normalize_database_url(url: str) -> str:
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+psycopg2://", 1)
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+psycopg2://", 1)
    return url


def _check_host_reachable(host: str, port: int = 5432, timeout: int = 3) -> bool:
    """Cek apakah host:port reachable (support IPv4 & IPv6)."""
    for family in (socket.AF_INET6, socket.AF_INET):
        try:
            addrs = socket.getaddrinfo(host, port, family, socket.SOCK_STREAM)
            for addr in addrs:
                sock = socket.socket(family, socket.SOCK_STREAM)
                sock.settimeout(timeout)
                try:
                    sock.connect(addr[4])
                    sock.close()
                    return True
                except (socket.timeout, OSError):
                    continue
                finally:
                    sock.close()
        except socket.gaierror:
            continue
    return False


def _resolve_database_url() -> tuple[str, dict]:
    """
    Tentukan DATABASE_URL yang akan dipakai.
    Prioritas:
      1. DATABASE_URL dari .env (biasanya Supabase)
      2. Kalau host-nya unreachable → fallback ke Docker lokal
      3. Kalau Docker lokal juga unreachable → fallback ke SQLite (dev)
    """
    primary_url = _normalize_database_url(os.getenv("DATABASE_URL", _DEFAULT_URL))
    local_url = _LOCAL_URL

    # Parse host dari URL
    from urllib.parse import urlparse
    parsed = urlparse(primary_url.replace("+psycopg2", ""))
    host = parsed.hostname or "localhost"
    port = parsed.port or 5432

    # Cek reachability primary
    if _check_host_reachable(host, port):
        print(f"[DB] Using primary: {host}:{port}")
        return primary_url, {}

    # Cek reachability Docker lokal (port 5434)
    if _check_host_reachable("localhost", 5434):
        print(f"[DB] {host}:{port} unreachable — falling back to localhost:5434")
        return local_url, {}

    # Fallback ke SQLite (development)
    print(f"[DB] PostgreSQL unreachable — falling back to SQLite (development)")
    return _SQLITE_URL, {"check_same_thread": False}


# ─── Resolve URL ─────────────────────────────────────────────────────────────
DATABASE_URL, _connect_args = _resolve_database_url()

# SSL config untuk Supabase / Railway
if os.getenv("DATABASE_SSL", "").lower() in ("1", "true", "require"):
    _connect_args["sslmode"] = "require"
elif "railway" in DATABASE_URL.lower():
    _connect_args["sslmode"] = "require"
elif "supabase" in DATABASE_URL.lower():
    _connect_args["sslmode"] = "require"

engine = create_engine(DATABASE_URL, pool_pre_ping=True, connect_args=_connect_args or {})
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
                # SQLite tidak support ALTER TABLE ADD COLUMN dengan tipe sama
                # seperti PostgreSQL, tapi VARCHAR(12) didukung.
                conn.execute(text("ALTER TABLE dashboards ADD COLUMN user_id VARCHAR(12)"))
                try:
                    conn.execute(text("CREATE INDEX IF NOT EXISTS ix_dashboards_user_id ON dashboards (user_id)"))
                except Exception:
                    # SQLite sudah buat index otomatis, atau index sudah ada
                    pass


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