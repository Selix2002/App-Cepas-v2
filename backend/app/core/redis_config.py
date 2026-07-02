# backend/app/core/redis_config.py
from __future__ import annotations

import redis.asyncio as redis  # cliente async

from app.core.config import settings

# Cliente Redis global para toda la app — REDIS_URL en .env (soporta rediss:// TLS)
redis_client: redis.Redis = redis.from_url(
    settings.redis_url,
    encoding="utf-8",
    decode_responses=True,
)
