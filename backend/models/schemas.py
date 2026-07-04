"""
backend/models/schemas.py

Skema response untuk endpoint upload & dashboard generation (Phase 1).
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel


class ColumnInfo(BaseModel):
    name: str
    type: Literal["Date", "Numeric", "Category"]


class KPICard(BaseModel):
    id: str
    label: str
    value: float
    type: Literal["count", "total", "average"]
    color: str | None = None


CHART_TYPE = Literal["bar", "line", "pie", "hbar", "stacked_bar", "donut", "trend"]


class ChartSpec(BaseModel):
    id: str
    type: CHART_TYPE
    title: str
    x_label: str | None = None
    y_label: str | None = None
    data: list[dict[str, Any]]
    stack_categories: list[str] | None = None
    color: str | None = None
    slice_colors: dict[str, str] | None = None
    granularities: dict[str, list[dict[str, Any]]] | None = None
    active_granularity: str | None = None  # ← typo fix (granularaties → granularity)


class UploadResponse(BaseModel):
    dataset_id: str
    filename: str
    total_rows: int
    total_columns: int
    columns: list[ColumnInfo]
    preview_rows: list[dict[str, Any]]
    all_rows: list[dict[str, Any]]
    kpis: list[KPICard]
    charts: list[ChartSpec]
    processing_time_ms: float
    was_truncated: bool = False
    original_row_count: int
    rows_excluded: int = 0


class ErrorResponse(BaseModel):
    detail: str


# ---------------------------------------------------------------------------
# Phase 2 — simpan & buka kembali dashboard
# ---------------------------------------------------------------------------

class SaveDashboardRequest(BaseModel):
    """Body untuk POST /api/dashboards — biasanya dikirim dari payload UploadResponse."""

    dataset_id: str
    filename: str
    title: str | None = None
    total_rows: int
    total_columns: int
    columns: list[ColumnInfo]
    preview_rows: list[dict[str, Any]]
    all_rows: list[dict[str, Any]]
    kpis: list[KPICard]
    charts: list[ChartSpec]


class DashboardSummary(BaseModel):
    """Item ringkas untuk daftar dashboard (GET /api/dashboards)."""

    id: str
    title: str
    filename: str
    total_rows: int
    total_columns: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DashboardDetail(DashboardSummary):
    """Detail lengkap untuk satu dashboard (GET /api/dashboards/{id})."""

    dataset_id: str
    columns: list[ColumnInfo]
    preview_rows: list[dict[str, Any]]
    all_rows: list[dict[str, Any]]
    kpis: list[KPICard]
    charts: list[ChartSpec]

    model_config = {"from_attributes": True}


class RowsQueryResponse(BaseModel):
    """Response untuk GET /api/dashboards/{id}/rows"""

    rows: list[dict[str, Any]]
    total: int
    page: int
    page_size: int
    total_pages: int


class UpdateChartRequest(BaseModel):
    type: CHART_TYPE | None = None
    title: str | None = None
    color: str | None = None
    slice_colors: dict[str, str] | None = None


class AddChartRequest(BaseModel):
    type: CHART_TYPE
    title: str
    x_label: str | None = None
    y_label: str | None = None
    data: list[dict[str, Any]]
    stack_categories: list[str] | None = None
    granularities: dict[str, list[dict[str, Any]]] | None = None
    active_granularity: str | None = None  # ← typo fix (granularaties → granularity)


class UpdateKpisRequest(BaseModel):
    """Body untuk PATCH /api/dashboards/{id}/kpis"""
    kpis: list[KPICard]