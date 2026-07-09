"""Tests de POST /cepas/import: CSV y XLSX, duplicados, validación de archivo."""

import io

import openpyxl


def _upload(test_client, auth_headers, filename: str, content: bytes, content_type: str):
    return test_client.post(
        "/cepas/import",
        headers=auth_headers,
        files={"data": (filename, content, content_type)},
    )


def _xlsx_bytes(rows: list[list[str]]) -> bytes:
    wb = openpyxl.Workbook()
    ws = wb.active
    for row in rows:
        ws.append(row)
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


# ---------------------------------------------------------------------------
# CSV
# ---------------------------------------------------------------------------

def test_import_csv_happy_path_creates_rows(test_client, auth_headers):
    csv_content = (
        "cepa,origen,gram\n"
        "Import Uno,Lago Pehoe,+\n"
        "Import Dos,,-\n"
    ).encode("utf-8")

    resp = _upload(test_client, auth_headers, "cepas.csv", csv_content, "text/csv")
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["created"] == 2
    assert body["skipped"] == 0
    assert body["errors"] == 0

    listado = test_client.get("/cepas/", headers=auth_headers).json()
    assert listado["total"] == 2
    nombres = {c["cepa"] for c in listado["items"]}
    assert nombres == {"Import Uno", "Import Dos"}


def test_import_csv_existing_cepa_is_reported_as_duplicate(test_client, auth_headers):
    test_client.post("/cepas/", json={"cepa": "Ya En Bd"}, headers=auth_headers)

    csv_content = (
        "cepa\n"
        "Ya En Bd\n"
        "Nueva Cepa\n"
    ).encode("utf-8")
    resp = _upload(test_client, auth_headers, "cepas.csv", csv_content, "text/csv")
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["created"] == 1
    assert body["skipped"] == 1
    assert body["errors"] == 0
    statuses = {r["cepa"]: r["status"] for r in body["rows"]}
    assert statuses["Ya En Bd"] == "duplicate"
    assert statuses["Nueva Cepa"] == "created"


def test_import_csv_duplicate_names_within_file_is_rejected(test_client, auth_headers):
    csv_content = (
        "cepa\n"
        "Repetida\n"
        "Repetida\n"
    ).encode("utf-8")
    resp = _upload(test_client, auth_headers, "cepas.csv", csv_content, "text/csv")
    assert resp.status_code == 400
    assert "Repetida" in resp.json()["detail"]


def test_import_empty_file_is_rejected(test_client, auth_headers):
    csv_content = "cepa,origen\n".encode("utf-8")
    resp = _upload(test_client, auth_headers, "cepas.csv", csv_content, "text/csv")
    assert resp.status_code == 400


def test_import_renamed_excel_as_csv_is_rejected(test_client, auth_headers):
    # Magic bytes de un .xlsx real, subido con extensión .csv
    fake = _xlsx_bytes([["cepa"], ["No importa"]])
    resp = _upload(test_client, auth_headers, "cepas.csv", fake, "text/csv")
    assert resp.status_code == 400
    assert "Excel" in resp.json()["detail"]


# ---------------------------------------------------------------------------
# XLSX
# ---------------------------------------------------------------------------

def test_import_xlsx_happy_path_creates_rows(test_client, auth_headers):
    content = _xlsx_bytes(
        [
            ["cepa", "origen"],
            ["Xlsx Uno", "Lago Grey"],
            ["Xlsx Dos", ""],
        ]
    )
    resp = _upload(
        test_client,
        auth_headers,
        "cepas.xlsx",
        content,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["created"] == 2
    assert body["errors"] == 0


def test_import_fake_xlsx_bad_magic_bytes_is_rejected(test_client, auth_headers):
    resp = _upload(test_client, auth_headers, "cepas.xlsx", b"esto no es un excel", "text/plain")
    assert resp.status_code == 400
    assert "Excel" in resp.json()["detail"]
