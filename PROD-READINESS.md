# Production Readiness — App-Cepas-v2

> Checklist de despliegue a producción derivado de la auditoría 2026-06-09.
> **Fecha:** 2026-06-23 · **Escala actual:** ~50 cepas · **IA:** activa en prod (`IA_ENABLED=true`).
>
> Prioriza por **impacto en producción**, no por la severidad nominal del audit. Referencias de issues en
> [`AUDITORIA-2026-06-09.md`](./AUDITORIA-2026-06-09.md) y `CLAUDE.md`.

## Contexto y supuestos

- **Frontend:** SPA React servida estáticamente; backend Litestar detrás de Apache (`127.0.0.1` como proxy confiable).
- **Dependencias de runtime:** MongoDB 6+ y Redis 7+ **deben** estar arriba. Los rate-limiters son **fail-closed**
  (S5): si Redis cae, `/auth/login` y `/chat/query` devuelven **503**.
- **IA activa:** el chat usa Groq + embeddings `sentence-transformers`. Esto añade superficie de ataque (prompt-injection),
  coste por uso y datos sensibles en el pipeline → relevante para varios must-fix de abajo.

## Estado de defaults verificado (2026-06-23)

| Setting | Default en código | Acción para prod |
|---------|-------------------|------------------|
| `debug` | `False` ✅ | OK (S4 ya corregido) |
| `secret_key` | requerido, sin default ✅ | Setear `SECRET_KEY` fuerte en `.env` (la app no arranca sin él) |
| `ALLOWED_ORIGINS` | `["http://localhost:5173", ...]` ⚠️ | **Cambiar** al origin real del frontend |
| `IA_ENABLED` | `True` | Confirmado activo en prod |
| `LOG_LEVEL` | `"DEBUG"` 🔴 | **Cambiar default a `INFO`** + fijar `LOG_LEVEL=INFO` en `.env` |
| `/schema` (OpenAPI) | gateado tras `debug` ✅ | OK (S21 corregido: no se registra con `debug=False`) |

---

## 🔴 TIER 1 — Obligatorio antes de prod (must-fix)

Orden de ataque recomendado:

- [x] **1. L7 — `LOG_LEVEL=DEBUG` por defecto** · `[CRÍTICO]` · ✅ **HECHO (2026-06-23)**
  Con IA activa, en prod se vuelcan prompts, preguntas de usuario y resultados de MongoDB a stdout → fuga activa.
  **Fix aplicado:** default `LOG_LEVEL="INFO"`; además se descubrió que el contenido sensible estaba en `INFO`
  (no DEBUG) → se bajó a `DEBUG` en `llm_service`/`router`/`dbSearch`; `main.py` endurecido. Verificado.
  **Pendiente en despliegue:** fijar `LOG_LEVEL=INFO` en el `.env` de prod (defensa adicional).

- [ ] **2. Config de despliegue (`.env` de prod)** · `[bloqueante de funcionamiento]`
  - `ALLOWED_ORIGINS` = origin real del frontend (default `localhost` → CORS roto en prod).
  - `LOG_LEVEL=INFO` · `DEBUG=false` (ya default) · `SECRET_KEY` fuerte (ya requerido).
  - `GROQ_API_KEY` / `GROQ_MODELS` válidos (IA on).
  - Verificar Redis + Mongo accesibles (rate-limiters fail-closed → 503 si Redis cae).

- [x] **3. S21 — `/schema` (OpenAPI/Scalar) público** · `[ALTA]` · ✅ **HECHO (2026-06-24)**
  Exponía toda la superficie de la API en prod. **Fix aplicado:** `main.py` pasa `openapi_config=... if settings.debug else None`
  → con `debug=False` la ruta `/schema` no se registra (404); `exclude` de auth condicionado a debug. Verificado.

- [ ] **4. B22 — create de cepa: 500 tras insert exitoso / cepa sin embedding sin log** · `[MEDIA-ALTA]`
  `cepa_repository.py:75-82`, `routes_cepas.py:486-495`
  Con IA on, el alta de cepa puede dar 500 pese a insertarse, o quedar sin embedding silenciosamente (rompe
  búsqueda semántica). **Fix:** reordenar generación de embedding (antes del insert o en tarea de fondo) +
  loggear fallos en vez de `pass`. *(medio)*

- [ ] **5. L2 + L3 — logging fragmentado** · `[MEDIA]` · `core/logging_config.py`, `main.py`
  Los logs de app/IA/Litestar **nunca llegan al archivo** (solo el logger `rate_limit`). Sin esto no hay traza
  persistente de errores en prod. **Fix:** unificar `setup_logging` para el root logger. *(medio; encadena con L7)*

- [ ] **6. S19 + S20 — auth** · `[MEDIA]` · `core/security.py:16-19`, `middleware/login_rate_limit.py:122-140`
  - **S19:** token de usuario borrado/inactivo sigue parcialmente usable (404 en vez de 401, sin check `is_active`).
  - **S20:** DoS de bloqueo de cuenta — se puede bloquear al `admin` spammeando logins (el contador por username
    sube en cada intento, incluidos exitosos). **Fix:** contar solo fallos.
  *(pequeños, van juntos: ambos tocan auth)*

- [ ] **7. B4 — `PATCH {"cepa":""}` → `null` rompe índice único** · `[MEDIA]` · `schema/dtos.py`
  Corrupción de datos por acción normal de usuario. **Fix:** coerción / rechazo de `cepa` vacío en el DTO. *(pequeño)*

- [ ] **8. S12 / S13 / S14 — defensa del chat (prompt-injection / leak)** · `[MEDIA]`
  `input_validator_service.py:28-52`, `router.py:60-67`
  Defensa en profundidad del LLM (la inyección MQL ya está contenida por el whitelist de operadores). *(medio)*

> **Mínimo absoluto para no desplegar con un agujero abierto:** ítems **1, 2 y 3** (cierran la fuga de datos a logs
> + la exposición de la API). Los ítems 4-8 completan un lanzamiento sólido.

---

## 🟠 TIER 2 — Primera iteración post-launch (sin riesgo de seguridad/datos)

- **F2** — sin interceptor 401 (token expirado a mitad de sesión no hace auto-logout global).
- **F3** — fallos de delete/toggle-admin/rename en `UserTable` se tragan con `console.error` (fallo silencioso).
- **F4** — loader global singleton sin refcount.
- **P14** — sin `manualChunks` en Vite → bundle inicial grande (UX de carga).
- **A13** — el alta manual convierte vacíos a `"N/I"` literal → datos contaminados.
- **B25** — `datetime.utcnow()` deprecado aún en uso (IA router/feedback).
- **Observabilidad:** A8 (logging), A9/L4 (correlation ID), L5 (logs estructurados).
- **IA (rendimiento/robustez):** P6 (`httpx.AsyncClient` por request), P8 (cold start del modelo), P9 (`get_stats`
  a memoria), P2/P10, B9/B10/B11 (parseo JSON del LLM), B14 (`_cepa_a_texto` pobre), B17 (`modelo_usado`).

## ⚪ TIER 3 — Backlog (deferible)

- **Rendimiento a escala (irrelevante a 50 filas):** P1, P4, P5 (índices Mongo), P11/P12 (import).
- **Arquitectura:** A2, A3, A4, A5, A6, A10 (tests en CI), A12 (dead code: `dashboard`, `cepaPayload`), A14 (proxy `/api`).
- **Robustez menor:** B6 (transacción en `add_attribute`), B13, B16, B18, B19.
- **Residual:** F5 (JWT en `localStorage` — sin sink XSS, riesgo residual), A7/L6 (patrón `logs/` en `.gitignore` —
  ya mitigado por `*.log`).

---

## Checklist de despliegue (resumen operativo)

```
[ ] .env de prod: SECRET_KEY, ALLOWED_ORIGINS (origin real), LOG_LEVEL=INFO, DEBUG=false
[ ] .env de prod: GROQ_API_KEY, GROQ_MODELS (IA on)
[ ] MongoDB 6+ y Redis 7+ arriba y accesibles
[ ] Tier 1 (must-fix) resuelto y verificado
[ ] Usuario admin creado (scripts.seed_admin)
[ ] Apache como proxy en 127.0.0.1 (coincide con trusted_proxies de S6/S16/L1)
[ ] Build del frontend OK (npm run build) y servido estáticamente
[ ] Smoke test: login, listar cepas, crear/editar cepa, chat IA, gestión de usuarios
```

## Ya resuelto (referencia)

Top-10 de la auditoría corregido en `fixes-auditoria` (2026-06-23): **S16, B20, S17, B24, B21/B5, S18, F1, B23, L1, A11**
(+ P13 descartado por no aplicar a la escala actual; build del frontend arreglado).
