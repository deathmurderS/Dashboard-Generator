#!/usr/bin/env python3
"""
check.py — Automation Check untuk Dashboard Generator

Menjalankan serangkaian diagnostic check untuk mendeteksi kendala:
  • Environment (Python, Node, Docker, PostgreSQL)
  • Backend (dependencies, imports, konfigurasi)
  • Frontend (dependencies, build config)
  • Code quality (syntax, print, TODO, security)
  • Database connectivity

Usage:
    python3 check.py             # Full check
    python3 check.py --fix       # Auto-fix beberapa issue umum
"""

import importlib
import os
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path

# ─── ANSI Colors ──────────────────────────────────────────────────────────────
GREEN = "\033[92m"
YELLOW = "\033[93m"
RED = "\033[91m"
CYAN = "\033[96m"
BOLD = "\033[1m"
DIM = "\033[2m"
RESET = "\033[0m"

# ─── Paths ────────────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent
BACKEND_DIR = BASE_DIR / "backend"
FRONTEND_DIR = BASE_DIR / "frontend"


class Stats:
    passed = 0
    failed = 0
    warnings = 0
    skipped = 0

    @property
    def total(self):
        return self.passed + self.failed + self.warnings + self.skipped


stats = Stats()
start_time = time.time()


# ─── Formatting ───────────────────────────────────────────────────────────────

def _hdr(title: str):
    print(f"\n{CYAN}{'='*70}{RESET}")
    print(f"{CYAN}{BOLD}  {title}{RESET}")
    print(f"{CYAN}{'='*70}{RESET}")


def _log(status: str, label: str, detail: str = ""):
    sym = {
        "PASS": f"{GREEN}✓ PASS{RESET}",
        "FAIL": f"{RED}✗ FAIL{RESET}",
        "WARN": f"{YELLOW}⚠ WARN{RESET}",
        "SKIP": f"{DIM}– SKIP{RESET}",
        "INFO": f"{CYAN}ℹ INFO{RESET}",
    }
    d = f" — {detail}" if detail else ""
    print(f"  {sym.get(status, status)}  {label}{d}")


def _check(ok: bool, label: str, ok_d: str = "", fail_d: str = ""):
    if ok:
        stats.passed += 1
        _log("PASS", label, ok_d)
    else:
        stats.failed += 1
        _log("FAIL", label, fail_d)
    return ok


def _warn(label: str, detail: str = ""):
    stats.warnings += 1
    _log("WARN", label, detail)


def _skip(label: str, detail: str = ""):
    stats.skipped += 1
    _log("SKIP", label, detail)


def _info(label: str, detail: str = ""):
    _log("INFO", label, detail)


# ─── Utilities ────────────────────────────────────────────────────────────────

def _run(cmd: list[str], timeout: int = 30) -> tuple[int, str, str]:
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        return r.returncode, r.stdout.strip(), r.stderr.strip()
    except FileNotFoundError:
        return -1, "", "Command not found"
    except subprocess.TimeoutExpired:
        return -2, "", "Timeout"


def _exists(path: Path) -> bool:
    return path.exists()


def _read(path: Path) -> str:
    try:
        return path.read_text()
    except Exception:
        return ""


def _py_bin() -> str:
    """Python binary — pakai .venv kalau ada."""
    v = BACKEND_DIR / ".venv" / "bin" / "python"
    return str(v) if v.exists() else sys.executable


def _pip_show(pkg: str) -> bool:
    rc, _, _ = _run([_py_bin(), "-m", "pip", "show", pkg])
    return rc == 0


def _npm_installed(pkg: str) -> bool:
    return (FRONTEND_DIR / "node_modules" / pkg / "package.json").exists()


# ═══════════════════════════════════════════════════════════════════════════════
#  1. ENVIRONMENT
# ═══════════════════════════════════════════════════════════════════════════════

def check_environment():
    _hdr("1. ENVIRONMENT")

    v = sys.version_info
    _check(v >= (3, 10), "Python version", f"{v.major}.{v.minor}.{v.micro}",
           f"{v.major}.{v.minor}.{v.micro} — minimal 3.10")

    venv_py = BACKEND_DIR / ".venv" / "bin" / "python"
    _check(venv_py.exists(), "Python virtual env (.venv)",
           "", "Run: cd backend && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt")

    rc, out, _ = _run(["node", "--version"])
    if rc == 0:
        ver = out.lstrip("v")
        ok = tuple(int(x) for x in ver.split(".")) >= (18,)
        _check(ok, "Node.js >= 18", f"{out}", f"{out} — minimal 18")
    else:
        _check(False, "Node.js", "", "Node.js tidak ditemukan")

    rc, out, _ = _run(["docker", "--version"])
    docker_ok = rc == 0
    _check(docker_ok, "Docker", out or "", "Docker tidak ditemukan")

    if docker_ok:
        rc, out, _ = _run(["docker", "ps", "--filter", "name=dashboard_generator_db",
                           "--format", "{{.Names}}"])
        _check("dashboard_generator_db" in out, "PostgreSQL container running",
               "", "Jalankan: cd backend && docker compose up -d")
    else:
        _skip("PostgreSQL container", "Docker tidak tersedia")


# ═══════════════════════════════════════════════════════════════════════════════
#  2. BACKEND
# ═══════════════════════════════════════════════════════════════════════════════

def check_backend():
    _hdr("2. BACKEND")

    _check(BACKEND_DIR.is_dir(), "Directory backend/")
    _check(_exists(BACKEND_DIR / "requirements.txt"), "requirements.txt")

    env_f = BACKEND_DIR / ".env"
    env_ex = BACKEND_DIR / ".env.example"
    if _exists(env_f):
        _info(".env", "Exists")
        body = _read(env_f)
        placeholders = {"", "ubah-ini-jadi-string-random-panjang", "dev-secret-change-in-production"}
        _check(any(
            l.startswith("SECRET_KEY=") and l.split("=", 1)[1].strip() not in placeholders
            for l in body.splitlines()
        ), "SECRET_KEY configured", "", "Gunakan string random yang kuat!")
        _check(any(l.startswith("DATABASE_URL=") for l in body.splitlines()),
               "DATABASE_URL configured", "", "Tidak ditemukan di .env")
    else:
        _warn(".env file", "Copy dari .env.example")

    _hdr("   Backend Dependencies (.venv)")
    reqs = ["fastapi", "uvicorn", "pandas", "openpyxl", "python-multipart",
            "pydantic", "sqlalchemy", "psycopg2-binary", "python-dotenv",
            "bcrypt", "python-jose", "aiofiles"]
    all_ok = True
    for p in reqs:
        ok = _pip_show(p)
        if not ok:
            all_ok = False
            _check(ok, p, "", f"cd backend && .venv/bin/pip install {p}")
    if all_ok:
        _log("PASS", f"All {len(reqs)} packages installed", "via .venv")

    _hdr("   Backend Imports (.venv)")
    modules = [
        "analyzer.detector", "analyzer.charts", "analyzer.kpi", "analyzer.quality",
        "api.auth", "api.upload", "api.dashboards",
        "auth.deps", "auth.security",
        "database.db",
        "models.db_models", "models.schemas",
        "services.dashboard_service", "services.file_service",
    ]
    import_script = "\n".join(f"import {m}" for m in modules)
    python = _py_bin()
    rc, out, err = _run([python, "-c", f"import sys; sys.path.insert(0, '{BACKEND_DIR}'); {import_script}; print('OK')"])
    if rc == 0 and out == "OK":
        _log("PASS", f"All {len(modules)} modules imported", "via .venv")
    else:
        err_lines = err.splitlines()
        failed_imports = {}
        for line in err_lines:
            m = re.search(r"ModuleNotFoundError: No module named '([^']+)'", line)
            if m:
                failed_imports[m.group(1)] = line
            m2 = re.search(r"cannot import name '([^']+)' from '([^']+)'", line)
            if m2:
                failed_imports[m2.group(2)] = line
        for mod in modules:
            if mod in failed_imports:
                stats.failed += 1
                _log("FAIL", f"import {mod}", failed_imports[mod])
            elif any(failed_key in mod for failed_key in failed_imports):
                pass
        if not any(mod in str(out+err) for mod in modules):
            _log("FAIL", "Backend imports", err[:200] if err else "Unknown error")

    _hdr("   Python Syntax Check")
    py_files = [f for f in BACKEND_DIR.rglob("*.py") if ".venv" not in f.parts]
    errors = 0
    for f in py_files:
        try:
            compile(_read(f), str(f), "exec")
        except SyntaxError as e:
            errors += 1
            _log("FAIL", f"Syntax in {f.relative_to(BASE_DIR)}", str(e))
    _check(errors == 0, f"Syntax — {len(py_files)} files", "All clean", f"{errors} error(s)")


# ═══════════════════════════════════════════════════════════════════════════════
#  3. FRONTEND
# ═══════════════════════════════════════════════════════════════════════════════

def check_frontend():
    _hdr("3. FRONTEND")

    _check(FRONTEND_DIR.is_dir(), "Directory frontend/")
    _check(_exists(FRONTEND_DIR / "package.json"), "package.json")

    nm = FRONTEND_DIR / "node_modules"
    _check(nm.is_dir(), "node_modules", "", "Jalankan: cd frontend && npm install")

    fe_env = FRONTEND_DIR / ".env"
    fe_ex = FRONTEND_DIR / ".env.example"
    if not _exists(fe_env) and _exists(fe_ex):
        _warn("Frontend .env", "Copy dari .env.example")
    elif _exists(fe_env):
        _info("Frontend .env", "Exists")

    if nm.is_dir():
        _hdr("   Frontend Dependencies")
        pkgs = ["react", "react-dom", "react-router-dom", "recharts",
                "lucide-react", "papaparse", "xlsx",
                "@dnd-kit/core", "@dnd-kit/sortable", "html-to-image"]
        dev = ["vite", "@vitejs/plugin-react", "tailwindcss"]
        all_ok = True
        for p in pkgs + dev:
            ok = _npm_installed(p)
            if not ok:
                all_ok = False
                _check(ok, p, "", f"cd frontend && npm install {p}")
        if all_ok:
            _log("PASS", f"All {len(pkgs)+len(dev)} packages installed")

    _check(_exists(FRONTEND_DIR / "vite.config.js"), "vite.config.js")
    _check(_exists(FRONTEND_DIR / "index.html"), "index.html")
    _check(_exists(FRONTEND_DIR / "main.jsx"), "main.jsx")


# ═══════════════════════════════════════════════════════════════════════════════
#  4. CODE QUALITY
# ═══════════════════════════════════════════════════════════════════════════════

def check_code_quality():
    _hdr("4. CODE QUALITY")

    py_files = [f for f in BACKEND_DIR.rglob("*.py") if ".venv" not in f.parts]

    _hdr("   Common Issues")
    found_print = 0
    for f in py_files:
        content = _read(f)
        for i, line in enumerate(content.splitlines(), 1):
            s = line.strip()
            if s.startswith("print("):
                found_print += 1
                if found_print <= 3:
                    _warn(f"print() in {f.relative_to(BASE_DIR)}:{i}", s[:80])
    if found_print == 0:
        _log("PASS", "No stray print() statements")

    todos = 0
    for f in py_files:
        content = _read(f)
        for line in content.splitlines():
            if "TODO" in line or "FIXME" in line:
                todos += 1
    if todos > 0:
        _warn(f"TODO/FIXME markers", f"{todos} ditemukan di Python files")
    else:
        _log("PASS", "No TODO/FIXME markers")

    _hdr("   Security Scan")
    sec_patterns = [
        ("password", r'password\s*=\s*["\'][^"\']'),
        ("secret key", r'secret_key\s*=\s*["\'][^"\']'),
        ("api key", r'api_key\s*=\s*["\']'),
    ]
    sec_found = 0
    for f in py_files:
        content = _read(f)
        for label, pat in sec_patterns:
            for m in re.finditer(pat, content, re.IGNORECASE):
                ln = content[:m.start()].count("\n") + 1
                sec_found += 1
                if sec_found <= 3:
                    _warn(f"Possible {label} in {f.relative_to(BASE_DIR)}:{ln}",
                          "Gunakan env variable, jangan hardcode")
    if sec_found == 0:
        _log("PASS", "No hardcoded credentials in backend code")

    _hdr("   Cross-Reference Check")
    app_jsx = FRONTEND_DIR / "App.jsx"
    if _exists(app_jsx):
        body = _read(app_jsx)
        imps = re.findall(r"from\s+['\"](.+?)['\"]", body)
        missing = 0
        for imp in imps:
            if imp.startswith("."):
                candidates = [
                    FRONTEND_DIR / f"{imp}.jsx",
                    FRONTEND_DIR / f"{imp}/index.jsx",
                    FRONTEND_DIR / f"{imp}.js",
                    FRONTEND_DIR / f"{imp}/index.js",
                ]
                if not any(p.exists() for p in candidates):
                    missing += 1
                    if missing <= 5:
                        _warn(f"Import not found: {imp}")
        if missing == 0:
            _log("PASS", "All frontend imports resolve")


# ═══════════════════════════════════════════════════════════════════════════════
#  5. DATABASE
# ═══════════════════════════════════════════════════════════════════════════════

def check_database():
    _hdr("5. DATABASE")

    python = _py_bin()
    rc, out, err = _run([python, "-c", "import psycopg2; print('ok')"])
    _check(rc == 0, "psycopg2 install", "", "Ada di .venv? Cek: backend/.venv/bin/pip list | grep psycopg2")

    if rc == 0:
        # Gunakan database.db yang sudah punya auto-fallback logic
        test_script = f"""
import sys; sys.path.insert(0, '{BACKEND_DIR}')
import io
# Redirect stdout to capture [DB] messages
old_stdout = sys.stdout
sys.stdout = io.StringIO()

from database.db import engine, inspect

# Get the [DB] log messages
db_log = sys.stdout.getvalue()
sys.stdout = old_stdout

# Check connection
insp = inspect(engine)
tables = insp.get_table_names()
print(f'DB_LOG={{db_log.strip().replace(chr(10), " | ")}}')
print(f'TABLES={{",".join(tables) if tables else "NONE"}}')
"""
        rc, out, _ = _run([python, "-c", test_script])
        db_log = ""
        has_tables = False
        for line in out.splitlines():
            if line.startswith("DB_LOG="):
                db_log = line.split("=", 1)[1]
            elif line.startswith("TABLES="):
                raw = line.split("=", 1)[1]
                has_tables = raw and raw != "NONE"

        if has_tables:
            # Show which DB is being used
            if "falling back" in db_log:
                _log("PASS", "Database connection", "Connected (fallback: Docker lokal)")
                _info("Supabase (primary)", "Unreachable (IPv6) — using Docker local")
            elif "Using primary" in db_log:
                _log("PASS", "Database connection", "Connected (primary: Supabase)")
            else:
                _log("PASS", "Database connection", "Connected successfully")

            # Show tables
            for line in out.splitlines():
                if line.startswith("TABLES="):
                    raw = line.split("=", 1)[1]
                    if raw and raw != "NONE":
                        _info("Database tables", raw.replace(",", ", "))

            # Count data
            count_script = f"""
import sys; sys.path.insert(0, '{BACKEND_DIR}')
from database.db import SessionLocal
from models.db_models import User, Dashboard
db = SessionLocal()
try:
    uc = db.query(User).count()
    dc = db.query(Dashboard).count()
    print(f'USERS={{uc}}')
    print(f'DASHBOARDS={{dc}}')
    if uc > 0:
        emails = [u.email for u in db.query(User).all()]
        print(f'USER_EMAILS={{",".join(emails)}}')
finally:
    db.close()
"""
            rc2, out2, _ = _run([python, "-c", count_script])
            for line2 in out2.splitlines():
                if line2.startswith("USERS="):
                    uc = int(line2.split("=")[1])
                    _info("Users in DB", str(uc))
                elif line2.startswith("DASHBOARDS="):
                    dc = int(line2.split("=")[1])
                    _info("Dashboards in DB", str(dc))
                elif line2.startswith("USER_EMAILS="):
                    emails = line2.split("=", 1)[1]
                    _info("Registered users", emails.replace(",", ", "))
        else:
            _log("FAIL", "Database connection", "Tabel tidak ditemukan — jalankan backend dulu (init_db())")
    else:
        _skip("Database connection", "psycopg2 tidak terinstall")


# ═══════════════════════════════════════════════════════════════════════════════
#  6. NETWORK
# ═══════════════════════════════════════════════════════════════════════════════

def check_network():
    _hdr("6. NETWORK & PORTS")

    for port, name, cmd_hint in [
        (8000, "Backend (uvicorn)", "cd backend && .venv/bin/uvicorn main:app --reload --port 8000"),
        (5173, "Frontend (vite)", "cd frontend && npm run dev"),
        (5434, "PostgreSQL (docker)", "cd backend && docker compose up -d"),
    ]:
        rc, out, _ = _run(["ss", "-tlnp", "sport", f"=:{port}"])
        if "LISTEN" in out:
            _info(f"Port {port} ({name})", "Listening")
        else:
            if port == 5434:
                rc2, out2, _ = _run(["docker", "ps", "--filter", "name=dashboard_generator_db",
                                     "--format", "{{.Ports}}"])
                if "5434" in out2 or "0.0.0.0:5434" in out2:
                    _info(f"Port {port} ({name})", "Active via Docker (port mapping)")
                    continue
            _warn(f"Port {port} ({name})", f"Belum jalan — {cmd_hint}")

    rc, _, _ = _run(["curl", "-s", "--connect-timeout", "3", "https://google.com"])
    _check(rc == 0, "Internet connectivity", "", "Tidak ada koneksi internet")


# ═══════════════════════════════════════════════════════════════════════════════
#  7. GIT
# ═══════════════════════════════════════════════════════════════════════════════

def check_git():
    _hdr("7. GIT STATUS")

    rc, out, _ = _run(["git", "status", "--porcelain"])
    if rc != 0:
        _warn("Git repository", "Bukan git repo / git tidak tersedia")
        return

    _info("Git", "Initialized")
    if out:
        n = len([l for l in out.splitlines() if l.strip()])
        _warn("Uncommitted changes", f"{n} file(s) modified")
    else:
        _log("PASS", "Working tree clean")

    rc2, rem, _ = _run(["git", "remote", "-v"])
    if rc2 == 0 and rem:
        _info("Git remote", rem.splitlines()[0] if rem else "")


# ═══════════════════════════════════════════════════════════════════════════════
#  8. DOCKER COMPOSE
# ═══════════════════════════════════════════════════════════════════════════════

def check_docker_compose():
    _hdr("8. DOCKER COMPOSE")

    dc = BACKEND_DIR / "docker-compose.yml"
    if not _exists(dc):
        _check(False, "docker-compose.yml", "", "File tidak ditemukan")
        return

    _info("File", "Exists")
    dc_body = _read(dc)
    env_body = _read(BACKEND_DIR / ".env") if _exists(BACKEND_DIR / ".env") else ""

    m = re.search(r'"(\d+):5432"', dc_body)
    dc_port = m.group(1) if m else "5434"

    env_port = "5434"
    env_host = "localhost"
    for line in env_body.splitlines():
        if line.startswith("DATABASE_URL="):
            pm = re.search(r":(\d+)/", line)
            if pm:
                env_port = pm.group(1)
            # Check if it's Supabase (remote)
            if "supabase" in line.lower():
                env_host = "supabase"

    if env_host == "supabase":
        # .env指向Supabase (port 5432), Docker lokal port 5434 — ini normal
        _info("Database target", f"Supabase (port {env_port}) — Docker lokal (port {dc_port}) untuk fallback")
        _log("PASS", "Port mapping", "Dual config: Supabase :5432 + Docker :5434")
    else:
        _check(dc_port == env_port, "Port mapping",
               f"Port {dc_port}", f"docker-compose :{dc_port} vs .env :{env_port}")


# ═══════════════════════════════════════════════════════════════════════════════
#  9. TEST SCRIPT
# ═══════════════════════════════════════════════════════════════════════════════

def check_test_script():
    _hdr("9. TEST SCRIPT")

    tf = BASE_DIR / "test_dashboard.py"
    if not _exists(tf):
        _warn("test_dashboard.py", "Tidak ditemukan")
        return

    body = _read(tf)
    if "Dashboard_Generator_2" in body:
        _warn("test_dashboard.py references old path", "Ganti Dashboard_Generator_2 ke Dashboard-Generator")
    else:
        _log("PASS", "Paths correct")


# ═══════════════════════════════════════════════════════════════════════════════
#  SUMMARY
# ═══════════════════════════════════════════════════════════════════════════════

def print_summary():
    elapsed = time.time() - start_time
    _hdr("SUMMARY")

    print(f"\n  {BOLD}Results:{RESET}")
    print(f"    {GREEN}✓ Passed:  {stats.passed}{RESET}")
    print(f"    {RED}✗ Failed:  {stats.failed}{RESET}")
    print(f"    {YELLOW}⚠ Warnings: {stats.warnings}{RESET}")
    print(f"    {DIM}– Skipped: {stats.skipped}{RESET}")
    print(f"    Total:    {stats.total}")
    print(f"\n  {BOLD}Time:{RESET} {elapsed:.1f}s")

    if stats.failed > 0:
        print(f"\n  {RED}{BOLD}  ❌ {stats.failed} check(s) FAILED — perlu diperbaiki.{RESET}")
    elif stats.warnings > 0:
        print(f"\n  {YELLOW}{BOLD}  ⚠  Ada {stats.warnings} warning(s) — disarankan dicek.{RESET}")
    else:
        print(f"\n  {GREEN}{BOLD}  ✅ Semua check PASS — aplikasi siap dijalankan!{RESET}")

    print(f"\n  {CYAN}Quick start:{RESET}")
    print(f"    {DIM}1.{RESET} cd backend && docker compose up -d                 {DIM}# PostgreSQL{RESET}")
    print(f"    {DIM}2.{RESET} cd backend && .venv/bin/uvicorn main:app --reload  {DIM}# Backend (port 8000){RESET}")
    print(f"    {DIM}3.{RESET} cd frontend && npm run dev                         {DIM}# Frontend (port 5173){RESET}")
    print(f"    {DIM}4.{RESET} python3 test_dashboard.py                          {DIM}# Run test{RESET}")
    print(f"\n  {DIM}INFO: Sistem ini menggunakan `python3` (bukan `python`).{RESET}")
    print(f"  {DIM}INFO: Backend siap dengan .venv. Jalankan: backend/.venv/bin/python atau python3{RESET}")
    print(f"  {DIM}INFO: Install paket baru: cd backend && .venv/bin/pip install <package>{RESET}")
    print()


# ═══════════════════════════════════════════════════════════════════════════════
#  AUTO-FIX
# ═══════════════════════════════════════════════════════════════════════════════

def fix_issues():
    _hdr("AUTO-FIX")
    fixed = 0

    for d in [BACKEND_DIR / "analyzer", BACKEND_DIR / "api", BACKEND_DIR / "auth",
              BACKEND_DIR / "database", BACKEND_DIR / "models", BACKEND_DIR / "services"]:
        init = d / "__init__.py"
        if not _exists(init):
            init.write_text(f'"""\n{d.name} package\n"""\n')
            print(f"  {GREEN}✓ Created{RESET} {init.relative_to(BASE_DIR)}")
            fixed += 1

    env_f = BACKEND_DIR / ".env"
    env_ex = BACKEND_DIR / ".env.example"
    if not _exists(env_f) and _exists(env_ex):
        shutil.copy(str(env_ex), str(env_f))
        print(f"  {GREEN}✓ Created{RESET} .env from .env.example")
        fixed += 1

    for s in BASE_DIR.glob("*.sh"):
        if not os.access(s, os.X_OK):
            os.chmod(s, 0o755)
            print(f"  {GREEN}✓ Made executable{RESET} {s.name}")
            fixed += 1

    if fixed == 0:
        print(f"  {GREEN}✓ No fixes needed{RESET}")
    else:
        print(f"\n  {GREEN}{BOLD}Fixed {fixed} issue(s){RESET}")


# ═══════════════════════════════════════════════════════════════════════════════
#  MAIN
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    fix_mode = "--fix" in sys.argv

    print(f"\n{BOLD}{CYAN}  ╔══════════════════════════════════════════════════════════╗{RESET}")
    print(f"{BOLD}{CYAN}  ║     DASHBOARD GENERATOR — AUTOMATION CHECK              ║{RESET}")
    print(f"{BOLD}{CYAN}  ╚══════════════════════════════════════════════════════════╝{RESET}")
    print(f"\n  {DIM}{time.strftime('%Y-%m-%d %H:%M:%S')}  |  {BASE_DIR}{RESET}\n")

    if fix_mode:
        fix_issues()
        return

    check_environment()
    check_backend()
    check_frontend()
    check_code_quality()
    check_database()
    check_network()
    check_git()
    check_docker_compose()
    check_test_script()
    print_summary()

    if stats.failed > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()