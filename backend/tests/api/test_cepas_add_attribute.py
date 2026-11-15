"""Tests de POST /cepas/add-attribute: asignación masiva de un campo dinámico."""


def _create_cepa(test_client, auth_headers, cepa: str):
    return test_client.post("/cepas/", json={"cepa": cepa}, headers=auth_headers).json()


def test_add_attribute_updates_existing_cepas(test_client, auth_headers):
    _create_cepa(test_client, auth_headers, "Cepa A")
    _create_cepa(test_client, auth_headers, "Cepa B")

    resp = test_client.post(
        "/cepas/add-attribute",
        json={
            "attribute_name": "resistencia",
            "values": {"Cepa A": "alta", "Cepa B": "baja"},
        },
        headers=auth_headers,
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["updated"] == 2
    assert body["not_found"] == []

    check = test_client.get("/cepas/", headers=auth_headers).json()
    valores = {c["cepa"]: c["resistencia"] for c in check["items"]}
    assert valores == {"Cepa A": "alta", "Cepa B": "baja"}


def test_add_attribute_reports_unknown_cepas(test_client, auth_headers):
    _create_cepa(test_client, auth_headers, "Cepa Real")

    resp = test_client.post(
        "/cepas/add-attribute",
        json={
            "attribute_name": "resistencia",
            "values": {"Cepa Real": "alta", "Cepa Fantasma": "media"},
        },
        headers=auth_headers,
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["updated"] == 1
    assert body["not_found"] == ["Cepa Fantasma"]


def test_add_attribute_rejects_reserved_field(test_client, auth_headers):
    resp = test_client.post(
        "/cepas/add-attribute",
        json={"attribute_name": "embedding", "values": {}},
        headers=auth_headers,
    )
    assert resp.status_code == 400


def test_add_attribute_rejects_structured_field(test_client, auth_headers):
    # 'cepa' tiene su propio path de PATCH — no debe modificarse por este endpoint (S18)
    resp = test_client.post(
        "/cepas/add-attribute",
        json={"attribute_name": "cepa", "values": {}},
        headers=auth_headers,
    )
    assert resp.status_code == 400


def test_add_attribute_rejects_name_without_letters_or_digits(test_client, auth_headers):
    resp = test_client.post(
        "/cepas/add-attribute",
        json={"attribute_name": "¿?!", "values": {}},
        headers=auth_headers,
    )
    assert resp.status_code == 400


def test_add_attribute_accepts_free_text_name_and_stores_label(test_client, auth_headers):
    _create_cepa(test_client, auth_headers, "Cepa A")

    resp = test_client.post(
        "/cepas/add-attribute",
        json={"attribute_name": "pH óptimo", "values": {"Cepa A": "7"}},
        headers=auth_headers,
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["field"] == "ph_optimo"
    assert body["label"] == "pH óptimo"

    check = test_client.get("/cepas/", headers=auth_headers).json()
    assert check["items"][0]["ph_optimo"] == "7"
    labels = test_client.get("/cepas/labels", headers=auth_headers).json()
    assert labels["ph_optimo"] == "pH óptimo"


def test_add_attribute_rejects_existing_attribute(test_client, auth_headers):
    _create_cepa(test_client, auth_headers, "Cepa A")
    test_client.post(
        "/cepas/add-attribute",
        json={"attribute_name": "gram", "values": {"Cepa A": "+"}},
        headers=auth_headers,
    )

    # Mismo atributo con otra capitalización → misma clave "gram" → no debe sobrescribir
    resp = test_client.post(
        "/cepas/add-attribute",
        json={"attribute_name": "Gram", "values": {"Cepa A": None}},
        headers=auth_headers,
    )
    assert resp.status_code == 409, resp.text

    check = test_client.get("/cepas/", headers=auth_headers).json()
    assert check["items"][0]["gram"] == "+"


def test_add_attribute_requires_admin(test_client, non_admin_headers):
    resp = test_client.post(
        "/cepas/add-attribute",
        json={"attribute_name": "resistencia", "values": {}},
        headers=non_admin_headers,
    )
    assert resp.status_code == 403
