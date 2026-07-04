"""
backend/analyzer/quality.py

Filter baris yang "rusak" sebelum dihitung jadi KPI/chart. Kasus paling
umum: kolom-kolom di satu baris kegeser (misal satu kolom kosong di
sumbernya, sehingga semua nilai setelahnya mundur satu kolom). Baris
seperti ini punya nilai yang nggak cocok dengan tipe kolom yang sudah
terdeteksi (misal kolom Numeric isinya teks tanggal) — itu sinyal kuat
baris tersebut tidak valid dan harus dikecualikan dari analisis, bukan
sekadar "terlihat kotor" di chart.
"""

from __future__ import annotations

import pandas as pd

# Berapa kolom yang harus gagal validasi sebelum satu baris dianggap rusak.
# 1 = paling ketat (sekali gagal di satu kolom tipe Date/Numeric, baris dibuang).
MIN_FAILED_COLUMNS_TO_DROP = 1


def _row_validity_mask(df: pd.DataFrame, columns: list[dict]) -> pd.Series:
    """
    Return boolean Series: True = baris valid, False = baris rusak.

    Validasi hanya diterapkan untuk kolom bertipe Date atau Numeric (karena
    itu yang punya format jelas untuk dicek). Kolom Category tidak dicek di
    sini karena kategori "salah" sulit dibedakan dari kategori yang memang
    jarang muncul.
    """
    failed_count = pd.Series(0, index=df.index)

    for col in columns:
        name, col_type = col["name"], col["type"]
        series = df[name]

        if col_type == "Numeric":
            parsed = pd.to_numeric(series, errors="coerce")
            failed = parsed.isna() & series.notna()
        elif col_type == "Date":
            parsed = pd.to_datetime(series, errors="coerce", format="mixed", utc=True)
            failed = parsed.isna() & series.notna()
        else:
            continue

        failed_count += failed.astype(int)

    return failed_count < MIN_FAILED_COLUMNS_TO_DROP


def filter_invalid_rows(df: pd.DataFrame, columns: list[dict]) -> tuple[pd.DataFrame, int]:
    """
    Buang baris yang nilainya tidak konsisten dengan tipe kolom yang
    terdeteksi (indikasi baris rusak/kolom kegeser di sumber data).

    Return (df_bersih, jumlah_baris_dibuang).
    """
    if df.empty:
        return df, 0

    mask = _row_validity_mask(df, columns)
    n_dropped = int((~mask).sum())

    if n_dropped == 0:
        return df, 0

    return df.loc[mask].reset_index(drop=True), n_dropped