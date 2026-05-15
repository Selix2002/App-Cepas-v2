# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

App-Cepas-v2 is a web application for managing and exploring microbiological strains collected from water bodies in Patagonia. It features a data table, maps, charts, and an optional AI chat module for natural-language queries over the strain database.

## Development Commands

### Quick Start (requires `just`)
```bash
just dev       # Launch both backend and frontend in separate terminals
just backend   # Backend only
just frontend  # Frontend only
```

### Backend (`/backend`)
```bash
uv sync                          # Install dependencies
uvicorn app.main:app --reload    # Run dev server (http://localhost:8000)
uv run python -m tests.run_tests # Run tests
uv run python -m scripts.seed_admin --username admin --password <pw>  # Create admin user
```
Requires Python 3.13 (see `.python-version`), MongoDB 6+, and Redis 7+ running locally.

### Frontend (`/frontend`)
```bash
npm install    # Install dependencies
npm run dev    # Dev server (http://localhost:5173)
npm run build  # Production build (TypeScript + Vite)
npm run lint   # ESLint
```

### API Documentation
OpenAPI/Scalar UI is served at `http://localhost:8000/schema` when the backend is running.

## Architecture

### Monorepo Structure
```
App-Cepas-v2/
├── backend/    # Python Litestar API
└── frontend/   # React + TypeScript SPA
```

### Backend Stack
- **Framework:** Litestar (async Python)
- **Database:** MongoDB 6+ via Beanie ODM (Motor async driver)
- **Auth:** JWT Bearer tokens, `admin_guard` decorator for admin-only routes
- **Cache / Rate Limiting:** Redis — login: 5 req/min per IP, chat: 10 req/min per user
- **AI Module:** Optional (`IA_ENABLED=true` in `.env`), uses Groq API + sentence-transformers embeddings

Backend layers: `api/` (controllers) → `services/` (business logic) → `repositories/` (data access) → `models/` (Beanie documents).

Key directories:
```
backend/app/
├── api/           # Litestar controllers
├── core/          # Config, DB init, security, Redis, logging
├── models/        # Beanie models (User, Cepa, ChatFeedback)
├── repositories/  # MongoDB query layer
├── schema/        # Pydantic DTOs
├── services/      # Business logic
└── ia/            # AI chat module
    ├── router.py
    └── services/chat/   # query_parser, llm, mql_executor, schema, dbSearch
```

### Frontend Stack
- **React 19** + **TypeScript 5.8**, built with **Vite 6**
- **Routing:** React Router v7
- **Data fetching:** Axios + TanStack React Query
- **Tables:** ag-Grid (community) + React Table
- **Charts:** Nivo | **Maps:** Leaflet | **Export:** ExcelJS + html2canvas-pro
- **Styling:** TailwindCSS

State management:
- `AuthContext` (React Context + localStorage) for auth/JWT
- `ThemeContext` for dark/light mode
- TanStack Query for all API calls (server state)

Frontend feature layout:
```
frontend/src/
├── app/           # Entry point, router, ThemeContext, QueryClient setup
├── features/
│   ├── auth/      # Login page, AuthContext, auth hooks
│   ├── cepas/     # Main feature: table, map, charts, chat, home, new strain
│   ├── users/     # Admin user management
│   └── dashboard/ # Dashboard views
└── shared/        # api.ts (axios instance), reusable components, utils, interfaces
```

### Frontend–Backend Connection
Vite proxies `/api` to `http://127.0.0.1:8000` in development. The base URL can be overridden with `VITE_API_URL` in `.env.production`.

### AI Chat Module
The `/chat/query` endpoint orchestrates a multi-step pipeline:
1. **QueryParserService** — classifies the query as statistical, hybrid, or semantic
2. **MQLExecutorService** — generates MongoDB filter queries from natural language
3. **DatabaseService** — hybrid search (MQL filters + vector similarity on embeddings)
4. **LLMService** — formats and returns a natural-language response via Groq API

Embeddings use `sentence-transformers/all-MiniLM-L6-v2`. Disable the whole AI module by setting `IA_ENABLED=false`.

## Environment Variables

Backend (`backend/.env`):
- `SECRET_KEY` — **requerido**, clave JWT (sin default en código)
- `GROQ_API_KEY` — required for AI chat
- `GROQ_MODELS` — comma-separated list of Groq models to use
- `ALLOWED_ORIGINS` — JSON array de origins permitidos para CORS (default: localhost:5173)
- `DEBUG` — `true` activa stack traces y dumps a disco (default: `false`)
- MongoDB and Redis use `localhost` defaults if not set

Frontend:
- `frontend/.env.development` — sets `VITE_API_URL=http://127.0.0.1:8000`
- `frontend/.env.production` — override for production backend URL

## Commit Style

Commits are written in Spanish following the pattern `Se [verbo] [qué] [detalle opcional]`, e.g.:
- `Se mejoran las respuestas de la IA para preguntas de filtrado o conteo`
- `Reorganizacion de archivos. Se separa la lógica de IA de la lógica principal del backend`

---

## Backend Audit (2026-04-20) — Estado al 2026-05-01

Auditoría completa del backend. Issues marcados con ✅ han sido corregidos.

### Seguridad

| ID | Estado | Archivo | Problema |
|----|--------|---------|---------|
| S1 | ✅ | `backend/.env` | `.env` ya excluido por `backend/.gitignore`. `SECRET_KEY` añadido al `.env`. |
| S2 | ✅ | `core/config.py` | `secret_key` ahora es campo requerido sin default. |
| S3 | ✅ | `main.py` | CORS usa `settings.ALLOWED_ORIGINS` (configurable vía `.env`). |
| S4 | ✅ | `core/config.py` | `debug` default cambiado a `False`. |
| S5 | — | `login_rate_limit.py:69-73` | Si Redis falla, el rate limit se desactiva (fail-open). Crítico en endpoints de auth. |
| S6 | — | `login_rate_limit.py:95-109` | `X-Forwarded-For` se confía ciegamente — cualquier cliente puede falsear su IP. |
| S7 | — | `login_rate_limit.py` | Solo límite por IP, no por username → brute force distribuido. |
| S8 | ✅ | `user_repository.py` | `bcrypt.hashpw/checkpw` wrapped en `asyncio.to_thread()`. |
| S9 | ✅ | `auth_service.py` | Dummy hash cuando usuario no existe — elimina timing attack. |
| S10 | ✅ | `cepa_repository.py`, `query_parser_service.py` | `re.escape()` aplicado a todos los regex de usuario hacia MongoDB. |
| S11 | ✅ | `llm_service.py` | `_dump_request`/`_dump_mql` gateados detrás de `settings.debug`. |
| S12 | — | `input_validator_service.py:28-52` | Detección de prompt-injection por regex sin normalización unicode. |
| S13 | — | `router.py:60-65` | `_LEAK_INDICATORS` usa substring match simple; puede bloquear respuestas legítimas. |
| S14 | — | `router.py:62` + `llm_service.py:19` | `SECURITY_PREAMBLE` contiene strings que también son `_LEAK_INDICATORS`. |
| S15 | ✅ | `routes_cepas.py` | `field` en `add_attribute` validado con regex — bloquea `$set`, `a.b.c`, etc. |

### Bugs

| ID | Estado | Archivo | Problema |
|----|--------|---------|---------|
| B1 | ✅ | `dbSearch_service.py` | Fallback sin embeddings corregido: ahora llama `get_todas_las_cepas()`. |
| B2 | ✅ | `dbSearch_service.py`, `input_validator_service.py`, `routes_cepas.py` | Todos los `encode()` / `encode_batch()` envueltos en `asyncio.to_thread()`. |
| B3 | ✅ | Múltiples archivos | `datetime.utcnow()` → `datetime.now(timezone.utc)`. |
| B4 | — | `schema/dtos.py:180-188` | PATCH con `{"cepa": ""}` guarda `null`, rompe índice único. |
| B5 | — | `cepa_repository.py:76-90` | Renombrar cepa sin verificar unicidad → `DuplicateKeyError` como 500. |
| B6 | — | `routes_cepas.py:96-116` | `add_attribute`: N round-trips sin transacción. Usar `bulk_write`. |
| B7 | ✅ | `query_parser_service.py` | Año hardcodeado `2024` → `datetime.now().year`. |
| B8 | ✅ | `dbSearch_service.py` | Query de embeddings: añadido `$ne: null` para excluir docs nulos en DB. |
| B9 | — | `llm_service.py:69-87` | `_extract_json_object` no maneja `{` dentro de strings. |
| B10 | — | `llm_service.py:90-101` | `_repair_unquoted_keys`: regex puede doble-quotear keys en valores string. |
| B11 | — | `mql_executor_service.py:89-98` | Shallow-copy del pipeline; `_resolve_dates` puede mutar dicts anidados del original. |
| B12 | ✅ | `llm_service.py` | `raise Exception(...)` → `raise Exception(...) from e`. |
| B13 | — | `query_parser_service.py:302` | `dia = 28` como fallback de febrero ignora años bisiestos. |
| B14 | — | `dbSearch_service.py:144-165` | `_cepa_a_texto` solo concatena 3 campos; embeddings capturan muy poca info. |
| B15 | ✅ | `login_rate_limit.py` | Race condition INCR+EXPIRE eliminada con script Lua atómico. |
| B16 | — | `feedback_service.py:35` | `limpiar_antiguos()` en cada insert. Usar TTL index de MongoDB. |
| B17 | — | `router.py:273-277` | `modelo_usado` en feedback siempre guarda `groq_models[0]`. |
| B18 | — | `dbSearch_service.py:21-27` | Caches de clase no son process-safe con múltiples workers uvicorn. |
| B19 | — | `dbSearch_service.py:430-442` | `generar_embeddings_batch`: N `save()` individuales. Usar `bulk_write`. |

### Performance

| ID | Estado | Archivo | Problema |
|----|--------|---------|---------|
| P1 | — | `dbSearch_service.py:170-193` | Scan completo en cada cache miss de campos (TTL 5 min). |
| P2 | — | `dbSearch_service.py:195-229` | `descubrir_valores_campos`: N `distinct()` seriales. Usar `asyncio.gather()`. |
| P3 | ✅ | `dbSearch_service.py` | Similitud coseno vectorizada con numpy matmul en `_busqueda_vectorial` y `_busqueda_semantica`. |
| P4 | — | `dbSearch_service.py:254-265` | Sin filtros, trae todas las cepas con embedding (~3 KB/cepa). |
| P5 | — | `models/models.py` | Sin índices en `gram`, `origen`, `envio_punta_arenas`, etc. |
| P6 | — | `llm_service.py:147-155` | `httpx.AsyncClient` se crea por request → reconexión TLS cada vez. |
| P7 | — | `llm_service.py:298, 390` | `open()` bloqueante en async handler. Usar `aiofiles`. (Mitigado: dumps solo en debug mode) |
| P8 | — | `input_validator_service.py:86-90` | Embedding model se carga en el primer request (~5 s). Pre-calentar en `on_startup`. |
| P9 | — | `feedback_repository.py:78-94` | `get_stats` carga todo el feedback a memoria. Reemplazar con `$group` aggregate. |
| P10 | — | `dbSearch_service.py:304, 321` | `encode(pregunta)` se llama dos veces por request en `busqueda_hibrida`. |

### Arquitectura

| ID | Estado | Descripción |
|----|--------|-------------|
| A1 | ✅ | `cepa_repository.py`: imports de IA movidos a lazy imports dentro de métodos. |
| A2 | — | `CepaRepository.create` mezcla capa de datos con lógica de embeddings. |
| A3 | — | `DatabaseService` tiene demasiadas responsabilidades. |
| A4 | — | Manejo de errores inconsistente entre módulos. |
| A5 | — | Strings mágicos para modos (`"estadístico"`, etc.). Usar `Enum`. |
| A6 | — | `cepa_service.py` existe pero está vacío. Poblar o eliminar. |
| A7 | — | `logs/` no está en `.gitignore`. `temp/` ya está excluido. |
| A8 | — | Logging fragmentado: `setup_logging()` + `basicConfig` separados. |
| A9 | — | Sin request-ID/correlation-ID middleware. |
| A10 | — | Tests no integrados a CI, sin `[tool.pytest]` en `pyproject.toml`. |

### Issues pendientes (por prioridad)

1. **S5** — Rate limit fail-open cuando Redis cae (auth endpoint)
2. **S6/S7** — `X-Forwarded-For` sin validar; sin límite por username
3. **B4** — PATCH con cepa vacía rompe índice único
5. **B5** — Renombrar cepa sin check de unicidad → 500
6. **B6** — `add_attribute` sin transacción (fallo parcial)
7. **P6** — `httpx.AsyncClient` recreado por request (reconexión TLS)
8. **P2** — `distinct()` seriales en descubrimiento de valores
9. **B14** — `_cepa_a_texto` incompleto → embeddings inútiles
10. **P5** — Faltan índices MongoDB en campos de filtro comunes
