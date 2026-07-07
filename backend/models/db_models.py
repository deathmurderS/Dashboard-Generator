"""
backend/models/db_models.py

SQLAlchemy model untuk user dan dashboard yang disimpan (Phase 2+).
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.db import Base


def _new_id() -> str:
    return uuid.uuid4().hex[:12]


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(12), primary_key=True, default=_new_id)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    dashboards: Mapped[list["Dashboard"]] = relationship(back_populates="owner")


class Dashboard(Base):
    __tablename__ = "dashboards"

    id: Mapped[str] = mapped_column(String(12), primary_key=True, default=_new_id)
    user_id: Mapped[str | None] = mapped_column(
        String(12), ForeignKey("users.id"), index=True, nullable=True
    )
    dataset_id: Mapped[str] = mapped_column(String(12), index=True)
    filename: Mapped[str] = mapped_column(String(255))
    title: Mapped[str] = mapped_column(String(255), default="Untitled Dashboard")

    total_rows: Mapped[int] = mapped_column(Integer)
    total_columns: Mapped[int] = mapped_column(Integer)

    columns: Mapped[list] = mapped_column(JSON)
    kpis: Mapped[list] = mapped_column(JSON)
    charts: Mapped[list] = mapped_column(JSON)
    preview_rows: Mapped[list] = mapped_column(JSON)
    all_rows: Mapped[list] = mapped_column(JSON, default=list)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    owner: Mapped[User | None] = relationship(back_populates="dashboards")
