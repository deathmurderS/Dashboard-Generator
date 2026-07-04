"""
backend/api/upload.py

POST /api/detect-sheets  — return daftar sheet dari file Excel
POST /api/upload          — proses satu sheet jadi dashboard payload
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from typing import Annotated

from models.schemas import UploadResponse
from services.dashboard_service import build_dashboard_payload
from services.file_service import (
    FileValidationError,
    detect_sheets,
    parse_dataset,
    save_raw_file,
    validate_file,
)

router = APIRouter(prefix="/api", tags=["upload"])


@router.post("/detect-sheets")
async def detect_sheets_endpoint(file: UploadFile = File(...)) -> dict:
    """
    Terima file, return daftar nama sheet.
    CSV selalu return ["Sheet1"].
    File disimpan sementara dan dataset_id dikembalikan
    supaya /upload tidak perlu upload ulang.
    """
    content = await file.read()
    try:
        ext = validate_file(file.filename, len(content))
        sheets = detect_sheets(content, ext)
    except FileValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    # Simpan file sekali di sini, dataset_id dipakai ulang di /upload
    dataset_id, _ = save_raw_file(content, file.filename)

    return {
        "dataset_id": dataset_id,
        "filename": file.filename,
        "ext": ext,
        "sheets": sheets,
        "is_multi_sheet": len(sheets) > 1,
    }


@router.post("/upload", response_model=list[UploadResponse])
async def upload_dataset(
    file: UploadFile = File(...),
    sheets: Annotated[str, Form()] = "",          # "Sheet1,Sheet2,Sheet3" — kosong = semua
    dataset_id: Annotated[str, Form()] = "",      # dari detect-sheets, opsional
) -> list[UploadResponse]:
    """
    Proses satu atau lebih sheet dari file yang diupload.
    Return list UploadResponse — satu item per sheet.

    Kalau `sheets` kosong: proses semua sheet.
    Kalau `sheets` diisi: proses hanya sheet yang disebutkan.
    """
    content = await file.read()

    try:
        ext = validate_file(file.filename, len(content))
        all_sheets = detect_sheets(content, ext)
    except FileValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    # Tentukan sheet mana yang diproses
    if sheets.strip():
        requested = [s.strip() for s in sheets.split(",") if s.strip()]
        invalid = [s for s in requested if s not in all_sheets]
        if invalid:
            raise HTTPException(
                status_code=400,
                detail=f"Sheet tidak ditemukan: {', '.join(invalid)}. "
                       f"Sheet tersedia: {', '.join(all_sheets)}",
            )
        target_sheets = requested
    else:
        target_sheets = all_sheets

    # Simpan file raw sekali
    saved_id, _ = save_raw_file(content, file.filename)

    results: list[UploadResponse] = []
    for sheet in target_sheets:
        sheet_name_arg = None if ext == ".csv" else sheet
        try:
            df, was_truncated, original_row_count = parse_dataset(content, ext, sheet_name_arg)
        except FileValidationError:
            # Sheet kosong / tidak bisa dibaca — skip, jangan gagalkan semua
            continue

        # Buat filename yang mencerminkan sheet
        display_name = (
            file.filename if len(target_sheets) == 1
            else f"{file.filename} [{sheet}]"
        )

        payload = build_dashboard_payload(
            df, saved_id, display_name, was_truncated, original_row_count
        )
        results.append(UploadResponse(**payload))

    if not results:
        raise HTTPException(status_code=422, detail="Semua sheet kosong atau tidak bisa dibaca.")

    return results