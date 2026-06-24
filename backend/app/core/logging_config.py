import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path

from app.core.config import settings


def setup_logging() -> logging.Logger:
    """Configuración única de logging de la app (L2/L3).

    - Root logger: stdout + ``logs/app.log`` (todo: app, IA, repos, Litestar),
      con nivel tomado de ``settings.LOG_LEVEL`` → traza persistente de errores en prod.
    - Logger ``rate_limit``: archivo dedicado ``logs/rate_limit.log`` + stdout, con
      ``propagate=False`` → la traza de seguridad/auditoría queda **separada** de app.log.

    Idempotente (limpia handlers) para no duplicar salida con ``uvicorn --reload``.
    """
    Path("logs").mkdir(exist_ok=True)

    level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)
    fmt = logging.Formatter(
        "%(asctime)s - [%(levelname)s] - %(name)s - %(funcName)s - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    # ── Root: stdout + archivo unificado (L2) ─────────────────────────────
    root = logging.getLogger()
    root.setLevel(level)
    root.handlers.clear()

    stream = logging.StreamHandler()
    stream.setFormatter(fmt)
    root.addHandler(stream)

    app_file = RotatingFileHandler(
        "logs/app.log", maxBytes=2_000_000, backupCount=5, encoding="utf-8"
    )
    app_file.setFormatter(fmt)
    root.addHandler(app_file)

    # Reducir ruido de librerías externas
    for noisy in ("httpx", "httpcore", "sentence_transformers"):
        logging.getLogger(noisy).setLevel(logging.WARNING)

    # ── Auditoría de seguridad: archivo dedicado, aislado de app.log ──────
    rate_logger = logging.getLogger("rate_limit")
    rate_logger.setLevel(logging.INFO)
    rate_logger.handlers.clear()
    rate_logger.propagate = False  # NO cae en app.log; traza de seguridad separada

    rate_file = RotatingFileHandler(
        "logs/rate_limit.log", maxBytes=1_000_000, backupCount=5, encoding="utf-8"
    )
    rate_file.setFormatter(fmt)
    rate_logger.addHandler(rate_file)

    # propagate=False → necesita su propio handler de stdout para seguir visible en consola
    rate_stream = logging.StreamHandler()
    rate_stream.setFormatter(fmt)
    rate_logger.addHandler(rate_stream)

    return rate_logger
