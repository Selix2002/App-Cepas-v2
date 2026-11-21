# CEPADB — Gestión de cepas bacterianas de la Patagonia

Aplicación web para gestionar y explorar la colección de cepas bacterianas aisladas de
cuerpos de agua de la Patagonia: tabla con filtros, gráficos, mapa de recolección,
importación y exportación de planillas, y un asistente de IA que responde preguntas en
lenguaje natural sobre la colección.

En producción en <https://microlabcepas.ulagos.cl>.

## Stack

- **Backend** (`backend/`): Python 3.13, Litestar, MongoDB (Beanie/Motor), Redis, JWT.
  IA opcional con Groq (LLM) y Cohere (embeddings).
- **Frontend** (`frontend/`): React 19, TypeScript, Vite 6, Leaflet, Nivo.

## Inicio rápido

Requisitos: [uv](https://docs.astral.sh/uv/), Node.js 20+, MongoDB y Redis corriendo en
local.

```bash
# Backend
cd backend
uv sync
cp .env.example .env        # completar SECRET_KEY como mínimo
uv run python -m scripts.seed_admin --username admin --password <contraseña>
uv run uvicorn app.main:app --reload          # http://localhost:8000

# Frontend (otra terminal)
cd frontend
npm install
npm run dev                                   # http://localhost:5173
```

Con [just](https://github.com/casey/just): `just backend`, `just frontend` o `just dev`.

## Documentación

Toda la documentación técnica está en **[`docs/tecnico/`](docs/tecnico/README.md)**:
arquitectura, desarrollo local, producción, operación (despliegue, respaldos, logs),
configuración, problemas conocidos y pendientes.
