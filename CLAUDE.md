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
