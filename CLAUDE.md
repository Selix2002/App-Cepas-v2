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
| S5 | ✅ | `middleware/login_rate_limit.py`, `ia/middleware.py` | Fail-open eliminado: si Redis cae, ambos middlewares devuelven 503 (fail-closed). Parámetro `fail_open` removido. |
| S6 | ✅ | `middleware/login_rate_limit.py` | `X-Forwarded-For` solo se acepta si la conexión directa viene de `trusted_proxies` (127.0.0.1 = Apache). XFF de IPs externas es ignorado. |
| S7 | ✅ | `middleware/login_rate_limit.py` | Segundo contador por username (10 req / 300s) con script Lua atómico. Body leído con replay ASGI para no romper el handler. |
| S8 | ✅ | `user_repository.py` | `bcrypt.hashpw/checkpw` wrapped en `asyncio.to_thread()`. |
| S9 | ✅ | `auth_service.py` | Dummy hash cuando usuario no existe — elimina timing attack. |
| S10 | ✅ | `cepa_repository.py`, `query_parser_service.py` | `re.escape()` aplicado a todos los regex de usuario hacia MongoDB. |
| S11 | ✅ | `llm_service.py` | `_dump_request`/`_dump_mql` gateados detrás de `settings.debug`. |
| S12 | — | `input_validator_service.py:28-52` | Detección de prompt-injection por regex sin normalización unicode. |
| S13 | — | `router.py:60-65` | `_LEAK_INDICATORS` usa substring match simple; puede bloquear respuestas legítimas. |
| S14 | — | `router.py:62` + `llm_service.py:19` | `SECURITY_PREAMBLE` contiene strings que también son `_LEAK_INDICATORS`. |
| S15 | ✅ | `routes_cepas.py` | `field` en `add_attribute` validado con regex — bloquea `$set`, `a.b.c`, etc. |
| S16 | ✅ | `ia/middleware.py`, `ia/__init__.py`, `main.py` | `ChatRateLimitMiddleware._get_client_ip` ahora honra `X-Forwarded-For` solo si la conexión directa viene de `trusted_proxies` (127.0.0.1 = Apache), igual que login (S6). `get_ia_middleware` propaga `trusted_proxies={"127.0.0.1"}` desde `main.py`. XFF de clientes no confiables se ignora → bypass del rate limit cerrado. |
| S17 | ✅ | `llm_service.py` | Gateo movido **dentro** de `_dump_mql` y `_dump_request` (`if not settings.debug: return`); guards externos redundantes eliminados. Cualquier call site (incluidos los dos olvidados por S11 en `formatear_resultados_mql`) queda gateado automáticamente → no se escriben datos de usuario a `temp/` en prod. |
| S18 | ✅ | `dtos.py`, `routes_cepas.py`, `cepa_repository.py` | Constante `RESERVED_FIELDS` (`embedding`, `fecha_creacion`, `fecha_actualizacion`, `_id`, `id`). `add_attribute` rechaza (400) reservados + estructurados (`cepa`/`latitud`/`longitud`/`envio_punta_arenas`). `to_update_dict()` y `create()` stripean reservados colados vía `extra="allow"`. Verificado. |
| S19 | — | `core/security.py:16-19` | JWT válido de un usuario borrado devuelve 404 (no 401); sin check `is_active`/revocación. Lanzar `NotAuthorizedException` y validar usuario activo. |
| S20 | — | `login_rate_limit.py:122-140` | Contador por username incrementa en cada intento (incluido login exitoso y desde IPs atacantes) → DoS de bloqueo de cuenta sobre un username conocido (ej: `admin`). Contar solo intentos fallidos. |
| S21 | — | `core/security.py:26` | `/schema` (Scalar/OpenAPI) excluido de auth y siempre servido → superficie de API pública en prod. Gatear tras `settings.debug` o auth. |

### Bugs

| ID | Estado | Archivo | Problema |
|----|--------|---------|---------|
| B1 | ✅ | `dbSearch_service.py` | Fallback sin embeddings corregido: ahora llama `get_todas_las_cepas()`. |
| B2 | ✅ | `dbSearch_service.py`, `input_validator_service.py`, `routes_cepas.py` | Todos los `encode()` / `encode_batch()` envueltos en `asyncio.to_thread()`. |
| B3 | ✅ | Múltiples archivos | `datetime.utcnow()` → `datetime.now(timezone.utc)`. |
| B4 | — | `schema/dtos.py:180-188` | PATCH con `{"cepa": ""}` guarda `null`, rompe índice único. |
| B5 | ✅ | `cepa_repository.py` | (= B21) Resuelto: `update()` verifica unicidad del nombre antes de `set()`. |
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
| B20 | ✅ | `cepa_repository.py` | `encode()` en `create()`/`update()` envuelto en `asyncio.to_thread` (patrón de B2) → ya no bloquea el event loop en cada alta/edición de cepa. (No cubre B22: el bloque sigue tragando errores no-`ImportError`.) |
| B21 | ✅ | `cepa_repository.py`, `routes_cepas.py` | `update()` verifica unicidad del nombre antes de `set()` y lanza `CepaAlreadyExistsError`; el handler `update` del controller lo mapea a 409 (igual que `create`). Antes: `DuplicateKeyError` → 500. Verificado con los 3 casos (colisión/misma cepa/sin colisión). |
| B22 | — | `cepa_repository.py:75-82`, `routes_cepas.py:486-495` | Embedding se genera tras el insert y solo se traga `ImportError` (repo) / `except: pass` (import) → 500 tras insert exitoso, o cepa sin embedding sin log. |
| B23 | — | `routes_cepas.py:363-371` | El query param `offset` de `get_all` se acepta pero nunca se pasa al repo → paginación server-side muerta, siempre devuelve todo. |
| B24 | ✅ | `dbSearch_service.py` | Fallback del `except` en `buscar_cepas_similares` ahora llama `get_todas_las_cepas()` (antes `_busqueda_vectorial(pregunta, limit)` con aridad/tipos incorrectos → `TypeError` que enmascaraba el error original). Verificado con excepción forzada. |
| B25 | — | `router.py:77,156,226`, `feedback_repository.py:55`, `ia/models.py:15` | (= B3 incompleto) `datetime.utcnow()` aún en uso (deprecado, naive). Migrar a `datetime.now(timezone.utc)`. |

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
| P11 | — | `routes_cepas.py:258-309` | `_read_xlsx` parsea el workbook dos veces (read-only + `read_only=False`) y `list(ws.iter_rows())` carga toda la hoja → ~2× tiempo + pico de memoria en archivos de 10 MB. |
| P12 | — | `routes_cepas.py:472-504` | Loop de import: por fila find_one + insert + `encode` + `save` seriales (2 escrituras + 1 embedding c/u). Batch insert + `bulk_write`. |
| P13 | — | `frontend useCepasTableCore.ts:150-176`, `CepasQuery.ts:13` | La tabla trae todas las cepas sin filtro/límite y filtra/ordena/pagina en cliente, re-escaneando todo en cada tecla (agrava B23). Paginación server-side. |
| P14 | — | `frontend vite.config.ts` | Sin `manualChunks`: ag-Grid + Nivo + Leaflet + ExcelJS + html2canvas-pro en chunks compartidos grandes. Separar/lazy-load vendor chunks. |

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
| A11 | — | `frontend AuthContext.tsx:36,55,75`, `authSession.ts`: headers de auth se setean en el `axios` global, pero todas las llamadas usan la instancia `api` (token vía su interceptor de localStorage). El path global y todo `authSession.ts` son código muerto; la auth depende solo del interceptor. |
| A12 | — | `frontend features/dashboard/**` (7 archivos): nunca se importa/rutea (muerto). `utils/cepaPayload.ts`: `createBaseCepaPayload`/`buildCepaPayloadFromHeaderMap` sin uso y con esquema anidado obsoleto (`nombre`/`cod_lab`/relaciones). Eliminar. |
| A13 | — | `frontend utils/cepaPayload.ts:79`: el alta manual convierte campos vacíos al literal `"N/I"` (el backend solo lo trata como null en import, no en create) → datos contaminados con `"N/I"`. |
| A14 | — | `frontend vite.config.ts:8-13`: proxy `/api` configurado pero sin uso (axios apunta directo a `VITE_API_URL` vía CORS). |

### Frontend (auditoría 2026-06-09)

Primera auditoría del frontend (`frontend/src/`). **Sin sinks XSS**: no hay `dangerouslySetInnerHTML`/`innerHTML`; el renderer de markdown del chat (`ChatPanel.tsx`) y el de feedback (`FeedbackDetailModal.tsx`) construyen JSX escapado por React.

| ID | Estado | Archivo | Problema |
|----|--------|---------|---------|
| F1 | ✅ | `app/router/AdminRoute.tsx` (nuevo), `AppRouter.tsx`, `feedback/pages/FeedbackPage.tsx` | Nuevo `AdminRoute` (guard de rol race-safe: espera a que `user` rehidrate antes de decidir). Las 4 rutas admin (`addcepa`, `addatribute`, `UserManagement`, `FeedbackIA`) anidadas bajo `AdminRoute` dentro de `PrivateRoute`. Self-guard redundante de `FeedbackPage` eliminado. Lint OK. |
| F2 | — | `shared/services/api.ts` | Sin interceptor de respuesta 401 → token expirado a mitad de sesión no se maneja globalmente (sin auto-logout/redirect). |
| F3 | — | `users/components/UserTable.tsx:72,83,109` | Fallos de delete/toggle-admin/rename se tragan con solo `console.error` → el usuario no ve nada (fallo silencioso). Mostrar toast/estado de error. |
| F4 | — | `shared/utils/loader.ts` | Loader global es un singleton DOM sin refcount → llamadas async solapadas lo ocultan antes de tiempo. |
| F5 | — (info) | `api.ts:13`, `AuthContext.tsx` | JWT en `localStorage` — expuesto a XSS en principio, pero mitigado al no existir sink XSS. Riesgo residual. |

### Logging de seguridad — Estado al 2026-05-16

Diagnóstico del sistema de logging actual. Ninguno de estos issues ha sido corregido aún.

| ID | Archivo | Problema |
|----|---------|---------|
| L1 | `auth_service.py`, `routes_auth.py` | Sin logging de logins exitosos ni fallidos. No hay traza de si un brute force adivinó una contraseña. |
| L2 | `core/logging_config.py`, `main.py` | Dos sistemas de logging paralelos: `setup_logging()` configura logger `rate_limit` con archivo; `basicConfig` configura el logger raíz solo hacia stdout. El resto de la app (IA router, Litestar) nunca llega al archivo. |
| L3 | `ia/middleware.py:88` | Chat permitido se loggea en `DEBUG`, pero el handler de archivo está en `INFO` → el tráfico normal de chat es invisible en el archivo. |
| L4 | — | Sin correlation ID (A9): no se puede vincular el bloqueo del middleware con el request ni reconstruir la secuencia de acciones de una IP. |
| L5 | `core/logging_config.py` | Logs en texto libre, no estructurado. Dificulta alertas automáticas, procesamiento con scripts y parseo por herramientas externas. |
| L6 | `.gitignore` | **(mayormente mitigado)** `backend/.gitignore` sí tiene `*.log` y `temp/`; `git ls-files` confirma que no hay logs/env/temp trackeados. Falta solo el patrón explícito `logs/`. |
| L7 | `core/config.py:23` | `LOG_LEVEL` default `"DEBUG"` → en prod el logger raíz corre en DEBUG y los servicios de IA loggean prompts completos, preguntas y resultados de MongoDB a stdout (datos sensibles). Default a INFO/WARNING. |

### Issues pendientes (por prioridad)

Re-auditoría 2026-06-09 (backend completo + frontend). Top 10 por riesgo × esfuerzo:

1. ~~**S16** — Bypass del rate limit del chat por XFF (abuso de costo/cuota Groq)~~ — ✅ corregido 2026-06-23 (`trusted_proxies` aplicado a `ChatRateLimitMiddleware`)
2. ~~**B20** — `encode()` bloqueante en `create`/`update` async~~ — ✅ corregido 2026-06-23 (`asyncio.to_thread`)
3. ~~**S17** — Dump MQL a disco sin gatear por debug (datos de usuario en prod)~~ — ✅ corregido 2026-06-23 (gateo interno en `_dump_mql`/`_dump_request`)
4. ~~**B24** — Fallback del `except` lanza `TypeError` en `buscar_cepas_similares`~~ — ✅ corregido 2026-06-23 (`get_todas_las_cepas()`)
5. ~~**B21/B5** — Renombrar cepa sin check de unicidad → 500~~ — ✅ corregido 2026-06-23 (check de unicidad + 409)
6. ~~**S18** — `add_attribute` mass-assignment sobre campos reservados (`cepa`, `embedding`)~~ — ✅ corregido 2026-06-23 (`RESERVED_FIELDS` + rechazo/stripeo)
7. ~~**F1** — Rutas de admin sin guard de rol en el frontend~~ — ✅ corregido 2026-06-23 (`AdminRoute`)
8. **B23 + P13** — Sin paginación real (param `offset` muerto + filtrado en cliente)
9. **L1** — Sin logging de login (éxitos/fallos) — sin traza de brute force
10. **A11** — Path de auth global-axios muerto (la auth depende solo del interceptor)

Pendientes previos que siguen abiertos: **B4** (PATCH cepa vacía), **B6** (`add_attribute` sin transacción), **P6** (`httpx.AsyncClient` por request), **P2** (`distinct()` seriales), **B14** (`_cepa_a_texto`), **P5** (índices MongoDB), **S12–S14** (validación IA), **B9/B10** (parseo JSON del LLM).
