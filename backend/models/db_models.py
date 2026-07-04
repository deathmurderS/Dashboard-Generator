"""
backend/models/db_models.py

SQLAlchemy model untuk dashboard yang disimpan (Phase 2).
Disimpan sebagai snapshot: hasil deteksi kolom, KPI, dan chart pada saat
disimpan, supaya buka kembali instan tanpa perlu re-upload/re-proses file.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from database.db import Base


def _new_id() -> str:
    return uuid.uuid4().hex[:12]


class Dashboard(Base):
    __tablename__ = "dashboards"

    id: Mapped[str] = mapped_column(String(12), primary_key=True, default=_new_id)
    dataset_id: Mapped[str] = mapped_column(String(12), index=True)
    filename: Mapped[str] = mapped_column(String(255))
    title: Mapped[str] = mapped_column(String(255), default="Untitled Dashboard")

    total_rows: Mapped[int] = mapped_column(Integer)
    total_columns: Mapped[int] = mapped_column(Integer)

    columns: Mapped[list] = mapped_column(JSON)
    kpis: Mapped[list] = mapped_column(JSON)
    charts: Mapped[list] = mapped_column(JSON)
    preview_rows: Mapped[list] = mapped_column(JSON)
    all_rows: Mapped[list] = mapped_column(JSON, default=list)   # ← tambah

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )