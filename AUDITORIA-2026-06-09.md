# Auditoría App-Cepas-v2 — 2026-06-09

Auditoría completa de seguridad, bugs, rendimiento, arquitectura, frontend y observabilidad.

**Alcance:** issues pendientes (`—`) de `CLAUDE.md` + hallazgos nuevos del backend + primera auditoría completa del frontend (`frontend/src/`). Los issues ya corregidos (✅) no se re-reportan.

**Convención de severidad:** `[CRÍTICA]` · `[ALTA]` · `[MEDIA]` · `[BAJA]`.

## Resumen ejecutivo

- **No existe ningún issue CRÍTICO** (compromiso sin autenticación / exfiltración de datos / RCE). El máximo es **una ALTA**.
- La inyección MQL está **bien contenida** por el whitelist de operadores (`mql_validator_service.py`).
- **No hay vectores XSS en el frontend** (verificado): no se usa `dangerouslySetInnerHTML` ni `innerHTML`; el renderer de markdown del chat y el de feedback construyen JSX escapado por React. Por eso el almacenamiento del JWT en `localStorage` es un riesgo residual, no explotable hoy vía la app.
- Hallazgo destacado: el middleware de rate limit del chat confía en `X-Forwarded-For` de cualquier cliente — exactamente el bug que S6 corrigió para login, **no aplicado aquí**.

---

## 1. Seguridad

| ID | Sev | Archivo:línea | Problema | Corrección |
|----|-----|---------------|----------|------------|
| ~~**S16**~~ ✅ | **ALTA** | `app/ia/middleware.py`, `app/ia/__init__.py`, `app/main.py` | **CORREGIDO (2026-06-23).** `ChatRateLimitMiddleware._get_client_ip` ahora honra `X-Forwarded-For` solo si la IP de la conexión directa está en `trusted_proxies` (`{"127.0.0.1"}` propagado desde `main.py` vía `get_ia_middleware`); en otro caso usa la IP del socket. Mismo patrón que S6 (login). XFF de clientes no confiables se ignora → bypass cerrado. | ✅ |
| ~~**S17**~~ ✅ | MEDIA | `app/ia/services/chat/llm_service.py` | **CORREGIDO (2026-06-23).** Gateo movido al interior de `_dump_mql` y `_dump_request` (`if not settings.debug: return`); guards externos redundantes eliminados. Las dos llamadas de `formatear_resultados_mql` y cualquier call site futuro quedan gateados automáticamente. Verificado: `debug=False` → 0 escrituras, `debug=True` → escribe. | ✅ |
| ~~**S18**~~ ✅ | MEDIA | `app/schema/dtos.py`, `app/api/routes_cepas.py`, `app/repositories/cepa_repository.py` | **CORREGIDO (2026-06-23).** Constante central `RESERVED_FIELDS` (`embedding`, `fecha_creacion`, `fecha_actualizacion`, `_id`, `id`). `add_attribute` rechaza (400) reservados + estructurados (`cepa`/`latitud`/`longitud`/`envio_punta_arenas`). `CepaUpdateDTO.to_update_dict()` y `CepaRepository.create()` stripean los reservados colados vía `extra="allow"`. Verificado: reservados/estructurados → 400, atributos personalizados → permitidos; extra interno → descartado del dict. | ✅ |
| ~~**S19**~~ ✅ | BAJA | `app/core/security.py` | **CORREGIDO (2026-06-24).** `retrieve_user_handler` lanza `NotAuthorizedException` (401) en vez de `NotFoundException` (404) para token de usuario inexistente. Check `is_active` **diferido** (el modelo no tiene el campo ni hay flujo de desactivación; `is_admin` se re-lee cada request → revocación ya inmediata). Verificado. | ✅ |
| ~~**S20**~~ ✅ | BAJA | `app/middleware/login_rate_limit.py` | **CORREGIDO (2026-06-24, Opción A).** Contador por username acotado a `(username, IP)` → el atacante solo satura su bucket; el usuario real desde su IP no se bloquea → elimina el DoS de lockout. Brute-force distribuido recae en el límite por IP. Verificado. | ✅ |
| ~~**S22**~~ ✅ | BAJA | `auth_dto.py`, `user_dto.py`, `routes_auth.py`, `user_repository.py` | **CORREGIDO (2026-06-24).** (Revisión de auth.) `password` → `SecretStr` en `LoginDTO`/`UserCreateDTO` (antes `str` plano: `repr()` exponía la contraseña; riesgo latente). Desenvuelto con `.get_secret_value()` en los 2 call sites; validators ajustados. Verificado (repr enmascarado + login e2e). | ✅ |
| ~~**S21**~~ ✅ | BAJA | `app/main.py`, `app/core/security.py` | **CORREGIDO (2026-06-24).** `/schema` ya no se sirve en prod: `main.py` pasa `openapi_config=... if settings.debug else None` (ruta no registrada → 404 con `debug=False`); `exclude` de auth condicionado a debug. Verificado. | ✅ |
| ~~S12/S13/S14~~ ✅ | MED/BAJA | `input_validator_service.py`, `router.py`, `llm_service.py` | **CORREGIDO (2026-06-24).** S12: `_normalize_for_checks()` (NFKC + quita Cf/zero-width + acentos) en los regex → cierra evasiones fullwidth/zero-width/acento. S13: `_LEAK_INDICATORS` recortado a señales de alta especificidad → sin falsos positivos. S14: canary `CEPADB-SYS-CANARY-2B65SP` en el preamble como tripwire de volcado verbatim (rompe el solapamiento prosa↔indicadores). Verificado. | ✅ |

---

## 2. Bugs

| ID | Sev | Archivo:línea | Problema | Corrección |
|----|-----|---------------|----------|------------|
| ~~**B20**~~ ✅ | **ALTA** | `app/repositories/cepa_repository.py` | **CORREGIDO (2026-06-23).** `encode()` en `create()`/`update()` ahora corre vía `await asyncio.to_thread(embedding_service.encode, texto)` (mismo patrón que B2). El event loop ya no se bloquea durante el cómputo del embedding. No resuelve B22 (manejo de errores del bloque) ni P8 (carga fría del modelo). | ✅ |
| ~~**B21** (= B5)~~ ✅ | MEDIA | `app/repositories/cepa_repository.py`, `app/api/routes_cepas.py` | **CORREGIDO (2026-06-23).** `update()` verifica unicidad del nombre antes de `set()` (patrón de `UserRepository.update`) y lanza `CepaAlreadyExistsError`; el handler `update` del controller lo mapea a 409 (igual que `create`). Verificado: colisión → 409, misma cepa / sin colisión → no bloquea. | ✅ |
| ~~**B22**~~ ✅ | MEDIA | `cepa_repository.py`, `routes_cepas.py` | **CORREGIDO (2026-06-24).** Embedding generado **antes** del insert en `create()`/`import` (1 escritura); `except` ampliado a cualquier excepción con `logger.warning` (nombre de la cepa) en vez de solo `ImportError`/`except: pass` → no más 500 tras insert ni cepa sin embedding silenciosa. `import` corta tras fallo sistémico (`embeddings_disabled`). `update()` con el mismo logging. Verificado contra Mongo real (fallo → persiste sin embedding + WARNING; happy path → 384 dims). | ✅ |
| ~~**B23**~~ ✅ | MEDIA | `app/api/routes_cepas.py`, `app/repositories/cepa_repository.py` | **CORREGIDO (2026-06-23).** `get_all` propaga `offset`/`limit` al repo (`.skip().limit()`), opt-in: sin ellos devuelve todo (el dashboard de 50 filas lo necesita). `total` se calcula antes de paginar. Verificado contra DB real (sin args→50; limit=10→10; offset=45,limit=10→5; offset=10→40). | ✅ |
| ~~**B24**~~ ✅ | MEDIA | `app/ia/services/chat/dbSearch_service.py` | **CORREGIDO (2026-06-23).** El fallback del `except` en `buscar_cepas_similares` ahora llama `get_todas_las_cepas()` (antes `_busqueda_vectorial(pregunta, limit)` con aridad/tipos incorrectos → `TypeError`). Verificado forzando una excepción dentro del `try`: devuelve la lista, no lanza. | ✅ |
| **B25** (= B3 incompleto) | BAJA | `ia/router.py:77,156,226`, `feedback_repository.py:55`, `ia/models.py:15` | `datetime.utcnow()` aún en uso (deprecado en 3.12+, devuelve datetimes naive), pese a que B3 está marcado como corregido. | `datetime.now(timezone.utc)`. |
| B9/B10 | MEDIA | `llm_service.py:70-102` | **Pendientes confirmados:** `_repair_unquoted_keys` corrompe fechas como `2024-05-01T00:00:00Z` (el token `T00:` matchea el regex identificador-antes-de-dos-puntos) y `_extract_json_object` no maneja llaves dentro de strings → MQL de fecha válido cae silenciosamente al fallback. | Tokenizar/parsear en vez de regex. |
| B13 | BAJA | `query_parser_service.py:289` | **Pendiente confirmado:** fallback `dia=28` en "antes de [mes]" ignora bisiestos. | Según `CLAUDE.md`. |
| ~~**B4**~~ ✅ | BAJA | `dtos.py` | **CORREGIDO (2026-06-24).** `PATCH {"cepa": null}` guardaba `cepa=null` → rompía índice único (el string vacío ya se rechazaba). Fix: el `field_validator` de `cepa` ahora rechaza también `None` (se quita la guarda `if v is not None`); Pydantic no valida campos ausentes → PATCH sin `cepa` intacto. Acotado a `cepa`; nullables/dinámicos sin cambios. Verificado (8 casos). | ✅ |

---

## 3. Rendimiento

| ID | Sev | Archivo:línea | Problema | Corrección |
|----|-----|---------------|----------|------------|
| **P11** | MEDIA | `app/api/routes_cepas.py:258-309` | `_read_xlsx` parsea el workbook **dos veces** (pre-pasada read-only + carga `read_only=False`) y `list(ws.iter_rows())` carga toda la hoja → ~2× tiempo + pico de memoria en un upload de 10 MB. | Una sola pasada en streaming; reutilizar el workbook read-only. |
| **P12** | MEDIA | `app/api/routes_cepas.py:472-504` | Loop de import: por fila find_one + insert + `encode` (sync-in-thread) + `save` en serie (2 escrituras + 1 embedding c/u) → muy lento con 5.000 filas. | Batch insert, batch encode, `bulk_write`. |
| ~~**P13**~~ ⊘ N/A | MEDIA | `frontend useCepasTableCore.ts`, `HomePage.tsx` | **DESCARTADO (2026-06-23).** No aplica a la escala/arquitectura actual. Datos: **50 cepas**; tabla+mapa+charts+export comparten un único dataset cliente (`table.filteredData`/`rawData`), por lo que mapa/charts agregan/plotean el set completo y el export vuelca el set filtrado. Migrar a server-side rompería esas features y exigiría reimplementar la búsqueda cruzada + el mini-lenguaje de fechas (`>15-05-24`, rangos `..`) en MongoDB. El DTO ya excluye `embedding` → el fetch completo es minúsculo. **Reabrir solo si el dataset crece a miles de filas.** El backend (B23) ya quedó listo para ese caso. | ⊘ |
| **P14** | BAJA | `frontend/vite.config.ts` | Sin `build.rollupOptions.manualChunks`; ag-Grid + Nivo + Leaflet + ExcelJS + html2canvas-pro caen en chunks compartidos grandes. | Separar vendor chunks / lazy-load de export y mapa. |
| P6/P2/P9/P8/B16/B19/B18 | — | según `CLAUDE.md` | **Pendientes confirmados:** `httpx.AsyncClient` por intento (`llm_service.py:148`); `distinct()` seriales (`dbSearch:210-216`); `get_stats` carga todo a memoria (`feedback_repository.py:122`); carga fría del modelo de embeddings; `limpiar_antiguos` por insert; N `save()` en batch; caches de clase no process-safe. | Según `CLAUDE.md`. |

---

## 4. Arquitectura

| ID | Sev | Archivo:línea | Problema | Corrección |
|----|-----|---------------|----------|------------|
| ~~**A11**~~ ✅ | MEDIA | `frontend AuthContext.tsx`, `authSession.ts`, `users/services/UsersQuery.ts` | **CORREGIDO (2026-06-23).** `authSession.ts` borrado (código muerto, sin imports). Path global-axios eliminado de `AuthContext` (import `axios` + useEffect de montaje + los 2 `delete axios.defaults`). Línea redundante `api.defaults.headers.common.Authorization` quitada de `login()` (opción B) → el interceptor de la instancia `api` (lee `auth_token` de localStorage) es la **única** fuente de verdad. Verificado: ningún `axios.` global fuera de `api.ts`; build + lint OK; cero cambio de comportamiento. | ✅ |
| **A12** | BAJA | `frontend features/dashboard/**` (7 archivos); `utils/cepaPayload.ts:17-35,95-148` | La feature `dashboard` nunca se importa/rutea (muerta); `createBaseCepaPayload`/`buildCepaPayloadFromHeaderMap` sin uso y referencian el esquema anidado obsoleto (`nombre`/`cod_lab`/relaciones). | Eliminar. |
| **A13** | BAJA | `frontend utils/cepaPayload.ts:79` | El alta manual convierte campos vacíos al literal `"N/I"` (el backend solo lo trata como null en el path de import, no en create) → datos contaminados con `"N/I"`. | Enviar `null` para vacíos también en create. |
| **A14** | BAJA | `frontend vite.config.ts:8-13` | El proxy de dev `/api` está configurado pero sin uso (axios `baseURL=VITE_API_URL` apunta directo al backend) → dev depende de CORS, no del proxy. | Elegir uno. |
| A6 | BAJA | `app/services/cepa_service.py` | **Confirmado:** sigue siendo un archivo vacío (código muerto). | Poblar o eliminar. |

---

## 5. Frontend

> **Sin sinks XSS** (verificado): no hay `dangerouslySetInnerHTML`/`innerHTML`; el renderer de markdown del chat (`ChatPanel.tsx`) y el de feedback (`FeedbackDetailModal.tsx`) construyen JSX escapado por React.

| ID | Sev | Archivo:línea | Problema | Corrección |
|----|-----|---------------|----------|------------|
| ~~**F1**~~ ✅ | MEDIA | `src/app/router/AdminRoute.tsx` (nuevo), `AppRouter.tsx`, `src/features/feedback/pages/FeedbackPage.tsx` | **CORREGIDO (2026-06-23).** Nuevo componente `AdminRoute` que verifica `is_admin` (race-safe: si hay token pero `user` aún rehidrata, muestra "Cargando…" en vez de expulsar). Las 4 rutas admin (`addcepa`, `addatribute`, `UserManagement`, `FeedbackIA`) anidadas bajo `AdminRoute` dentro de `PrivateRoute`. Self-guard de `FeedbackPage` consolidado (eliminado). Lint OK; sin errores TS nuevos. | ✅ |
| **F2** | BAJA | `shared/services/api.ts` | Sin interceptor de respuesta para 401 → un token expirado/inválido a mitad de sesión no se maneja globalmente (sin auto-logout/redirect); cada componente debe atraparlo. | Añadir interceptor 401 → limpiar auth + redirigir a login. |
| **F3** | BAJA | `users/components/UserTable.tsx:72,83,109` | Fallos de delete/toggle-admin/rename se tragan con solo `console.error` → el usuario no ve error y la UI parece no hacer nada (fallo silencioso). | Mostrar toast/estado de error. |
| **F4** | BAJA | `shared/utils/loader.ts` | El loader global es un singleton DOM sin refcount → con llamadas async solapadas el primer `loader(false)` lo oculta mientras otra operación sigue pendiente. | Refcount o migrar a estado de React. |
| **F5** | BAJA (info) | `api.ts:13`, `AuthContext.tsx` | JWT en `localStorage` — expuesto a XSS en principio, mitigado aquí al no existir sink XSS. | Solo nota de riesgo residual. |

---

## 6. Logging y Observabilidad (L1–L7)

- **L1 [MEDIA]** ✅ **CORREGIDO (2026-06-23)** — el handler `login` (`routes_auth.py`) loggea cada intento al logger `rate_limit` (persiste a `logs/rate_limit.log`): `LOGIN OK` (INFO) / `LOGIN FALLIDO` (WARNING) con username + IP real (helper `_client_ip` honrando `trusted_proxies`, igual que S6/S16). Fallo genérico para no filtrar enumeración de usuarios. Brute-force ya trazable.
- **L2 [MEDIA]** ✅ **CORREGIDO (2026-06-24)** — `setup_logging()` es ahora la config única: el root logger escribe a stdout + `logs/app.log` (RotatingFileHandler, nivel desde `LOG_LEVEL`) → app/IA/Litestar se persisten. El logger `rate_limit` mantiene `logs/rate_limit.log` con `propagate=False` (aislado de app.log). `basicConfig` eliminado de `main.py` (y su doble-stdout). Verificado.
- **L3 [BAJA]** ✅ **CORREGIDO (2026-06-24)** — `ia/middleware.py` loggea "Chat permitido" en INFO (antes DEBUG) → tráfico normal de chat visible en el archivo de auditoría. Telemetría (IP + contador), no contenido sensible.
- **L4 [BAJA]** abierto — sin correlation/request ID; no se puede vincular un bloqueo del middleware con su request (A9).
- **L5 [BAJA]** abierto — logs en texto libre, no estructurado.
- **L6 [BAJA]** ✅ **CORREGIDO (2026-06-24)** — añadido el patrón explícito `logs/` a `backend/.gitignore` (cubre backups rotados `app.log.1` etc. que no matchean `*.log`). Verificado con `git check-ignore`.
- **L7 [BAJA→CRÍTICA en prod]** ✅ **CORREGIDO (2026-06-23)** — default `LOG_LEVEL="INFO"`. **Hallazgo clave durante el fix:** el contenido sensible (pregunta de usuario, MQL generada, payload completo de Mongo, respuesta del LLM, nombres de cepa) estaba en `logger.info`, **no** en DEBUG → bajar el default a INFO no bastaba. Se bajaron esas líneas a `logger.debug` en `llm_service.py`, `ia/router.py` y `dbSearch_service.py`; INFO conserva solo telemetría no sensible. `main.py` endurecido (`.upper()` + fallback a INFO). Verificado de punta a punta.

---

## Cola de prioridad — Top 10 (riesgo × esfuerzo)

1. ~~**S16 — Bypass del rate limit del chat por XFF**~~ ✅ **CORREGIDO (2026-06-23).** `trusted_proxies` aplicado a `ChatRateLimitMiddleware` replicando el patrón de S6.
2. ~~**B20 — `encode()` bloqueante en create/update async**~~ ✅ **CORREGIDO (2026-06-23).** Ambas llamadas envueltas en `asyncio.to_thread`.
3. ~~**S17 — Dump MQL a disco sin gatear**~~ ✅ **CORREGIDO (2026-06-23).** Gateo interno en `_dump_mql`/`_dump_request`; a prueba de call sites futuros.
4. ~~**B24 — Fallback del `except` lanza TypeError**~~ ✅ **CORREGIDO (2026-06-23).** Fallback a `get_todas_las_cepas()`.
5. ~~**B21 — Renombrar cepa → 500**~~ ✅ **CORREGIDO (2026-06-23).** Check de unicidad en `update()` + mapeo a 409 en el controller.
6. ~~**S18 — Mass-assignment de `add_attribute` sobre campos reservados**~~ ✅ **CORREGIDO (2026-06-23).** `RESERVED_FIELDS` + rechazo en `add_attribute` y stripeo en DTOs/`create`.
7. ~~**F1 — Rutas de admin sin guard en la UI**~~ ✅ **CORREGIDO (2026-06-23).** Componente `AdminRoute` (guard de rol) envolviendo las 4 rutas admin.
8. ~~**B23 + P13 — Sin paginación real**~~ B23 ✅ **CORREGIDO (2026-06-23)** (offset/limit opt-in en el repo). P13 ⊘ **DESCARTADO**: no aplica a 50 filas + dashboard de dataset compartido; reabrir solo si crece a miles.
9. ~~**L1 — Sin logging de login**~~ ✅ **CORREGIDO (2026-06-23).** Login OK/FALLIDO con username+IP al logger `rate_limit`.
10. ~~**A11 — Path de auth global-axios muerto**~~ ✅ **CORREGIDO (2026-06-23).** `authSession.ts` borrado + path global eliminado de `AuthContext`; interceptor de `api` como única fuente de verdad.

---

*Auditoría de solo lectura. No se modificó código de la aplicación. Hallazgos volcados a `CLAUDE.md` (tablas S16–S21, B20–B25, P11–P14, A11–A14, sección Frontend F1–F5, L7).*
