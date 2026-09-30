"""One-Command Full-Stack Launcher for SIH26057 Sonar Detection System."""

import argparse
import os
import signal
import subprocess
import sys
import time
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

ROOT_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = ROOT_DIR / "frontend"


def get_python_exe() -> str:
    """Locates the project virtual environment python executable."""
    venv_win = ROOT_DIR / ".venv" / "Scripts" / "python.exe"
    venv_unix = ROOT_DIR / ".venv" / "bin" / "python"

    if venv_win.exists():
        return str(venv_win)
    elif venv_unix.exists():
        return str(venv_unix)
    return sys.executable


def main():
    parser = argparse.ArgumentParser(description="Start SIH26057 Sonar Detection Platform")
    parser.add_argument("--backend-port", type=int, default=8000, help="Backend port (default: 8000)")
    parser.add_argument("--frontend-port", type=int, default=5173, help="Frontend port (default: 5173)")
    args = parser.parse_args()

    python_exe = get_python_exe()

    print("=" * 75)
    print("🌊 SIH26057: AI-POWERED SIDE-SCAN SONAR DEBRIS & ANOMALY DETECTION SYSTEM")
    print("   Ministry of Earth Sciences (MoES) — Full-Stack Launcher")
    print("=" * 75)
    print(f"• Python Environment : {python_exe}")
    print(f"• Working Directory  : {ROOT_DIR}")
    print("=" * 75)

    processes: list[subprocess.Popen] = []

    try:
        # 1. Start FastAPI Backend
        print(f"\n[1/2] Launching FastAPI Backend on http://127.0.0.1:{args.backend_port}...")
        backend_cmd = [
            python_exe,
            "-m",
            "uvicorn",
            "backend.main:app",
            "--host",
            "127.0.0.1",
            "--port",
            str(args.backend_port),
        ]
        backend_proc = subprocess.Popen(backend_cmd, cwd=str(ROOT_DIR))
        processes.append(backend_proc)

        # Allow backend to initialize database tables
        time.sleep(2)

        # 2. Start Vite Frontend
        print(f"[2/2] Launching React + Vite Frontend on http://localhost:{args.frontend_port}...")
        frontend_proc = subprocess.Popen(
            "npm run dev",
            cwd=str(FRONTEND_DIR),
            shell=True,
        )
        processes.append(frontend_proc)

        print("\n" + "=" * 75)
        print("✅ SYSTEM READY & RUNNING!")
        print(f"   • Frontend Dashboard : http://localhost:{args.frontend_port}")
        print(f"   • Backend API Health : http://127.0.0.1:{args.backend_port}/api/health")
        print(f"   • Swagger API Docs   : http://127.0.0.1:{args.backend_port}/docs")
        print("=" * 75)
        print("Press Ctrl+C to stop both backend and frontend servers...\n")

        while True:
            time.sleep(1)

    except KeyboardInterrupt:
        print("\n\n🛑 Shutting down SonarVision services...")
    finally:
        for p in processes:
            try:
                if sys.platform == "win32":
                    p.terminate()
                else:
                    p.send_signal(signal.SIGINT)
            except Exception:
                pass
        print("Done. Goodbye!")


if __name__ == "__main__":
    main()
