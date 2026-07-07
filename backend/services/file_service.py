"""
backend/services/file_service.py
"""

from __future__ import annotations

import io
import uuid
from pathlib import Path

import pandas as pd

ALLOWED_EXTENSIONS = {".csv", ".xlsx", ".xls"}
MAX_FILE_SIZE_MB = 25
MAX_ROWS = 50_000

UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


class FileValidationError(Exception):
    pass


def validate_file(filename: str, size_bytes: int) -> str:
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise FileValidationError(
            f"Format {ext or 'tidak dikenal'} tidak didukung. Gunakan .csv, .xlsx, atau .xls."
        )
    if size_bytes > MAX_FILE_SIZE_MB * 1024 * 1024:
        raise FileValidationError(f"Ukuran file melebihi batas {MAX_FILE_SIZE_MB}MB.")
    return ext


def detect_sheets(content: bytes, ext: str) -> list[str]:
    """
    Return daftar nama sheet untuk file Excel.
    Untuk CSV selalu return ["Sheet1"] (single sheet).
    """
    if ext == ".csv":
        return ["Sheet1"]
    try:
        xl = pd.ExcelFile(io.BytesIO(content))
        return xl.sheet_names
    except Exception as exc:
        raise FileValidationError(f"Gagal membaca sheet: {exc}") from exc


def _read(content: bytes, ext: str, sheet_name=None, **kwargs) -> pd.DataFrame:
    """Helper baca CSV/Excel dengan error yang konsisten (FileValidationError)."""
    try:
        if ext == ".csv":
            df = pd.read_csv(io.BytesIO(content), **kwargs)
        else:
            df = pd.read_excel(io.BytesIO(content), sheet_name=sheet_name, **kwargs)
    except pd.errors.EmptyDataError as exc:
        raise FileValidationError("File kosong atau tidak berisi data.") from exc
    except Exception as exc:
        raise FileValidationError(f"Gagal membaca file: {exc}") from exc

    # sheet_name=None pada Excel mengembalikan dict[str, DataFrame], bukan DataFrame
    if isinstance(df, dict):
        raise FileValidationError(
            "Sheet tidak ditentukan. Pilih salah satu sheet dari detect_sheets()."
        )
    return df


def parse_dataset(content: bytes, ext: str, sheet_name=None) -> tuple[pd.DataFrame, bool, int]:
    """
    Parse dataset dari CSV/Excel.

    Returns:
        df: DataFrame hasil parsing, di-truncate ke MAX_ROWS kalau perlu.
        was_truncated: True kalau jumlah baris asli melebihi MAX_ROWS.
        original_row_count: jumlah baris SEBELUM truncation.

    Raises:
        FileValidationError: kalau file/sheet kosong atau tidak bisa dibaca
            sama sekali (bukan karena kebanyakan baris -- itu di-truncate,
            bukan di-reject).
    """
    df = _read(content, ext, sheet_name=sheet_name)

    if df.shape[1] == 0 or df.shape[0] == 0:
        raise FileValidationError("File atau sheet tidak memiliki data yang bisa dibaca.")

    # Deteksi apakah header tidak valid (mayoritas kolom "Unnamed")
    unnamed_ratio = sum(1 for c in df.columns if str(c).startswith("Unnamed:")) / len(df.columns)
    if unnamed_ratio > 0.5:
        # Coba skip 1 baris — kemungkinan baris pertama adalah judul
        df = _read(content, ext, sheet_name=sheet_name, skiprows=1)

        if df.shape[0] == 0:
            raise FileValidationError("File atau sheet tidak memiliki data yang bisa dibaca.")

        # Kalau masih banyak Unnamed setelah skip, coba header=None
        unnamed_ratio2 = sum(1 for c in df.columns if str(c).startswith("Unnamed:")) / len(df.columns)
        if unnamed_ratio2 > 0.5:
            df = _read(content, ext, sheet_name=sheet_name, header=None)
            df.columns = [f"Kolom_{i+1}" for i in range(len(df.columns))]

    original_row_count = len(df)
    was_truncated = original_row_count > MAX_ROWS
    if was_truncated:
        df = df.iloc[:MAX_ROWS].copy()

    return df, was_truncated, original_row_count


def save_raw_file(content: bytes, filename: str) -> tuple[str, Path]:
    dataset_id = uuid.uuid4().hex[:12]
    ext = Path(filename).suffix.lower()
    dest = UPLOAD_DIR / f"{dataset_id}{ext}"
    dest.write_bytes(content)
    return dataset_id, dest


def load_raw_file(dataset_id: str) -> tuple[bytes, str]:
    matches = sorted(UPLOAD_DIR.glob(f"{dataset_id}.*"))
    if not matches:
        raise FileValidationError("Dataset tidak ditemukan atau sudah tidak tersedia.")
    if len(matches) > 1:
        raise FileValidationError("Dataset tidak valid karena ada file duplikat.")

    path = matches[0]
    return path.read_bytes(), path.suffix.lower()