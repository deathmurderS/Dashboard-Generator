"""
Visora backend — routers/profiler.py

POST /profiler/analyze — accepts a CSV or Excel file upload and returns
the full column-statistics profile used by the Visora profiler screen.
"""

from __future__ import annotations

import io

import pandas as pd
from fastapi import APIRouter, File, HTTPException, UploadFile

from models.schemas import ProfileResponse
from services.profiler_service import profile_dataframe

router = APIRouter(prefix="/profiler", tags=["profiler"])

MAX_UPLOAD_BYTES = 50 * 1024 * 1024  # matches the 50 MB product limit
ALLOWED_SUFFIXES = {".csv", ".xlsx", ".xls"}


def _read_tabular(filename: str, payload: bytes) -> pd.DataFrame:
    lower = filename.lower()
    if lower.endswith(".csv"):
        # Let pandas sniff the separator; fall back to comma.
        try:
            return pd.read_csv(io.BytesIO(payload), sep=None, engine="python")
        except UnicodeDecodeError:
            return pd.read_csv(io.BytesIO(payload), sep=None, engine="python", encoding="latin-1")
    if lower.endswith((".xlsx", ".xls")):
        return pd.read_excel(io.BytesIO(payload))
    raise HTTPException(status_code=415, detail="Unsupported file type — use CSV or Excel.")


@router.post("/analyze", response_model=ProfileResponse)
async def analyze(file: UploadFile = File(...)) -> ProfileResponse:
    filename = file.filename or "uploaded"
    if not any(filename.lower().endswith(s) for s in ALLOWED_SUFFIXES):
        raise HTTPException(status_code=415, detail="Unsupported file type — use CSV or Excel.")

    payload = await file.read()
    if len(payload) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File is larger than the 50 MB limit.")
    if not payload:
        raise HTTPException(status_code=400, detail="The uploaded file is empty.")

    try:
        df = _read_tabular(filename, payload)
    except HTTPException:
        raise
    except Exception as exc:  # pragma: no cover - defensive parse guard
        raise HTTPException(status_code=422, detail=f"Could not read the file: {exc}") from exc

    if df.empty:
        raise HTTPException(status_code=422, detail="The file contains no data rows.")

    df.columns = [str(c).strip() for c in df.columns]
    return profile_dataframe(df, filename)