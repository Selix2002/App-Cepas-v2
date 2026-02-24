# backend/app/core/redis_config.py
from __future__ import annotations

import redis.asyncio as redis  # cliente async
from typing import Optional

from app.core.config import settings  # asumimos que tienes settings


def get_redis_url() -> str:
    # Puedes tenerlo en tu .env como REDIS_URL=redis://localhost:6379/0
    url = getattr(settings, "redis_url", None)
    if url:
        return url
    # fallback razonable en local
    return "redis://localhost:6379/0"


# Cliente Redis global para toda la app
redis_client: redis.Redis = redis.from_url(
    get_redis_url(),
    encoding="utf-8",
    decode_responses=True,
)
