"""Fixtures comunes para los tests de auth + cepas (backend/tests/api/)."""

import os

# Deben setearse ANTES de importar cualquier módulo de `app.*`: pydantic-settings
# prioriza variables de entorno sobre el .env de dev, así los tests nunca dependen de
# (ni tocan) cepas_db/Cohere real sin importar qué haya en backend/.env.
os.environ["DB_NAME"] = "cepas_test"
os.environ["IA_ENABLED"] = "false"
os.environ["REDIS_URL"] = "redis://localhost:6379/15"
os.environ.setdefault("SECRET_KEY", "test-secret-key-only-for-pytest-not-for-prod-use")
os.environ["DEBUG"] = "false"

import bcrypt
import pymongo
import pytest
import redis as redis_sync
from litestar.testing import TestClient

from app.core.config import settings
from app.main import app


# ---------------------------------------------------------------------------
# Mongo — DB real y separada (cepas_test), nunca cepas_db
# ---------------------------------------------------------------------------

@pytest.fixture(scope="session")
def mongo_client():
    client = pymongo.MongoClient(settings.mongodb_uri)
    yield client
    client.drop_database(settings.db_name)
    client.close()


@pytest.fixture(autouse=True)
def clean_db(mongo_client):
    """Limpia cepas/column_labels después de cada test. `users` se preserva a
    propósito — ahí vive el admin sembrado una sola vez por sesión (ver `admin_token`)."""
    yield
    db = mongo_client[settings.db_name]
    db["cepas"].delete_many({})
    db["column_labels"].delete_many({})


# ---------------------------------------------------------------------------
# Embeddings — stub sin red. CepaRepository.create()/import intentan generar un
# embedding SIEMPRE (no dependen de IA_ENABLED, solo el except absorbe el fallo);
# sin este stub los tests llamarían a la Cohere API real del .env de dev.
# ---------------------------------------------------------------------------

class _StubEmbeddingService:
    def encode(self, text: str, input_type: str = "search_query") -> list[float]:
        return [0.1, 0.2, 0.3]

    def encode_batch(
        self, texts: list[str], input_type: str = "search_document"
    ) -> list[list[float]]:
        return [[0.1, 0.2, 0.3] for _ in texts]


@pytest.fixture(autouse=True)
def stub_embeddings(monkeypatch):
    import app.ia.services.chat.embedding_service as embedding_service_module

    stub = _StubEmbeddingService()
    monkeypatch.setattr(embedding_service_module, "get_embedding_service", lambda: stub)


# ---------------------------------------------------------------------------
# App / cliente HTTP — un solo TestClient por sesión: su blocking_portal corre el
# lifespan (on_startup=init_db) y cada request en el MISMO event loop, que es lo
# que necesita Motor para no romper con "attached to a different loop".
# ---------------------------------------------------------------------------

@pytest.fixture(scope="session")
def test_client():
    with TestClient(app=app) as client:
        yield client


# ---------------------------------------------------------------------------
# Auth — admin sembrado directo en Mongo (los endpoints de /users son admin_guard,
# no hay forma de crear el primer usuario vía API; mismo patrón que scripts/seed_admin.py).
# ---------------------------------------------------------------------------

ADMIN_USERNAME = "test_admin"
ADMIN_PASSWORD = "TestPassw0rd!"


@pytest.fixture(scope="session")
def admin_token(mongo_client, test_client):
    """Login UNA sola vez por sesión y se reutiliza el JWT en todos los tests de
    cepas — evita acercarse al rate-limit de login (5/60s por IP), que además
    comparte bucket entre TODAS las requests de TestClient (ver test_auth.py)."""
    db = mongo_client[settings.db_name]
    hashed = bcrypt.hashpw(ADMIN_PASSWORD.encode(), bcrypt.gensalt()).decode()
    db["users"].insert_one(
        {
            "username": ADMIN_USERNAME,
            "password": hashed,
            "is_admin": True,
            "hidden_columns": [],
        }
    )

    resp = test_client.post(
        "/auth/login",
        data={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD},
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["access_token"]


@pytest.fixture
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


NON_ADMIN_USERNAME = "test_user"
NON_ADMIN_PASSWORD = "TestPassw0rd!"


@pytest.fixture(scope="session")
def non_admin_token(mongo_client, test_client):
    """Usuario autenticado pero sin is_admin — para probar que admin_guard rechaza
    incluso a usuarios válidos. Login único por sesión, mismo motivo que admin_token."""
    db = mongo_client[settings.db_name]
    hashed = bcrypt.hashpw(NON_ADMIN_PASSWORD.encode(), bcrypt.gensalt()).decode()
    db["users"].insert_one(
        {
            "username": NON_ADMIN_USERNAME,
            "password": hashed,
            "is_admin": False,
            "hidden_columns": [],
        }
    )

    resp = test_client.post(
        "/auth/login",
        data={"username": NON_ADMIN_USERNAME, "password": NON_ADMIN_PASSWORD},
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["access_token"]


@pytest.fixture
def non_admin_headers(non_admin_token):
    return {"Authorization": f"Bearer {non_admin_token}"}


# ---------------------------------------------------------------------------
# Rate limit de login — usado explícitamente por test_auth.py
# ---------------------------------------------------------------------------

def flush_login_rate_limit() -> None:
    """Limpia la DB de Redis de test (15) para aislar los tests de rate-limit del
    resto de la suite. Todas las requests de TestClient comparten la misma IP lógica
    (`scope["client"] == ("testclient", 50000)`, ver litestar/testing/transport.py),
    así que sin este flush un test de rate-limit podría bloquear (o verse afectado
    por) logins de otros tests, sin importar el orden de ejecución."""
    redis_sync.Redis.from_url(settings.redis_url).flushdb()
