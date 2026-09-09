from __future__ import annotations

import re

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from auth.deps import get_current_user
from auth.rate_limit import rate_limit_login, rate_limit_register
from auth.security import create_access_token, hash_password, verify_password
from database.db import get_db
from models.db_models import User
from models.schemas import Token, UserLogin, UserRegister, UserResponse, UserUpdate

router = APIRouter(prefix="/api/auth", tags=["auth"])


# ─── Validasi password ──────────────────────────────────────────────────────
def _validate_password(password: str) -> None:
    """Validasi password kuat. Raise HTTPException kalau lemah."""
    if not password or len(password) < 8:
        raise HTTPException(
            status_code=400,
            detail="Password minimal 8 karakter.",
        )
    if len(password) > 128:
        raise HTTPException(
            status_code=400,
            detail="Password maksimal 128 karakter.",
        )
    if not re.search(r"[A-Za-z]", password):
        raise HTTPException(
            status_code=400,
            detail="Password harus mengandung huruf.",
        )
    if not re.search(r"\d", password):
        raise HTTPException(
            status_code=400,
            detail="Password harus mengandung angka.",
        )


def _validate_email(email: str) -> str:
    """Validasi format email sederhana."""
    email = email.strip().lower()
    if not email or len(email) > 255:
        raise HTTPException(status_code=400, detail="Email tidak valid.")
    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        raise HTTPException(status_code=400, detail="Format email tidak valid.")
    return email


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=201,
    dependencies=[Depends(rate_limit_register)],
)
def register(payload: UserRegister, db: Session = Depends(get_db)) -> User:
    email = _validate_email(payload.email)
    _validate_password(payload.password)

    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="Email sudah terdaftar.")

    user = User(
        email=email,
        hashed_password=hash_password(payload.password),
        name=payload.name.strip() if payload.name else None,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post(
    "/login",
    response_model=Token,
    dependencies=[Depends(rate_limit_login)],
)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)) -> Token:
    email = form.username.strip().lower()
    user = db.query(User).filter(User.email == email).first()
    if user is None or not verify_password(form.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Email atau password salah.")
    return Token(access_token=create_access_token(user.id))


@router.post(
    "/login/json",
    response_model=Token,
    dependencies=[Depends(rate_limit_login)],
)
def login_json(payload: UserLogin, db: Session = Depends(get_db)) -> Token:
    email = payload.email.strip().lower()
    user = db.query(User).filter(User.email == email).first()
    if user is None or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Email atau password salah.")
    return Token(access_token=create_access_token(user.id))


@router.get("/me", response_model=UserResponse)
def me(user: User = Depends(get_current_user)) -> User:
    return user


@router.patch("/me", response_model=UserResponse)
def update_me(
    payload: UserUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> User:
    """Update profil user: nama, email, atau password."""
    if payload.name is not None:
        name = payload.name.strip()
        if not name:
            raise HTTPException(status_code=400, detail="Nama tidak boleh kosong.")
        user.name = name

    if payload.email is not None:
        email = _validate_email(payload.email)
        existing = db.query(User).filter(User.email == email, User.id != user.id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email sudah digunakan user lain.")
        user.email = email

    if payload.current_password is not None:
        if not verify_password(payload.current_password, user.hashed_password):
            raise HTTPException(status_code=400, detail="Password saat ini salah.")
        if payload.new_password is None:
            raise HTTPException(status_code=400, detail="Password baru wajib diisi.")
        _validate_password(payload.new_password)
        user.hashed_password = hash_password(payload.new_password)

    db.commit()
    db.refresh(user)
    return user
