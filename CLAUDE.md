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
- `GROQ_API_KEY` — required for AI chat
- `GROQ_MODELS` — comma-separated list of Groq models to use
- MongoDB and Redis use `localhost` defaults if not set

Frontend:
- `frontend/.env.development` — sets `VITE_API_URL=http://127.0.0.1:8000`
- `frontend/.env.production` — override for production backend URL

## Commit Style

Commits are written in Spanish following the pattern `Se [verbo] [qué] [detalle opcional]`, e.g.:
- `Se mejoran las respuestas de la IA para preguntas de filtrado o conteo`
- `Reorganizacion de archivos. Se separa la lógica de IA de la lógica principal del backend`

---

## Backend Audit (2026-04-20)

Auditoría completa del backend. Issues ordenados por categoría y prioridad.

### Seguridad

| ID | Archivo | Problema |
|----|---------|---------|
| S1 | `backend/.env` | **API key de Groq commiteada.** Rotar y agregar `.env` al `.gitignore`. |
| S2 | `core/config.py:11` | `secret_key = "secret123"` es el valor de producción real (no hay `SECRET_KEY` en `.env`). Hacer el campo requerido, sin default. |
| S3 | `main.py:34-39` | `allow_origins=["*"]` + `allow_credentials=True` es inválido/inseguro. Especificar origins explícitos. |
| S4 | `core/config.py:8` | `debug: bool = True` por defecto expone stack traces. Default debe ser `False`. |
| S5 | `login_rate_limit.py:69-73` | Si Redis falla, el rate limit se desactiva (fail-open). Crítico en endpoints de auth. |
| S6 | `login_rate_limit.py:95-109` | `X-Forwarded-For` se confía ciegamente — cualquier cliente puede falsear su IP. Usar el peer TCP directo o un allow-list de proxies. |
| S7 | `login_rate_limit.py` | Solo límite por IP, no por username → brute force distribuido contra un usuario específico. |
| S8 | `user_repository.py:23-29` | `bcrypt.hashpw/checkpw` son bloqueantes en el event loop. Wrappear con `asyncio.to_thread()`. |
| S9 | `auth_service.py:10-14` | Cuando el usuario no existe se omite el hash → timing attack para enumerar usuarios válidos. |
| S10 | `cepa_repository.py:66`, `query_parser_service.py:243` | Parámetros del usuario van directamente como regex de MongoDB sin `re.escape()` → **ReDoS**. |
| S11 | `llm_service.py:280-306` | `_dump_request`/`_dump_mql` escriben datos del usuario a disco sin rotación, de forma bloqueante, en cada request. Gatear por flag debug. |
| S12 | `input_validator_service.py:28-52` | Detección de prompt-injection por regex sin normalización unicode; fácilmente eludible. |
| S13 | `router.py:60-65` | `_LEAK_INDICATORS` usa substring match simple; puede bloquear respuestas legítimas sobre bacterias. |
| S14 | `router.py:62` + `llm_service.py:19` | El `SECURITY_PREAMBLE` contiene strings que también son `_LEAK_INDICATORS` → el sistema puede bloquearse a sí mismo. |
| S15 | `routes_cepas.py:105-111` | `field` en `add_attribute` no está sanitizado → un nombre como `"$set"` o `"a.b.c"` corrompe documentos MongoDB. |

### Bugs

| ID | Archivo | Problema |
|----|---------|---------|
| B1 | `dbSearch_service.py:89-95` | **Crash en runtime:** `buscar_cepas_similares` llama `_busqueda_vectorial(pregunta, limit)` pero la firma espera 4 args. Falla cuando no hay embeddings. |
| B2 | `cepa_repository.py:37, 87` | El modelo de sentence-transformers corre sincrónicamente en el handler async. Primera llamada puede bloquear 5–30 s. |
| B3 | Múltiples archivos | `datetime.utcnow()` deprecado en Python 3.13. Reemplazar por `datetime.now(timezone.utc)`. |
| B4 | `schema/dtos.py:180-188` | Enviar `{"cepa": ""}` en un PATCH guarda `null`, rompiendo el índice único. |
| B5 | `cepa_repository.py:76-90` | Al renombrar una cepa no verifica unicidad → `DuplicateKeyError` sube como 500. |
| B6 | `routes_cepas.py:96-116` | `add_attribute`: N round-trips sin transacción, fallo parcial deja docs inconsistentes. Usar `bulk_write`. |
| B7 | `query_parser_service.py:258-259` | Año 2024 hardcodeado → queries de fecha rotas en 2025+. |
| B8 | `dbSearch_service.py:76` | Query `{"embedding": {"$exists": True}}` incluye docs con `embedding: null`, que se traen por red y se descartan en Python. |
| B9 | `llm_service.py:69-87` | `_extract_json_object` no maneja `{` dentro de strings (ej: `{"regex": "a{2,4}"}`), puede truncar JSON válido. |
| B10 | `llm_service.py:90-101` | `_repair_unquoted_keys`: regex puede doble-quotear keys dentro de valores string. |
| B11 | `mql_executor_service.py:89-98` | `_execute_aggregate` hace shallow-copy del pipeline; `_resolve_dates` puede mutar los dicts anidados del original. |
| B12 | `llm_service.py:375-376` | `raise Exception(...)` pierde el traceback encadenado. Usar `raise ... from e`. |
| B13 | `query_parser_service.py:302` | `dia = 28` como fallback de febrero ignora años bisiestos. |
| B14 | `dbSearch_service.py:144-165` | `_cepa_a_texto` tiene `# ... resto del código ...` — solo concatena 3 campos. Los embeddings capturan muy poca información; la búsqueda semántica es casi inútil. |
| B15 | `login_rate_limit.py:65-68`, `ia/middleware.py:64-66` | Race condition: `INCR` + `EXPIRE` son dos round-trips no atómicos. Usar Lua script o patrón `SET NX EX`. |
| B16 | `feedback_service.py:35` | `limpiar_antiguos()` se llama en cada insert → count + delete_many por cada feedback. Usar TTL index de MongoDB. |
| B17 | `router.py:273-277` | `modelo_usado` en feedback siempre guarda `groq_models[0]`, ignorando el modelo real de la respuesta. |
| B18 | `dbSearch_service.py:21-27` | Caches `_campos_cache`/`_valores_cache` como atributos de clase → no son process-safe con múltiples workers uvicorn. |
| B19 | `dbSearch_service.py:430-442` | `generar_embeddings_batch` hace `await cepa.save()` por documento → N round-trips. Usar `bulk_write`. |

### Performance

| ID | Archivo | Problema |
|----|---------|---------|
| P1 | `dbSearch_service.py:170-193` | Descubrimiento de campos: scan completo de la colección en cada cache miss (TTL 5 min). |
| P2 | `dbSearch_service.py:195-229` | `descubrir_valores_campos`: N `distinct()` seriales. Usar `asyncio.gather()`. |
| P3 | `dbSearch_service.py:110-142` | Similitud coseno por documento en Python puro. Para miles de cepas: >1 s. Reemplazar con matmul numpy: `(E @ q) / (‖E‖ * ‖q‖)`. |
| P4 | `dbSearch_service.py:254-265` | Sin filtros, trae todas las cepas con su embedding (~3 KB/cepa). 10k cepas = 30 MB/request. |
| P5 | `models/models.py` | Sin índices en campos de filtro comunes (`gram`, `origen`, `envio_punta_arenas`, etc.). Solo indexados `cepa` y `username`. |
| P6 | `llm_service.py:147-155` | `httpx.AsyncClient` se crea por request → reconexión TLS a Groq en cada llamada. Mantener cliente compartido. |
| P7 | `llm_service.py:298, 390` | `open()` bloqueante en async handler. Usar `aiofiles`. |
| P8 | `input_validator_service.py:86-90` | Embedding model se carga en el primer request (~5 s). Pre-calentar en `on_startup`. |
| P9 | `feedback_repository.py:78-94` | `get_stats` carga todo el feedback a memoria + loop Python. Reemplazar con `$group` aggregate. |
| P10 | `dbSearch_service.py:304, 321` | `encode(pregunta)` se llama dos veces por request en `busqueda_hibrida`. Computar una vez y pasar como parámetro. |

### Arquitectura

| ID | Descripción |
|----|-------------|
| A1 | `cepa_repository.py` importa módulos de IA aunque `IA_ENABLED=false`. Si `sentence-transformers` no está instalado, el import falla aunque la IA esté deshabilitada. |
| A2 | `CepaRepository.create` llama al servicio de embeddings inline. El repositorio mezcla capa de datos con lógica de negocio. |
| A3 | `DatabaseService` tiene demasiadas responsabilidades: búsqueda, coseno, batch de embeddings, introspección de schema, serialización de texto. |
| A4 | Manejo de errores inconsistente: algunos módulos usan excepciones de dominio, otros `raise Exception("...")`. Definir jerarquía unificada. |
| A5 | Strings mágicos para modos (`"estadístico"`, `"semántico"`, `"híbrido"`, etc.). Usar `Enum`. |
| A6 | `cepa_service.py` existe pero está vacío. Poblar o eliminar. |
| A7 | `logs/` y `temp/` deben estar en `.gitignore`. `temp/` recibe dumps con preguntas de usuarios. |
| A8 | Logging fragmentado: `setup_logging()` + `basicConfig` separados → handlers duplicados en producción. Centralizar con `logging.dictConfig`. |
| A9 | Sin request-ID/correlation-ID middleware → logs de múltiples requests se mezclan en el path MQL/semántico. |
| A10 | Tests en `tests/` no integrados a CI, sin `[tool.pytest]` en `pyproject.toml`. |

### Top 10 — Prioridad inmediata

1. **Rotar la API key de Groq y excluir `.env` del repo** (S1)
2. **`secret_key` sin default + `debug=False`** (S2, S4)
3. **Corregir `_busqueda_vectorial` fallback** — crash garantizado cuando no hay embeddings (B1)
4. **`re.escape()` en todos los regex de usuario hacia MongoDB** — ReDoS (S10)
5. **Sanitizar `field` en `add_attribute`** — corrupción de documentos (S15, B6)
6. **`asyncio.to_thread()` para bcrypt + dummy hash en user-miss** — bloqueo del event loop + timing attack (S8, S9)
7. **Fix año hardcodeado 2024** — queries de fecha rotas actualmente (B7)
8. **Desacoplar imports de IA de `CepaRepository`** — falla al instalar sin deps de IA (A1)
9. **Gatear `_dump_request`/`_dump_mql` detrás de flag debug + async I/O** (S11, P7)
10. **Vectorizar similitud coseno con numpy matmul** — mayor ganancia de performance sin cambiar arquitectura (P3)
