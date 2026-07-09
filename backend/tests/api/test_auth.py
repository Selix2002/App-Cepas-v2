"""Tests de POST /auth/login: credenciales válidas/inválidas y rate-limit por IP.

Cada test de este módulo flushea la DB de Redis de test (15) antes Y después de
correr, para no compartir el bucket de rate-limit con `admin_token` (sesión) ni con
otros tests de este mismo módulo — ver `flush_login_rate_limit` en conftest.py.
"""

import bcrypt
import pytest

from app.core.config import settings
from .conftest import flush_login_rate_limit

USERNAME = "login_test_user"
PASSWORD = "CorrectHorse123!"


@pytest.fixture(autouse=True)
def _isolated_rate_limit():
    flush_login_rate_limit()
    yield
    flush_login_rate_limit()


@pytest.fixture
def seeded_user(mongo_client):
    db = mongo_client[settings.db_name]
    hashed = bcrypt.hashpw(PASSWORD.encode(), bcrypt.gensalt()).decode()
    db["users"].insert_one(
        {
            "username": USERNAME,
            "password": hashed,
            "is_admin": False,
            "hidden_columns": [],
        }
    )
    yield
    db["users"].delete_one({"username": USERNAME})


def test_login_success_returns_jwt(test_client, seeded_user):
    resp = test_client.post(
        "/auth/login",
        data={"username": USERNAME, "password": PASSWORD},
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["token_type"] == "bearer"
    assert isinstance(body["access_token"], str) and body["access_token"]


def test_login_wrong_password_is_unauthorized(test_client, seeded_user):
    resp = test_client.post(
        "/auth/login",
        data={"username": USERNAME, "password": "not-the-password"},
    )
    assert resp.status_code == 401
    # L1: fallo genérico — no debe distinguir "usuario inexistente" de "password incorrecta"
    assert resp.json()["detail"] == "Usuario o contraseña incorrectos"


def test_login_unknown_user_is_unauthorized(test_client):
    resp = test_client.post(
        "/auth/login",
        data={"username": "no-existe-este-usuario", "password": "cualquiera"},
    )
    assert resp.status_code == 401
    assert resp.json()["detail"] == "Usuario o contraseña incorrectos"


def test_login_rate_limited_by_ip_after_max_requests(test_client, seeded_user):
    # max_requests=5 por 60s (main.py) — los primeros 5 pueden fallar o pasar,
    # el 6to SIEMPRE debe ser 429 sin importar las credenciales.
    for _ in range(5):
        test_client.post(
            "/auth/login",
            data={"username": USERNAME, "password": "wrong-on-purpose"},
        )

    resp = test_client.post(
        "/auth/login",
        data={"username": USERNAME, "password": "wrong-on-purpose"},
    )
    assert resp.status_code == 429
    assert "Retry-After" in resp.headers
    assert resp.json()["detail"] == "Demasiados intentos de login. Inténtalo de nuevo más tarde."
