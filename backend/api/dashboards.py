"""
backend/api/dashboards.py
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database.db import get_db
from models.db_models import Dashboard
from models.schemas import (
    DashboardDetail, DashboardSummary, SaveDashboardRequest,
    UpdateChartRequest, AddChartRequest, UpdateKpisRequest,
)
import uuid as uuid_lib

router = APIRouter(prefix="/api/dashboards", tags=["dashboards"])


# ── Request model untuk reorder ──────────────────────────────────────────────
class ReorderChartsRequest(BaseModel):
    charts: list[dict]


# ── Dashboard CRUD ───────────────────────────────────────────────────────────

@router.post("", response_model=DashboardDetail, status_code=201)
def save_dashboard(payload: SaveDashboardRequest, db: Session = Depends(get_db)) -> Dashboard:
    dashboard = Dashboard(
        dataset_id=payload.dataset_id,
        filename=payload.filename,
        title=payload.title or payload.filename,
        total_rows=payload.total_rows,
        total_columns=payload.total_columns,
        columns=[c.model_dump() for c in payload.columns],
        kpis=[k.model_dump() for k in payload.kpis],
        charts=[c.model_dump() for c in payload.charts],
        preview_rows=payload.preview_rows,
        all_rows=payload.all_rows,
    )
    db.add(dashboard)
    db.commit()
    db.refresh(dashboard)
    return dashboard


@router.get("", response_model=list[DashboardSummary])
def list_dashboards(db: Session = Depends(get_db)) -> list[Dashboard]:
    return db.query(Dashboard).order_by(Dashboard.updated_at.desc()).all()


@router.get("/{dashboard_id}", response_model=DashboardDetail)
def get_dashboard(dashboard_id: str, db: Session = Depends(get_db)) -> Dashboard:
    dashboard = db.query(Dashboard).filter(Dashboard.id == dashboard_id).first()
    if dashboard is None:
        raise HTTPException(status_code=404, detail="Dashboard tidak ditemukan.")
    return dashboard


@router.delete("/{dashboard_id}", status_code=204, response_model=None)
def delete_dashboard(dashboard_id: str, db: Session = Depends(get_db)) -> None:
    dashboard = db.query(Dashboard).filter(Dashboard.id == dashboard_id).first()
    if dashboard is None:
        raise HTTPException(status_code=404, detail="Dashboard tidak ditemukan.")
    db.delete(dashboard)
    db.commit()


# ── KPI ──────────────────────────────────────────────────────────────────────

@router.patch("/{dashboard_id}/kpis", response_model=DashboardDetail)
def update_kpis(dashboard_id: str, payload: UpdateKpisRequest, db: Session = Depends(get_db)) -> Dashboard:
    dashboard = db.query(Dashboard).filter(Dashboard.id == dashboard_id).first()
    if dashboard is None:
        raise HTTPException(status_code=404, detail="Dashboard tidak ditemukan.")
    from sqlalchemy.orm.attributes import flag_modified
    dashboard.kpis = [k.model_dump() for k in payload.kpis]
    flag_modified(dashboard, "kpis")
    db.commit()
    db.refresh(dashboard)
    return dashboard


# ── Charts — PENTING: route statik (/charts-reorder) harus SEBELUM ──────────
# ── route dinamik (/charts/{chart_id}) supaya tidak bentrok ─────────────────

@router.patch("/{dashboard_id}/charts-reorder", response_model=DashboardDetail)
def reorder_charts(dashboard_id: str, payload: ReorderChartsRequest, db: Session = Depends(get_db)) -> Dashboard:
    dashboard = db.query(Dashboard).filter(Dashboard.id == dashboard_id).first()
    if dashboard is None:
        raise HTTPException(status_code=404, detail="Dashboard tidak ditemukan.")

    from sqlalchemy.orm.attributes import flag_modified
    dashboard.charts = payload.charts
    flag_modified(dashboard, "charts")
    db.commit()
    db.refresh(dashboard)
    return dashboard


@router.post("/{dashboard_id}/charts", response_model=DashboardDetail, status_code=201)
def add_chart(dashboard_id: str, payload: AddChartRequest, db: Session = Depends(get_db)) -> Dashboard:
    dashboard = db.query(Dashboard).filter(Dashboard.id == dashboard_id).first()
    if dashboard is None:
        raise HTTPException(status_code=404, detail="Dashboard tidak ditemukan.")

    new_chart = {
        "id": uuid_lib.uuid4().hex[:8],
        "type": payload.type,
        "title": payload.title,
        "x_label": payload.x_label,
        "y_label": payload.y_label,
        "data": payload.data,
        "stack_categories": payload.stack_categories,
        "granularities": payload.granularities,
        "active_granularity": payload.active_granularity,
    }

    from sqlalchemy.orm.attributes import flag_modified
    dashboard.charts = dashboard.charts + [new_chart]
    flag_modified(dashboard, "charts")
    db.commit()
    db.refresh(dashboard)
    return dashboard


@router.patch("/{dashboard_id}/charts/{chart_id}", response_model=DashboardDetail)
def update_chart(
    dashboard_id: str, chart_id: str, payload: UpdateChartRequest, db: Session = Depends(get_db)
) -> Dashboard:
    dashboard = db.query(Dashboard).filter(Dashboard.id == dashboard_id).first()
    if dashboard is None:
        raise HTTPException(status_code=404, detail="Dashboard tidak ditemukan.")

    updated = []
    found = False
    for c in dashboard.charts:
        if c.get("id") == chart_id:
            found = True
            c = {**c}
            if payload.type is not None:
                c["type"] = payload.type
            if payload.title is not None:
                c["title"] = payload.title
            if payload.color is not None:
                c["color"] = payload.color
            if payload.slice_colors is not None:
                c["slice_colors"] = payload.slice_colors
        updated.append(c)

    if not found:
        raise HTTPException(status_code=404, detail="Chart tidak ditemukan.")

    from sqlalchemy.orm.attributes import flag_modified
    dashboard.charts = updated
    flag_modified(dashboard, "charts")
    db.commit()
    db.refresh(dashboard)
    return dashboard


@router.delete("/{dashboard_id}/charts/{chart_id}", status_code=204, response_model=None)
def delete_chart(dashboard_id: str, chart_id: str, db: Session = Depends(get_db)) -> None:
    dashboard = db.query(Dashboard).filter(Dashboard.id == dashboard_id).first()
    if dashboard is None:
        raise HTTPException(status_code=404, detail="Dashboard tidak ditemukan.")

    updated = [c for c in dashboard.charts if c.get("id") != chart_id]
    if len(updated) == len(dashboard.charts):
        raise HTTPException(status_code=404, detail="Chart tidak ditemukan.")

    from sqlalchemy.orm.attributes import flag_modified
    dashboard.charts = updated
    flag_modified(dashboard, "charts")
    db.commit()