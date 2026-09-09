"""
backend/analyzer/detector.py

Mendeteksi tipe setiap kolom dalam dataset: Date, Numeric, atau Category.
Logikanya dibuat konsisten dengan deteksi sisi frontend (UploadPreview.jsx),
tapi di sini pakai pandas supaya akurat dan tahan untuk dataset besar.
"""

from __future__ import annotations

import pandas as pd

# Ambil sample biar deteksi tetap cepat untuk dataset hingga 50.000 baris
SAMPLE_SIZE = 200
# Threshold toleransi: berapa persen nilai non-null yang harus "cocok"
# dengan suatu tipe agar kolom dianggap bertipe itu (data dunia nyata jarang 100% bersih)
MATCH_THRESHOLD = 0.9


def _non_null_sample(series: pd.Series) -> pd.Series:
    cleaned = series.dropna()
    if len(cleaned) == 0:
        return cleaned
    if len(cleaned) > SAMPLE_SIZE:
        return cleaned.sample(SAMPLE_SIZE, random_state=42)
    return cleaned


def _is_numeric(series: pd.Series) -> bool:
    converted = pd.to_numeric(series, errors="coerce")
    match_rate = converted.notna().mean()
    return match_rate >= MATCH_THRESHOLD


def _is_date(series: pd.Series) -> bool:
    if pd.api.types.is_numeric_dtype(series):
        return False
    converted = pd.to_datetime(series, errors="coerce", format="mixed")
    match_rate = converted.notna().mean()
    return match_rate >= MATCH_THRESHOLD


def detect_column_type(series: pd.Series) -> str:
    sample = _non_null_sample(series)
    if len(sample) == 0:
        return "Category"

    if sample.empty:
        return "Category"

    # PENTING: cek numeric duluan. pd.to_datetime cukup longgar dan bisa
    # salah mengira angka polos (misal "0", "-10") sebagai tanggal/epoch,
    # jadi numeric harus diperiksa lebih dulu untuk mencegah misklasifikasi.
    if _is_numeric(sample):
        return "Numeric"
    if _is_date(sample):
        return "Date"
    return "Category"


def detect_columns(df: pd.DataFrame) -> list[dict]:
    """
    Return contoh:
    [{"name": "tanggal", "type": "Date"}, {"name": "revenue", "type": "Numeric"}, ...]
    """
    return [{"name": col, "type": detect_column_type(df[col])} for col in df.columns]


def detect_summary(df: pd.DataFrame) -> dict:
    columns = detect_columns(df)
    type_counts: dict[str, int] = {}
    for col in columns:
        type_counts[col["type"]] = type_counts.get(col["type"], 0) + 1

    return {
        "columns": columns,
        "total_rows": int(len(df)),
        "total_columns": int(len(df.columns)),
        "type_counts": type_counts,
    }