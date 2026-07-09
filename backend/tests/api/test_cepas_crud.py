"""Tests de CRUD de /cepas: create, get, list, update, delete."""


def _create_cepa(test_client, auth_headers, **overrides):
    payload = {"cepa": "Cepa Test 1", "latitud": -41.5, "longitud": -72.9}
    payload.update(overrides)
    return test_client.post("/cepas/", json=payload, headers=auth_headers)


# ---------------------------------------------------------------------------
# CREATE
# ---------------------------------------------------------------------------

def test_create_cepa_requires_auth(test_client):
    resp = test_client.post("/cepas/", json={"cepa": "Sin Auth"})
    assert resp.status_code == 401


def test_create_cepa_requires_admin(test_client, non_admin_headers):
    resp = test_client.post("/cepas/", json={"cepa": "No Admin"}, headers=non_admin_headers)
    assert resp.status_code == 401
    assert resp.json()["detail"] == "Se requiere rol de administrador"


def test_create_cepa_success(test_client, auth_headers):
    resp = _create_cepa(test_client, auth_headers, cepa="Cepa Alpha")
    assert resp.status_code == 201
    body = resp.json()
    assert body["cepa"] == "Cepa Alpha"
    assert body["latitud"] == -41.5
    assert body["id"]


def test_create_cepa_duplicate_name_is_conflict(test_client, auth_headers):
    _create_cepa(test_client, auth_headers, cepa="Cepa Duplicada")
    resp = _create_cepa(test_client, auth_headers, cepa="Cepa Duplicada")
    assert resp.status_code == 409


def test_create_cepa_invalid_latitude_is_rejected(test_client, auth_headers):
    resp = _create_cepa(test_client, auth_headers, cepa="Cepa Mala Lat", latitud=999)
    assert resp.status_code == 400


# ---------------------------------------------------------------------------
# GET BY ID
# ---------------------------------------------------------------------------

def test_get_cepa_by_id(test_client, auth_headers):
    created = _create_cepa(test_client, auth_headers, cepa="Cepa Get").json()
    resp = test_client.get(f"/cepas/{created['id']}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["cepa"] == "Cepa Get"


def test_get_cepa_not_found(test_client, auth_headers):
    resp = test_client.get("/cepas/000000000000000000000000", headers=auth_headers)
    assert resp.status_code == 404


def test_get_cepa_invalid_id(test_client, auth_headers):
    resp = test_client.get("/cepas/not-a-valid-object-id", headers=auth_headers)
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# LIST
# ---------------------------------------------------------------------------

def test_list_cepas_empty(test_client, auth_headers):
    resp = test_client.get("/cepas/", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json() == {"total": 0, "items": []}


def test_list_cepas_filter_and_pagination(test_client, auth_headers):
    for name in ["Alpha Uno", "Alpha Dos", "Beta Uno"]:
        _create_cepa(test_client, auth_headers, cepa=name)

    resp = test_client.get("/cepas/", params={"cepa": "alpha"}, headers=auth_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 2
    assert {i["cepa"] for i in body["items"]} == {"Alpha Uno", "Alpha Dos"}

    resp = test_client.get("/cepas/", params={"limit": 1, "offset": 0}, headers=auth_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 3
    assert len(body["items"]) == 1


# ---------------------------------------------------------------------------
# UPDATE
# ---------------------------------------------------------------------------

def test_update_cepa_rename(test_client, auth_headers):
    created = _create_cepa(test_client, auth_headers, cepa="Antes").json()
    resp = test_client.patch(
        f"/cepas/{created['id']}", json={"cepa": "Despues"}, headers=auth_headers
    )
    assert resp.status_code == 200
    assert resp.json()["cepa"] == "Despues"


def test_update_cepa_rename_to_existing_name_is_conflict(test_client, auth_headers):
    _create_cepa(test_client, auth_headers, cepa="Ya Existe")
    other = _create_cepa(test_client, auth_headers, cepa="Para Renombrar").json()
    resp = test_client.patch(
        f"/cepas/{other['id']}", json={"cepa": "Ya Existe"}, headers=auth_headers
    )
    assert resp.status_code == 409


def test_update_cepa_null_name_is_rejected(test_client, auth_headers):
    # B4: PATCH {"cepa": null} rompía el índice único antes del fix — debe rechazarse.
    created = _create_cepa(test_client, auth_headers, cepa="No Debe Perder Nombre").json()
    resp = test_client.patch(
        f"/cepas/{created['id']}", json={"cepa": None}, headers=auth_headers
    )
    assert resp.status_code == 400

    check = test_client.get(f"/cepas/{created['id']}", headers=auth_headers)
    assert check.json()["cepa"] == "No Debe Perder Nombre"


def test_update_cepa_partial_patch_keeps_other_fields(test_client, auth_headers):
    created = _create_cepa(
        test_client, auth_headers, cepa="Cepa Parcial", latitud=-41.0, longitud=-72.0
    ).json()
    resp = test_client.patch(
        f"/cepas/{created['id']}", json={"longitud": -73.5}, headers=auth_headers
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["cepa"] == "Cepa Parcial"
    assert body["latitud"] == -41.0
    assert body["longitud"] == -73.5


def test_update_cepa_not_found(test_client, auth_headers):
    resp = test_client.patch(
        "/cepas/000000000000000000000000", json={"cepa": "x"}, headers=auth_headers
    )
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# DELETE
# ---------------------------------------------------------------------------

def test_delete_cepa(test_client, auth_headers):
    created = _create_cepa(test_client, auth_headers, cepa="Para Borrar").json()
    resp = test_client.delete(f"/cepas/{created['id']}", headers=auth_headers)
    assert resp.status_code == 204

    check = test_client.get(f"/cepas/{created['id']}", headers=auth_headers)
    assert check.status_code == 404


def test_delete_cepa_not_found(test_client, auth_headers):
    resp = test_client.delete("/cepas/000000000000000000000000", headers=auth_headers)
    assert resp.status_code == 404
