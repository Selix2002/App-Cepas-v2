FROM python:3.13-slim

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# Instala dependencias primero para aprovechar la cache de capas de Docker
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

COPY . .
RUN uv sync --frozen --no-dev

EXPOSE 8000

# Forma shell (no exec-array) para que $PORT se expanda — Render lo inyecta en runtime.
CMD uv run uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
