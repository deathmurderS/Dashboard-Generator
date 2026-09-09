"""
Visora backend — services/profiler_service.py

Deep column profiling for the Visora profiler screen. Reads CSV/Excel
files with pandas and infers, for every column: the semantic type,
completeness, missing count, distinct count, a 10-bucket distribution
(sparkline) and the statistical summary rendered in the UI.

Type detection ports the original Dashboard-Generator analyzer logic
(numeric before date, sampled for speed) and adds a text category for
high-cardinality identifier columns.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

SAMPLE_SIZE = 500          # values sampled per column for type inference
MATCH_THRESHOLD = 0.9      # share of parseable values required for a type
DISTRIBUTION_BINS = 10     # sparkline buckets returned per column
HIGH_CARDINALITY = 50      # boundary between "category" and "text"
NULL_WARNING_RATE = 0.05   # missing-value share that triggers a warning


def _non_null_sample(series: pd.Series) -> pd.Series:
    cleaned = series.dropna()
    if len(cleaned) > SAMPLE_SIZE:
        return cleaned.sample(SAMPLE_SIZE, random_state=42)
    return cleaned


def _is_numeric(series: pd.Series) -> bool:
    converted = pd.to_numeric(series, errors="coerce")
    return converted.notna().mean() >= MATCH_THRESHOLD


def _is_date(series: pd.Series) -> bool:
    if pd.api.types.is_numeric_dtype(series):
        return False
    converted = pd.to_datetime(series, errors="coerce", format="mixed")
    return converted.notna().mean() >= MATCH_THRESHOLD


def detect_semantic_type(series: pd.Series) -> str:
    """Return one of: numeric | date | category | text.

    Numeric is checked before date — plain numbers are easily misread as
    epoch dates by the lenient datetime parser. A string column with few
    repeating values is a category; one with many unique values (names,
    IDs, free text) is text.
    """
    sample = _non_null_sample(series)
    if len(sample) == 0:
        return "category"
    if _is_numeric(sample):
        return "numeric"
    if _is_date(sample):
        return "date"
    if int(series.nunique(dropna=True)) <= HIGH_CARDINALITY:
        return "category"
    return "text"


def _pad_bins(values) -> list[int]:
    """Normalize any bucket list to exactly DISTRIBUTION_BINS entries."""
    ints = [int(round(v)) for v in values][:DISTRIBUTION_BINS]
    while len(ints) < DISTRIBUTION_BINS:
        ints.append(0)
    return ints


def _distribution_for(series: pd.Series, semantic_type: str) -> list[int]:
    if semantic_type == "numeric":
        nums = pd.to_numeric(series, errors="coerce").dropna()
        if nums.empty:
            return _pad_bins([])
        counts, _ = np.histogram(nums, bins=DISTRIBUTION_BINS)
        return _pad_bins(counts)
    if semantic_type == "date":
        dates = pd.to_datetime(series, errors="coerce", format="mixed").dropna()
        if dates.empty:
            return _pad_bins([])
        monthly = dates.dt.to_period("M").value_counts().sort_index()
        if len(monthly) > DISTRIBUTION_BINS:
            monthly = monthly.tail(DISTRIBUTION_BINS)
        return _pad_bins(monthly.values)
    cleaned = series.dropna().astype(str).str.strip().str.lower()
    if cleaned.empty:
        return _pad_bins([])
    counts = cleaned.value_counts().head(DISTRIBUTION_BINS)
    return _pad_bins(counts.values)


def _shannon_entropy(value_counts: pd.Series) -> float:
    total = value_counts.sum()
    if total == 0:
        return 0.0
    probs = value_counts / total
    return round(float(-(probs * np.log2(probs)).sum()), 2)


def _stats_for(series: pd.Series, semantic_type: str) -> dict:
    non_null = series.dropna()
    if semantic_type == "numeric":
        nums = pd.to_numeric(non_null, errors="coerce").dropna()
        if nums.empty:
            return {}
        return {
            "min": round(float(nums.min()), 4),
            "max": round(float(nums.max()), 4),
            "mean": round(float(nums.mean()), 4),
            "median": round(float(nums.median()), 4),
            "std": round(float(nums.std()) if len(nums) > 1 else 0.0, 4),
        }
    if semantic_type == "date":
        dates = pd.to_datetime(non_null, errors="coerce", format="mixed").dropna()
        if dates.empty:
            return {}
        return {
            "min": str(dates.min().date()),
            "max": str(dates.max().date()),
        }
    cleaned = non_null.astype(str).str.strip()
    if cleaned.empty:
        return {}
    lowered = cleaned.str.lower()
    counts = lowered.value_counts()
    display = cleaned.groupby(lowered).agg(lambda v: v.value_counts().idxmax())
    top_key = counts.index[0]
    top_value = str(display.get(top_key, top_key))
    stats: dict = {
        "top_value": top_value,
        "top_pct": round(float(counts.iloc[0]) / len(cleaned) * 100, 1),
        "entropy": _shannon_entropy(counts),
    }
    if len(counts) > 1:
        second_key = counts.index[1]
        stats["second_value"] = str(display.get(second_key, second_key))
    return stats


def _anomalies_for(series: pd.Series, name: str, semantic_type: str,
                   row_count: int) -> list[dict]:
    anomalies: list[dict] = []
    non_null = int(series.notna().sum())
    missing = row_count - non_null
    completeness = (non_null / row_count * 100) if row_count else 100.0

    if missing > 0 and completeness < (1 - NULL_WARNING_RATE) * 100:
        if semantic_type == "numeric":
            nums = pd.to_numeric(series, errors="coerce").dropna()
            hint = f"Impute using median ({round(float(nums.median()), 2)})" if not nums.empty else "Remove the affected rows"
        elif semantic_type == "date":
            hint = "Backfill from the source system or drop the affected rows"
        else:
            cleaned = series.dropna().astype(str).str.strip()
            top = cleaned.mode()
            hint = f"Impute using most common value ({top.iloc[0]})" if not top.empty else "Remove the affected rows"
        anomalies.append({
            "column": name,
            "type": "warning",
            "message": f"{missing:,} null values detected",
            "suggestion": hint,
        })

    distinct = int(series.nunique(dropna=True))
    if row_count >= 30 and distinct == non_null and distinct == row_count and semantic_type != "date":
        anomalies.append({
            "column": name,
            "type": "info",
            "message": "Every row has a unique value",
            "suggestion": "Treat as a row identifier — exclude it from charts and totals",
        })

    if non_null > 1 and distinct == 1:
        anomalies.append({
            "column": name,
            "type": "info",
            "message": "This column holds the same value in every row",
            "suggestion": "It adds no comparison value — safe to exclude from dashboards",
        })

    if semantic_type == "text" and distinct > 500:
        anomalies.append({
            "column": name,
            "type": "warning",
            "message": f"{distinct:,} different values — too granular to chart directly",
            "suggestion": "Group into broader buckets (top 10) before visualizing",
        })

    return anomalies


def profile_dataframe(df: pd.DataFrame, filename: str) -> dict:
    """Build the full profiler response consumed by the Visora frontend."""
    row_count = int(len(df))
    total_cells = row_count * len(df.columns) if len(df.columns) else 0

    columns: list[dict] = []
    anomalies: list[dict] = []
    non_null_cells = 0

    for col in df.columns:
        series = df[col]
        semantic_type = detect_semantic_type(series)
        non_null = int(series.notna().sum())
        non_null_cells += non_null
        missing = row_count - non_null
        completeness = round(non_null / row_count * 100, 1) if row_count else 100.0
        columns.append({
            "name": str(col),
            "description": "",
            "semantic_type": semantic_type,
            "completeness": completeness,
            "missing_count": missing,
            "distinct_count": int(series.nunique(dropna=True)),
            "distribution": _distribution_for(series, semantic_type),
            "stats": _stats_for(series, semantic_type),
        })
        anomalies.extend(_anomalies_for(series, str(col), semantic_type, row_count))

    return {
        "filename": filename,
        "row_count": row_count,
        "column_count": len(df.columns),
        "completeness_overall": round(non_null_cells / total_cells * 100, 1) if total_cells else 100.0,
        "columns": columns,
        "quality_anomalies": anomalies,
    }
