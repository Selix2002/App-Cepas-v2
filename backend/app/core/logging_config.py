import logging
from logging.handlers import RotatingFileHandler

def setup_logging():
    """
    Configura logging global para la aplicación.
    Genera archivos con rotación y logs con timestamp.
    """
    logger = logging.getLogger("rate_limit")
    logger.setLevel(logging.INFO)

    # Handler para archivo con rotación (5 archivos de 1MB)
    handler = RotatingFileHandler(
        "logs/rate_limit.log",
        maxBytes=1_000_000,   # 1MB
        backupCount=5         # 5 archivos antiguos
    )

    formatter = logging.Formatter(
        "%(asctime)s - [%(levelname)s] - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)

    stream = logging.StreamHandler()
    stream.setFormatter(formatter)
    logger.addHandler(stream)

    return logger
