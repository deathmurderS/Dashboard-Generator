"""
backend/analyzer/kpi.py
"""

from __future__ import annotations

import pandas as pd

MAX_KPI_CARDS = 8

# Sama dengan charts.py — kolom dengan nama generik di-skip
SKIP_PATTERNS = ["unnamed", "kolom_", "column_", "field_", "var_"]


def _is_meaningful_column(col_name: str) -> bool:
    name_lower = col_name.lower().strip()
    if len(name_lower) <= 2:
        return False
    return not any(p in name_lower for p in SKIP_PATTERNS)


def _format_number(value: float) -> float:
    if pd.isna(value):
        return 0
    return round(float(value), 2)


def _calculate_trend(df: pd.DataFrame, col: str) -> dict:
    series = pd.to_numeric(df[col], errors="coerce").dropna()
    if len(series) < 2:
        return {"direction": "stable", "percentage": 0}
    mid = len(series) // 2
    first_half_avg = series.iloc[:mid].mean()
    second_half_avg = series.iloc[mid:].mean()
    if first_half_avg == 0:
        return {"direction": "stable", "percentage": 0}
    change_pct = ((second_half_avg - first_half_avg) / first_half_avg) * 100
    if change_pct > 5:
        return {"direction": "up", "percentage": round(abs(change_pct), 1)}
    elif change_pct < -5:
        return {"direction": "down", "percentage": round(abs(change_pct), 1)}
    else:
        return {"direction": "stable", "percentage": round(abs(change_pct), 1)}


def generate_kpis(df: pd.DataFrame, columns: list[dict]) -> list[dict]:
    kpis: list[dict] = [
        {
            "id": "total_rows",
            "label": "Total baris",
            "value": int(len(df)),
            "type": "count",
        }
    ]

    # Filter kolom yang namanya bermakna
    numeric_cols = [
        c["name"] for c in columns
        if c["type"] == "Numeric" and _is_meaningful_column(c["name"])
    ]
    category_cols = [
        c["name"] for c in columns
        if c["type"] == "Category" and _is_meaningful_column(c["name"])
    ]

    for col in numeric_cols:
        if len(kpis) >= MAX_KPI_CARDS:
            break
        series = pd.to_numeric(df[col], errors="coerce")
        trend = _calculate_trend(df, col)
        kpis.append({
            "id": f"{col}_total",
            "label": f"Total {col}",
            "value": _format_number(series.sum()),
            "type": "total",
            "trend": trend,
        })
        if len(kpis) >= MAX_KPI_CARDS:
            break
        kpis.append({
            "id": f"{col}_avg",
            "label": f"Rata-rata {col}",
            "value": _format_number(series.mean()),
            "type": "average",
        })

    # Fallback kalau tidak ada kolom numerik bermakna
    if len(kpis) == 1 and category_cols:
        main_cat = category_cols[0]
        kpis.append({
            "id": f"{main_cat}_unique_count",
            "label": f"Jumlah {main_cat} unik",
            "value": int(df[main_cat].nunique()),
            "type": "count",
        })

    return kpis[:MAX_KPI_CARDS]