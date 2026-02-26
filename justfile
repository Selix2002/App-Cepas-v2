# justfile
set shell := ["bash", "-c"]

# --- Backend ---
backend:
    cd backend && source .venv/bin/activate && uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

# --- Frontend ---
frontend:
    cd frontend && npm run dev

# --- Ambos en terminales separados ---
dev:
    command -v gnome-terminal >/dev/null 2>&1 || { echo "ERROR: gnome-terminal no está instalado/en PATH."; exit 1; }
    gnome-terminal -- bash -lc "just backend; exec bash"
    gnome-terminal -- bash -lc "just frontend; exec bash"

