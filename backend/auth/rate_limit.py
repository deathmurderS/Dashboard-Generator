"""
backend/auth/rate_limit.py

Rate limiting sederhana in-memory berbasis sliding window.
Cukup untuk single-instance deployment. Untuk multi-instance,
ganti dengan Redis-backed limiter.

Pakai dependency FastAPI:
    @router.post("/login", dependencies=[Depends(rate_limit_login)])
"""

from __future__ import annotations

import time
from collections import defaultdict
from collections import deque

from fastapi import HTTPException, Request


class SlidingWindowLimiter:
    """
    Sliding window rate limiter per-key (biasanya IP atau email+IP).

    - max_requests: jumlah request maksimum dalam window
    - window_seconds: ukuran window dalam detik
    """

    def __init__(self, max_requests: int, window_seconds: int) -> None:
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    def check(self, key: str) -> None:
        now = time.monotonic()
        window_start = now - self.window_seconds
        bucket = self._hits[key]

        # Buang entry lama di luar window
        while bucket and bucket[0] < window_start:
            bucket.popleft()

        if len(bucket) >= self.max_requests:
            retry_after = int(self.window_seconds - (now - bucket[0]))
            raise HTTPException(
                status_code=429,
                detail=(
                    f"Terlalu banyak permintaan. Coba lagi dalam "
                    f"{max(retry_after, 1)} detik."
                ),
                headers={"Retry-After": str(max(retry_after, 1))},
            )

        bucket.append(now)


# ─── Limiter instances ──────────────────────────────────────────────────────
# Login: 5 percobaan per 60 detik per IP (cukup ketat untuk anti brute-force)
_login_limiter = SlidingWindowLimiter(max_requests=5, window_seconds=60)
# Register: 3 percobaan per 60 detik per IP (lebih ketat, anti spam akun)
_register_limiter = SlidingWindowLimiter(max_requests=3, window_seconds=60)
# Generic API: 60 request per 60 detik per IP
_api_limiter = SlidingWindowLimiter(max_requests=60, window_seconds=60)


def _client_ip(request: Request) -> str:
    """Ambil IP client, pertimbangkan X-Forwarded-For (di belakang proxy)."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        # Ambil IP pertama (paling dekat dengan client)
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def rate_limit_login(request: Request) -> None:
    """Dependency untuk rate limit endpoint login."""
    _login_limiter.check(f"login:{_client_ip(request)}")


def rate_limit_register(request: Request) -> None:
    """Dependency untuk rate limit endpoint register."""
    _register_limiter.check(f"register:{_client_ip(request)}")


def rate_limit_api(request: Request) -> None:
    """Dependency untuk rate limit endpoint API umum."""
    _api_limiter.check(f"api:{_client_ip(request)}")