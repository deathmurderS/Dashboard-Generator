"""
backend/services/dashboard_service.py
"""

from __future__ import annotations

import time

import pandas as pd

from analyzer.charts import generate_charts
from analyzer.detector import detect_columns
from analyzer.kpi import generate_kpis
from analyzer.quality import filter_invalid_rows

PREVIEW_ROW_LIMIT = 50


def build_dashboard_payload(
    df: pd.DataFrame,
    dataset_id: str,
    filename: str,
    was_truncated: bool = False,
    original_row_count: int | None = None,
    rows_excluded: int = 0,
) -> dict:
    start = time.perf_counter()

    columns = detect_columns(df)
    df, rows_excluded = filter_invalid_rows(df, columns)

    kpis = generate_kpis(df, columns)
    charts = generate_charts(df, columns)

    # Bersihkan NaN jadi None untuk SELURUH dataframe (bukan cuma preview),
    # supaya semua baris bisa disimpan dan dikirim balik via JSON dengan aman.
    clean_df = df.where(pd.notna(df), None)

    preview_rows = clean_df.head(PREVIEW_ROW_LIMIT).to_dict(orient="records")
    all_rows = clean_df.to_dict(orient="records")

    elapsed_ms = (time.perf_counter() - start) * 1000

    return {
        "dataset_id": dataset_id,
        "filename": filename,
        "total_rows": int(len(df)),
        "total_columns": int(len(df.columns)),
        "columns": columns,
        "preview_rows": preview_rows,
        "all_rows": all_rows,
        "kpis": kpis,
        "charts": charts,
        "processing_time_ms": round(elapsed_ms, 2),
        "was_truncated": was_truncated,
        "original_row_count": original_row_count if was_truncated else int(len(df)) + rows_excluded,
        "rows_excluded": rows_excluded,
    }