# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**DB Cepas** is a full-stack application for managing microbiological strains (cepas). It has a Python/Litestar backend with MongoDB and a React/TypeScript frontend.

## Development Commands

### Running the App

```bash
# Both frontend and backend in separate terminal windows (requires gnome-terminal)
just dev

# Backend only
just backend
# Equivalent: cd backend && source .venv/bin/activate && uvicorn app.main:app --reload

# Frontend only
just frontend
# Equivalent: cd frontend && npm run dev
```

### Frontend

```bash
cd frontend
npm run dev        # Dev server (http://localhost:5173)
npm run build      # TypeScript check + Vite build
npm run lint       # ESLint
npm run preview    # Preview production build
```

### Backend

```bash
cd backend
uv sync                          # Install dependencies
uvicorn app.main:app --reload    # Dev server (http://localhost:8000)
python seed_admin.py             # Seed admin user
python temp/load_data.py         # Load seed data
python temp/clear_db.py          # Clear database
```

API docs available at `http://localhost:8000/schema` (Scalar UI).

## Environment Setup

**Backend** (`backend/.env`):
- `GROQ_API_KEY` — Groq API key for AI integration
- `GROQ_MODEL` — LLM model (default: `llama-3.1-8b-instant`)
- `LOG_LEVEL` — Logging level
- MongoDB URI defaults to `mongodb://localhost:27017`, DB name to `cepas_db`
- JWT secret defaults to `secret123` (change in production)

**Frontend** (`.env.development` / `.env.production`):
- `VITE_API_URL` — Backend base URL (default: `http://127.0.0.1:8000`)

## Architecture

### Backend (`backend/app/`)

Follows a layered architecture: **Routes → Services → Repositories → Models**

- `main.py` — Litestar ASGI app, registers controllers, CORS, OpenAPI config, startup hooks
- `api/` — HTTP controllers (`routes_cepas.py`, `routes_users.py`, `routes_auth.py`)
- `services/` — Business logic layer
- `repositories/` — Data access layer using Beanie ODM
- `models/models.py` — MongoDB documents: `User` (username, password, is_admin, hidden_columns) and `Cepa` (50+ optional fields: identification, location, morphology, enzymes, temperature responses, antibiotics, genetic data)
- `schema/` — Pydantic DTOs for request/response validation
- `core/` — Config (Pydantic Settings), DB init (Beanie/Motor), JWT security, Redis rate limiting

Auth uses OAuth2 Password Bearer JWTs. The `admin_guard` in `core/security.py` protects admin-only endpoints. Redis rate limits login attempts via `middleware/login_rate_limit.py`.

### Frontend (`frontend/src/`)

Feature-based structure under `features/`:

- **`auth/`** — Login page, JWT token management, `AuthContext` (React Context) for global auth state
- **`cepas/`** — Main feature: table, charts, map, new cepa/attribute forms
  - `hooks/table/useCepasTableCore.ts` — Unified hook for table data, filtering, sorting, inline editing
  - `hooks/charts/useCepasCharts.ts` — Data transformation for Nivo charts
  - `hooks/map/useCepasMap.ts` — Map data with coordinate filtering
  - `components/CepasTable/` — Table UI components (ag-grid based)
- **`users/`** — User management (admin only): list, create, update, delete users
- **`dashboard/`** — Shared chart and map components (Nivo, Leaflet)
- **`shared/`** — API client (`shared/services/api.ts` using Axios), reusable components, types

**State management**:
- `AuthContext` for auth state
- TanStack React Query for server state (cepa/user data)
- React Hook Form for form state

**Routing** (`app/router/AppRouter.tsx`): lazy-loaded routes, `PrivateRoute` wrapper for protected pages. Routes: `/login`, `/home`, `/home/addcepa`, `/home/addatribute`, `/home/UserManagement`.
