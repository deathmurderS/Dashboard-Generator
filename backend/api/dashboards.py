"""
backend/api/dashboards.py
"""

from __future__ import annotations

import csv
import io
import uuid as uuid_lib

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from auth.deps import get_current_user
from database.db import get_db
from models.db_models import Dashboard, User
from models.schemas import (
    AddChartRequest,
    DashboardDetail,
    DashboardSummary,
    SaveDashboardRequest,
    UpdateChartRequest,
    UpdateKpisRequest,
)

router = APIRouter(prefix="/api/dashboards", tags=["dashboards"])


class ReorderChartsRequest(BaseModel):
    charts: list[dict]


# ─── Helper: statistik kolom ────────────────────────────────────────────────
def _column_stats(rows: list[dict], columns: list[dict]) -> list[dict]:
    """Hitung statistik deskriptif per kolom + missing value report."""
    if not rows:
        return []

    df = pd.DataFrame(rows)
    stats: list[dict] = []

    for col in columns:
        name = col["name"]
        col_type = col["type"]
        if name not in df.columns:
            continue

        series = df[name]
        total = len(series)
        missing = int(series.isna().sum())
        missing_pct = round((missing / total * 100), 2) if total else 0.0
        unique = int(series.nunique(dropna=True))

        info: dict = {
            "name": name,
            "type": col_type,
            "total": total,
            "missing": missing,
            "missing_percentage": missing_pct,
            "unique": unique,
        }

        if col_type == "Numeric":
            numeric = pd.to_numeric(series, errors="coerce").dropna()
            if len(numeric) > 0:
                # Outlier sederhana pakai IQR
                q1 = float(numeric.quantile(0.25))
                q3 = float(numeric.quantile(0.75))
                iqr = q3 - q1
                lower = q1 - 1.5 * iqr
                upper = q3 + 1.5 * iqr
                outliers = int(((numeric < lower) | (numeric > upper)).sum())
                info.update({
                    "min": round(float(numeric.min()), 4),
                    "max": round(float(numeric.max()), 4),
                    "mean": round(float(numeric.mean()), 4),
                    "median": round(float(numeric.median()), 4),
                    "std": round(float(numeric.std()), 4) if len(numeric) > 1 else 0.0,
                    "q1": round(q1, 4),
                    "q3": round(q3, 4),
                    "outliers_iqr": outliers,
                })
        elif col_type == "Category":
            vc = series.dropna().astype(str).value_counts()
            top = vc.head(5)
            info["top_values"] = [
                {"value": str(k), "count": int(v)} for k, v in top.items()
            ]
        elif col_type == "Date":
            parsed = pd.to_datetime(series, errors="coerce", format="mixed")
            valid = parsed.dropna()
            if len(valid) > 0:
                info.update({
                    "min_date": valid.min().isoformat(),
                    "max_date": valid.max().isoformat(),
                })

        stats.append(info)

    return stats


def _filter_rows(
    rows: list[dict],
    search: str | None,
    column_filter: str | None,
) -> list[dict]:
    """Filter baris berdasarkan search global atau filter kolom spesifik."""
    if not search and not column_filter:
        return rows

    out = rows
    if search:
        s = search.lower()
        out = [
            r for r in out
            if any(s in str(v).lower() for v in r.values() if v is not None)
        ]

    if column_filter:
        # Format: "col_name=value"
        if "=" in column_filter:
            col_name, val = column_filter.split("=", 1)
            out = [
                r for r in out
                if str(r.get(col_name, "")) == val
            ]

    return out


def _get_owned_dashboard(dashboard_id: str, user: User, db: Session) -> Dashboard:
    dashboard = (
        db.query(Dashboard)
        .filter(Dashboard.id == dashboard_id, Dashboard.user_id == user.id)
        .first()
    )
    if dashboard is None:
        raise HTTPException(status_code=404, detail="Dashboard tidak ditemukan.")
    return dashboard


@router.post("", response_model=DashboardDetail, status_code=201)
def save_dashboard(
    payload: SaveDashboardRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Dashboard:
    dashboard = Dashboard(
        user_id=user.id,
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
def list_dashboards(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[Dashboard]:
    return (
        db.query(Dashboard)
        .filter(Dashboard.user_id == user.id)
        .order_by(Dashboard.updated_at.desc())
        .all()
    )


@router.get("/{dashboard_id}", response_model=DashboardDetail)
def get_dashboard(
    dashboard_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Dashboard:
    return _get_owned_dashboard(dashboard_id, user, db)


@router.delete("/{dashboard_id}", status_code=204, response_model=None)
def delete_dashboard(
    dashboard_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> None:
    dashboard = _get_owned_dashboard(dashboard_id, user, db)
    db.delete(dashboard)
    db.commit()


@router.patch("/{dashboard_id}/kpis", response_model=DashboardDetail)
def update_kpis(
    dashboard_id: str,
    payload: UpdateKpisRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Dashboard:
    dashboard = _get_owned_dashboard(dashboard_id, user, db)
    from sqlalchemy.orm.attributes import flag_modified

    dashboard.kpis = [k.model_dump() for k in payload.kpis]
    flag_modified(dashboard, "kpis")
    db.commit()
    db.refresh(dashboard)
    return dashboard


@router.patch("/{dashboard_id}/charts-reorder", response_model=DashboardDetail)
def reorder_charts(
    dashboard_id: str,
    payload: ReorderChartsRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Dashboard:
    dashboard = _get_owned_dashboard(dashboard_id, user, db)
    from sqlalchemy.orm.attributes import flag_modified

    dashboard.charts = payload.charts
    flag_modified(dashboard, "charts")
    db.commit()
    db.refresh(dashboard)
    return dashboard


@router.post("/{dashboard_id}/charts", response_model=DashboardDetail, status_code=201)
def add_chart(
    dashboard_id: str,
    payload: AddChartRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Dashboard:
    dashboard = _get_owned_dashboard(dashboard_id, user, db)

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
    dashboard_id: str,
    chart_id: str,
    payload: UpdateChartRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Dashboard:
    dashboard = _get_owned_dashboard(dashboard_id, user, db)

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
def delete_chart(
    dashboard_id: str,
    chart_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> None:
    dashboard = _get_owned_dashboard(dashboard_id, user, db)

    updated = [c for c in dashboard.charts if c.get("id") != chart_id]
    if len(updated) == len(dashboard.charts):
        raise HTTPException(status_code=404, detail="Chart tidak ditemukan.")

    from sqlalchemy.orm.attributes import flag_modified

    dashboard.charts = updated
    flag_modified(dashboard, "charts")
    db.commit()


# ─── Endpoint baru: pagination, search, stats, export ───────────────────────

@router.get("/{dashboard_id}/rows")
def get_dashboard_rows(
    dashboard_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    search: str | None = Query(None, description="Search global di semua kolom"),
    column_filter: str | None = Query(
        None, description="Filter kolom spesifik, format: col_name=value"
    ),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """
    Ambil baris dashboard dengan pagination + search + filter kolom.

    Pakai `all_rows` yang sudah disimpan di DB (bukan preview 50 baris).
    """
    dashboard = _get_owned_dashboard(dashboard_id, user, db)
    rows = dashboard.all_rows or []

    # Apply filter
    filtered = _filter_rows(rows, search, column_filter)
    total = len(filtered)
    total_pages = max(1, (total + page_size - 1) // page_size)

    # Pagination
    start = (page - 1) * page_size
    end = start + page_size
    page_rows = filtered[start:end]

    return {
        "rows": page_rows,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "filtered": total != len(rows),
    }


@router.get("/{dashboard_id}/stats")
def get_dashboard_stats(
    dashboard_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """
    Statistik deskriptif per kolom + missing value report + outlier (IQR).

    Berguna untuk panel "Data Quality" di frontend.
    """
    dashboard = _get_owned_dashboard(dashboard_id, user, db)
    rows = dashboard.all_rows or dashboard.preview_rows or []
    columns = dashboard.columns or []

    stats = _column_stats(rows, columns)

    # Ringkasan global
    total_cells = len(rows) * len(columns) if rows and columns else 0
    total_missing = sum(s["missing"] for s in stats)
    overall_missing_pct = (
        round(total_missing / total_cells * 100, 2) if total_cells else 0.0
    )

    return {
        "columns": stats,
        "total_rows": len(rows),
        "total_columns": len(columns),
        "total_cells": total_cells,
        "total_missing": total_missing,
        "overall_missing_percentage": overall_missing_pct,
    }


@router.get("/{dashboard_id}/export/csv")
def export_dashboard_csv(
    dashboard_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> StreamingResponse:
    """Export semua baris dashboard sebagai CSV."""
    dashboard = _get_owned_dashboard(dashboard_id, user, db)
    rows = dashboard.all_rows or dashboard.preview_rows or []
    columns = [c["name"] for c in (dashboard.columns or [])]

    output = io.StringIO()
    # newline="" supaya CSV writer tidak dobel newline di Windows
    writer = csv.DictWriter(
        output,
        fieldnames=columns,
        extrasaction="ignore",
        lineterminator="\n",
    )
    writer.writeheader()
    for row in rows:
        # Konversi None ke string kosong biar CSV bersih
        clean = {k: ("" if v is None else v) for k, v in row.items()}
        writer.writerow(clean)

    filename = f"{(dashboard.title or 'dashboard').replace(' ', '_')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{dashboard_id}/export/xlsx")
def export_dashboard_xlsx(
    dashboard_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> StreamingResponse:
    """Export semua baris dashboard sebagai XLSX."""
    dashboard = _get_owned_dashboard(dashboard_id, user, db)
    rows = dashboard.all_rows or dashboard.preview_rows or []

    df = pd.DataFrame(rows)
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="Data")
    output.seek(0)

    filename = f"{(dashboard.title or 'dashboard').replace(' ', '_')}.xlsx"
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
