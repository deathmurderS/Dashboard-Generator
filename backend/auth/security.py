from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone

import bcrypt
from dotenv import load_dotenv
from jose import jwt

load_dotenv()

_PLACEHOLDER_SECRETS = {
    "",
    "dev-secret-change-in-production",
    "ubah-ini-jadi-string-random-panjang",
}
SECRET_KEY = os.getenv("SECRET_KEY", "").strip()
if SECRET_KEY in _PLACEHOLDER_SECRETS:
    raise RuntimeError(
        "SECRET_KEY belum dikonfigurasi. Set SECRET_KEY ke string acak yang kuat di environment."
    )
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def create_access_token(subject: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode({"sub": subject, "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)
