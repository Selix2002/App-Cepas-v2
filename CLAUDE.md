# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Full-stack microbiological strain (cepa) management system with AI-powered semantic search. Users can manage bacterial strain data, visualize it via charts/maps, and query it via a natural language chat interface backed by Groq LLM + sentence-transformers embeddings.

## Commands

### Development (recommended)
```bash
just dev        # Launches both frontend and backend in separate terminal windows
just backend    # Backend only (activates venv, runs uvicorn)
just frontend   # Frontend only (npm run dev)
```

### Backend (from `backend/`)
```bash
uv sync                                  # Install Python dependencies
uvicorn app.main:app --reload            # Start dev server (port 8000)
```

### Frontend (from `frontend/`)
```bash
npm install       # Install dependencies
npm run dev       # Start Vite dev server (port 5173)
npm run build     # TypeScript check + production build
npm run lint      # ESLint
```

## Architecture

### Backend (Python, Litestar framework)
- **Framework**: Litestar (not FastAPI) — uses `@get`, `@post`, etc. decorators on controller classes
- **Database**: MongoDB via Beanie ODM + Motor async driver (`cepas_db`)
- **Auth**: JWT (PyJWT) + OAuth2 with `admin_guard` for protected endpoints
- **Rate limiting**: Redis-backed middleware on `/auth/login` (5 req/60s)
- **API docs**: `/schema` (Scalar UI)

**Layer structure**: `routes_*.py` controllers → `*_service.py` services → `repositories/` → Beanie models

**Key files**:
- `app/main.py` — app factory, CORS, middleware, route registration
- `app/models/models.py` — `Cepa` and `User` Beanie documents
- `app/dtos/dtos.py` — all Pydantic DTOs for cepas API
- `app/core/config.py` — settings (loaded from `.env`)
- `app/core/security.py` — JWT creation/validation, `admin_guard`

### AI/Chat subsystem (`app/services/`)
- `llm_service.py` — Groq API integration; two modes:
  - **Complete mode** (≤50 strains): sends full strain data as context
  - **Hybrid mode** (>50 strains): sends summary + semantically relevant strains
- `embedding_service.py` — singleton wrapping `sentence-transformers` (`all-MiniLM-L6-v2`); cosine similarity search
- `dbSearch_service.py` — fetches strains from MongoDB, runs semantic search with threshold filtering

**Config knobs** (in `.env` / `config.py`): `GROQ_MODEL`, `MAX_CONTEXT_CEPAS` (30), `SIMILARITY_THRESHOLD` (0.3), `LLM_TEMPERATURE` (0.2), `LLM_MAX_TOKENS` (500)

### Frontend (React 19 + TypeScript + Vite)
- **Routing**: React Router v7, lazy-loaded pages, `PrivateRoute` wrapper
- **Server state**: TanStack React Query
- **Tables**: ag-grid-react (main data grid with inline cell editing)
- **Forms**: React Hook Form
- **Auth**: `AuthContext` (context + `useAuth` hook) stored in `features/auth/store/`

**Feature-based structure** under `src/features/`:
- `auth/` — login page, JWT session management, auth context
- `cepas/` — main CRUD UI: `HomePage` (ag-grid table), `NewCepaPage`, `NewAtributePage`; business logic lives in `hooks/`
- `users/` — admin user management page
- `dashboard/` — map (Leaflet), bar chart, pie chart (Nivo)

**API proxy**: Vite proxies `/api` → `http://127.0.0.1:8000` in dev

## Environment Setup

Backend requires a `.env` file in `backend/`:
```
GROQ_API_KEY=...
GROQ_MODEL=llama-3.1-8b-instant
LOG_LEVEL=DEBUG
```

MongoDB must be running locally on `mongodb://localhost:27017`. Redis must be running for login rate limiting.

## Data Model

The `Cepa` document has a fixed schema plus `extra="allow"` (dynamic fields). Key field groups:
- Identification: `cepa` (unique), `codigo_lab`, `origen`, `latitud`, `longitud`
- Morphology: `gram`, `morfologia_1`, `morfologia_2`, `pigmentacion`
- Enzymatic tests (9): `lecitinasa`, `ureasa`, `lipasa`, `amilasa`, `proteasa`, `catalasa`, `celulasa`, `fosfatasa`, `aia`
- Temperature tests: `temp_5c`, `temp_25c`, `temp_37c`
- Antibiotic resistance (9): `amp`, `ctx`, `cxm`, `caz`, `ak`, `c`, `te`, `am_ecoli`, `am_saureus`
- AI field: `embedding` (float array, generated via `/chat/embeddings/generate`)
